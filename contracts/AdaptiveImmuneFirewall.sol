// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./interfaces/IIntuitionMultiVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AdaptiveImmuneFirewall
/// @notice Production-grade immune system that classifies addresses using community "conviction" staked on Intuition triples.
/// @dev Key ideas:
///      - Risk is expressed as an Intuition triple: [address] -> [is] -> [Malicious] (or similar).
///      - Conviction = TRUST staked on that triple's vaultId ("assets" in IEthMultiVault).
///      - Counter-triple (type(uint256).max - tripleId) represents defense; its conviction subtracts from the risk.
///      - Multi-tier thresholds map net conviction to SAFE/WATCH/BLOCKED for flexible gating.
contract AdaptiveImmuneFirewall is Ownable, Pausable {
    IEthMultiVault public intuitionVault;

    /// @notice Net conviction needed to enter the WATCH state.
    /// @dev Hardcoded test default; can be changed later by owner via setThresholds.
    uint256 public WARN_STAKE_THRESHOLD = 0.0001 ether; // 0.0001 TRUST

    /// @notice Net conviction needed to enter the BLOCKED state.
    /// @dev Must always be strictly greater than WARN_STAKE_THRESHOLD.
    uint256 public BLOCK_STAKE_THRESHOLD = 0.001 ether; // 0.001 TRUST
    /// @notice Minimum conviction (assets staked) required for a new threat registration to be accepted.
    /// @dev Acts as Sybil/spam resistance: weak tags (< threshold) cannot overwrite or create entries.
    /// @notice Minimum conviction required on a triple to be accepted during registration.
    /// @dev This provides Sybil/spam resistance; weak/empty triples cannot be registered or used to overwrite stronger ones.
    uint256 public minRegistrationAssets = 0.00001 ether; // Triple must have >= 0.00001 TRUST conviction

    struct ThreatInfo {
        uint256 tripleId;
        uint256 registeredAt;
        address registrar;
        // Economic layer
        uint256 bond; // Native token bond posted by registrar
        uint256 challengeDeadline; // Deadline until which the challenge is allowed (0 means none/open)
        address challenger; // Challenger address (if any)
        uint256 counterTripleId; // Challenger's counter triple (expected to be maxUint - tripleId)
        uint256 challengerBond; // Native token bond posted by challenger
        // TWAP snapshots
        uint256 assetsStart; // triple assets at registration time
        uint256 counterAssetsStart; // counter-triple assets at registration time
    }
    mapping(address => ThreatInfo) public threats;

    enum RiskStatus { UNREGISTERED_SAFE, SAFE, WATCH, BLOCKED }

    event ThreatRegistered(address indexed suspect, uint256 indexed tripleId, address indexed registrar, uint256 timestamp);
    event ThresholdsEvaluated(address indexed target, uint256 tripleId, uint256 assets, RiskStatus status);
    event ThresholdsUpdated(uint256 newWarn, uint256 newBlock);
    event EmergencyPaused(address admin);
    event EmergencyUnpaused(address admin);
    // Economic-layer events
    event ThreatChallenged(address indexed suspect, address indexed challenger, uint256 indexed counterTripleId, uint256 bond, uint256 deadline);
    event ThreatResolved(address indexed suspect, bool confirmed, uint256 winnerPayout, uint256 treasuryCut);
    event ChallengeWindowExtended(address indexed suspect, uint256 oldDeadline, uint256 newDeadline, uint256 netStart, uint256 netEnd);

    error InvalidThresholds();
    error ZeroAddress();
    error ZeroTripleId();
    error NotATriple(uint256 vaultId);
    error WeakSignal(); // New triple doesn't meet minimum conviction
    error DowngradeAttempt(); // Attempt to overwrite a stronger existing tag with a weaker one
    error InvalidMinRegistrationAssets();
    // Economic-layer errors
    error BondTooLow();
    error DisputeActive();
    error NoActiveRegistration();
    error NoChallengeWindow();
    error ChallengeWindowOver();
    error ChallengeExists();
    error ChallengeBondTooLow();
    error NotCounterTriple();
    error ResolveDeferred();

    /**
     * @notice Initializes the firewall with the Intuition MultiVault address.
     * @param _intuitionVault Address of Intuition's MultiVault contract used to read conviction for triples.
     * @dev Thresholds (WARN/BLOCK) are set to hardcoded test defaults and can be updated via setThresholds.
     */
    constructor(address _intuitionVault) Ownable(msg.sender) {
        if (_intuitionVault == address(0)) revert ZeroAddress();
        intuitionVault = IEthMultiVault(_intuitionVault);
    }

    // --------------------
    // Economic parameters
    // --------------------
    address public treasury = owner();
    uint256 public minBond = 0.0001 ether; // Native currency bond to register a threat
    uint256 public challengeWindow = 1 days; // How long a registration can be challenged
    uint256 public challengeBondMultiplierBp = 15000; // 1.5x of registrar bond required to challenge
    uint256 public winnerRewardBp = 9000; // Winner gets 90% of the loser's bond; 10% to treasury
    // Volatility/TWAP guards
    bool public volatilityExtensionEnabled = true;
    uint256 public volatilityThresholdBp = 3000; // 30% change across window triggers extension
    uint256 public volatilityExtension = 30 minutes; // extend window by this duration
    // Testing/debug mode
    bool public requireCounterTripleExists = true; // Set to false for testing without real counter-triples

    /**
     * @notice Registers or updates a malicious-risk triple for a suspect address.
     * @dev Validation + anti-spam/anti-downgrade rules:
     *      1) _tripleId must be a valid Intuition triple (not an atom) — checked via isTripleId.
     *      2) The triple must meet minRegistrationAssets (TRUST) to be considered a strong enough signal.
     *      3) If the suspect is already tagged, the new triple can only overwrite if it has strictly higher conviction
     *         than the currently registered one (prevents malicious downgrades with weaker claims).
     * @param _suspect Address being tagged as risky/malicious.
     * @param _tripleId Intuition triple ID (vaultId) representing the risk claim.
     * @custom:event Emits ThreatRegistered on success for off-chain indexing.
     */
    function registerThreat(address _suspect, uint256 _tripleId) external payable whenNotPaused {
        if (_suspect == address(0)) revert ZeroAddress();
        if (_tripleId == 0) revert ZeroTripleId();
        // Validate that _tripleId is actually a triple (not an atom)
        if (!intuitionVault.isTriple(bytes32(_tripleId))) revert NotATriple(_tripleId);
        // Economic layer: ensure sufficient bond
        if (msg.value < minBond) revert BondTooLow();

        // 1. Validate minimum conviction on the proposed triple
            (uint256 newAssets, ) = intuitionVault.getVault(bytes32(_tripleId), 0);
        
        if (minRegistrationAssets > 1 && newAssets < minRegistrationAssets) revert WeakSignal();

        // 2. Overwrite protection: only stronger conviction can replace an existing tag
        ThreatInfo memory current = threats[_suspect];
        if (current.tripleId != 0) {
            // Prevent updates while a dispute is active
            if (current.challengeDeadline != 0 && block.timestamp <= current.challengeDeadline) revert DisputeActive();
                (uint256 currentAssets, ) = intuitionVault.getVault(bytes32(current.tripleId), 0);
            if (currentAssets > newAssets) revert DowngradeAttempt();
        }

        // Initialize registration and open challenge window (with TWAP snapshots)
        uint256 counterId = type(uint256).max - _tripleId;
        (uint256 assetsStart, ) = intuitionVault.getVault(bytes32(_tripleId), 0);
        (uint256 counterStart, ) = intuitionVault.getVault(bytes32(counterId), 0);
        threats[_suspect] = ThreatInfo({
            tripleId: _tripleId,
            registeredAt: block.timestamp,
            registrar: msg.sender,
            bond: msg.value,
            challengeDeadline: block.timestamp + challengeWindow,
            challenger: address(0),
            counterTripleId: 0,
            challengerBond: 0,
            assetsStart: assetsStart,
            counterAssetsStart: counterStart
        });
        emit ThreatRegistered(_suspect, _tripleId, msg.sender, block.timestamp);
    }

    /**
     * @notice Challenge a registered threat within its challenge window by posting a higher bond and a counter-triple.
     * @param _suspect Address whose threat registration is being challenged.
     * @param _counterTripleId Counter-triple id (expected maxUint256 - tripleId) signaling defense.
     */
    function challengeThreat(address _suspect, uint256 _counterTripleId) external payable whenNotPaused {
        ThreatInfo memory info = threats[_suspect];
        if (info.tripleId == 0) revert NoActiveRegistration();
        if (info.challengeDeadline == 0) revert NoChallengeWindow();
        if (block.timestamp > info.challengeDeadline) revert ChallengeWindowOver();
        if (info.challenger != address(0)) revert ChallengeExists();
        // Only check counter-triple existence if requireCounterTripleExists is true (production mode)
        if (requireCounterTripleExists && !intuitionVault.isTriple(bytes32(_counterTripleId))) revert NotATriple(_counterTripleId);

        // Require the provided triple to be the canonical counter-triple
        uint256 expectedCounter = type(uint256).max - info.tripleId;
        if (_counterTripleId != expectedCounter) revert NotCounterTriple();

        // Challenge bond requirement
        uint256 minChallengeBond = (info.bond * challengeBondMultiplierBp) / 10_000;
        if (msg.value < minChallengeBond) revert ChallengeBondTooLow();

        // Record challenge
        threats[_suspect].challenger = msg.sender;
        threats[_suspect].counterTripleId = _counterTripleId;
        threats[_suspect].challengerBond = msg.value;
        emit ThreatChallenged(_suspect, msg.sender, _counterTripleId, msg.value, info.challengeDeadline);
    }

    /**
     * @notice Resolve a threat after its challenge window. Anyone can call. Payouts bonds to winner and treasury.
     * @dev Compares conviction of triple vs counter-triple at resolution time.
     */
    function resolveThreat(address _suspect) external whenNotPaused {
        ThreatInfo storage s = threats[_suspect];
        if (s.tripleId == 0) revert NoActiveRegistration();
        if (s.challengeDeadline == 0) revert NoChallengeWindow();
        if (block.timestamp <= s.challengeDeadline) revert ChallengeWindowOver();

        // Determine current convictions (end of window)
        (uint256 assetsEnd, ) = intuitionVault.getVault(bytes32(s.tripleId), 0);
        uint256 counterEnd = 0;
        if (s.counterTripleId != 0) {
            (counterEnd, ) = intuitionVault.getVault(bytes32(s.counterTripleId), 0);
        }

        // TWAP: use start snapshots taken at registration vs end-of-window values
        uint256 netStart = s.counterAssetsStart < s.assetsStart ? s.assetsStart - s.counterAssetsStart : 0;
        uint256 netEnd = counterEnd < assetsEnd ? assetsEnd - counterEnd : 0;

        // Volatility extension if there was a challenge and large swing
        if (volatilityExtensionEnabled && s.challenger != address(0)) {
            uint256 denom = netStart > 0 ? netStart : 1; // avoid div by zero
            uint256 deltaBp = (netStart > netEnd)
                ? ((netStart - netEnd) * 10_000) / denom
                : ((netEnd - netStart) * 10_000) / denom;
            if (deltaBp >= volatilityThresholdBp) {
                uint256 oldDeadline = s.challengeDeadline;
                uint256 newDeadline = block.timestamp + volatilityExtension;
                s.challengeDeadline = newDeadline;
                emit ChallengeWindowExtended(_suspect, oldDeadline, newDeadline, netStart, netEnd);
                revert ResolveDeferred();
            }
        }

        // Compare TWAPs: avg triple vs avg counter
        bool registrarWins = (s.assetsStart + assetsEnd) > (s.counterAssetsStart + counterEnd);

        // Snapshot payout parties and amounts, then clear dispute state
        address payable registrar = payable(s.registrar);
        address payable challenger = payable(s.challenger);
        uint256 registrarBond = s.bond;
        uint256 challengerBond = s.challengerBond;

        s.challengeDeadline = 0;
        s.challenger = address(0);
        s.counterTripleId = 0;
        s.challengerBond = 0;

        uint256 treasuryCut;
        uint256 winnerPayout;

        if (challenger == address(0)) {
            _safeTransfer(registrar, registrarBond);
            emit ThreatResolved(_suspect, true, registrarBond, 0);
            return;
        }

        if (registrarWins) {
            uint256 winnerShare = (challengerBond * winnerRewardBp) / 10_000;
            treasuryCut = challengerBond - winnerShare;
            winnerPayout = registrarBond + winnerShare;
            _safeTransfer(registrar, winnerPayout);
            if (treasuryCut > 0 && treasury != address(0)) {
                _safeTransfer(payable(treasury), treasuryCut);
            }
        } else {
            uint256 winnerShare = (registrarBond * winnerRewardBp) / 10_000;
            treasuryCut = registrarBond - winnerShare;
            winnerPayout = challengerBond + winnerShare;
            _safeTransfer(challenger, winnerPayout);
            if (treasuryCut > 0 && treasury != address(0)) {
                _safeTransfer(payable(treasury), treasuryCut);
            }
            delete threats[_suspect];
        }

        emit ThreatResolved(_suspect, registrarWins, winnerPayout, treasuryCut);
    }
    /**
     * @notice Computes conviction metrics and the resulting RiskStatus for a target.
     * @dev Algorithm:
     *      - Read conviction (assets, shares) for the registered tripleId (malicious signal).
     *      - Compute counterTripleId = maxUint256 - tripleId and read its conviction (defensive signal).
     *      - netConviction = max(assets - counterAssets, 0).
     *      - Map netConviction to status: >= BLOCK => BLOCKED; >= WARN => WATCH; else SAFE.
     * @param _target Address to score.
     * @return assets Raw conviction (TRUST) backing the malicious triple.
     * @return shares Shares for the triple in the vault (if applicable to strategy).
     * @return status RiskStatus classification (UNREGISTERED_SAFE if no tripleId registered).
     * @return tripleId The tripleId associated with the target (0 if unregistered).
     */
    function riskScore(address _target) public view returns (uint256 assets, uint256 shares, RiskStatus status, uint256 tripleId) {
        tripleId = threats[_target].tripleId;
        if (tripleId == 0) {
            return (0, 0, RiskStatus.UNREGISTERED_SAFE, 0);
        }
    (assets, shares) = intuitionVault.getVault(bytes32(tripleId), 0);

        // Check for counter-triple conviction (defensive signal)
        uint256 counterTripleId = type(uint256).max - tripleId;
    (uint256 counterAssets, ) = intuitionVault.getVault(bytes32(counterTripleId), 0);

        // Net conviction: positive conviction minus counter conviction
        uint256 netConviction = counterAssets < assets ? assets - counterAssets : 0;

        if (netConviction >= BLOCK_STAKE_THRESHOLD) {
            status = RiskStatus.BLOCKED;
        } else if (netConviction >= WARN_STAKE_THRESHOLD) {
            status = RiskStatus.WATCH;
        } else {
            status = RiskStatus.SAFE;
        }
    }

    /**
     * @notice Convenience boolean for external contract gating.
     * @dev Intended for use by integrators to quickly reject flow when status is BLOCKED.
     * @param _target Address to check.
     * @return True if risk status is BLOCKED; false otherwise.
     */
    function isBlocked(address _target) external view returns (bool) {
        (, , RiskStatus status, ) = riskScore(_target);
        return status == RiskStatus.BLOCKED;
    }

    /**
     * @notice Returns a normalized immunity score in basis points (0 = worst, 10_000 = best).
     * @dev Inverted scale: more net conviction lowers the score. We cap the impact at BLOCK_STAKE_THRESHOLD so
     *      scores remain within [0, 10_000]. Includes counter-triple offset (defensive conviction).
     * @param _target Address to score.
     * @return scoreBp Immunity score in basis points.
     */
    function immunityScoreBp(address _target) external view returns (uint256 scoreBp) {
        (uint256 assets, , RiskStatus status, uint256 tripleId) = riskScore(_target);
        if (status == RiskStatus.UNREGISTERED_SAFE) return 10_000;

    uint256 counterTripleId = type(uint256).max - tripleId;
    (uint256 counterAssets, ) = intuitionVault.getVault(bytes32(counterTripleId), 0);
        uint256 netConviction = counterAssets < assets ? assets - counterAssets : 0;

        uint256 capped = netConviction > BLOCK_STAKE_THRESHOLD ? BLOCK_STAKE_THRESHOLD : netConviction;
        scoreBp = 10_000 - (capped * 10_000 / BLOCK_STAKE_THRESHOLD);
    }

    /**
     * @notice Full threat intelligence bundle for a target.
     * @dev Combines registration metadata with current conviction and counter-conviction readings.
     * @param _target Address to inspect.
     * @return tripleId Registered tripleId (0 if none)
     * @return registeredAt Timestamp of latest registration
     * @return registrar Address that performed latest registration
     * @return conviction Current malicious conviction (TRUST)
     * @return counterConviction Current defensive conviction (TRUST) on the counter-triple
     * @return status Current RiskStatus classification
     */
    function getThreatIntel(address _target) external view returns (
        uint256 tripleId,
        uint256 registeredAt,
        address registrar,
        uint256 conviction,
        uint256 counterConviction,
        RiskStatus status
    ) {
        ThreatInfo memory info = threats[_target];
        tripleId = info.tripleId;
        registeredAt = info.registeredAt;
        registrar = info.registrar;

        if (tripleId == 0) {
            return (0, 0, address(0), 0, 0, RiskStatus.UNREGISTERED_SAFE);
        }

        (uint256 assets, , RiskStatus riskStatus, ) = riskScore(_target);
        conviction = assets;

    uint256 counterTripleId = type(uint256).max - tripleId;
    (counterConviction, ) = intuitionVault.getVault(bytes32(counterTripleId), 0);
        status = riskStatus;
    }

    /**
     * @notice Admin: update WATCH/BLOCK thresholds.
     * @dev Constraints: 0 < _newWarn < _newBlock. Emits ThresholdsUpdated on success.
     * @param _newWarn New WARN_STAKE_THRESHOLD in TRUST units (wei-style).
     * @param _newBlock New BLOCK_STAKE_THRESHOLD in TRUST units (wei-style).
     */
    function setThresholds(uint256 _newWarn, uint256 _newBlock) external onlyOwner {
        if (!(_newWarn > 0 && _newBlock > _newWarn)) revert InvalidThresholds();
        WARN_STAKE_THRESHOLD = _newWarn;
        BLOCK_STAKE_THRESHOLD = _newBlock;
        emit ThresholdsUpdated(_newWarn, _newBlock);
    }

    // --------- Admin: economic params ---------
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }
    function setMinBond(uint256 _minBond) external onlyOwner {
        require(_minBond > 0, "minBond=0");
        minBond = _minBond;
    }
    function setChallengeWindow(uint256 _seconds) external onlyOwner {
        require(_seconds >= 1 hours, "challengeWindow too small");
        challengeWindow = _seconds;
    }
    function setChallengeBondMultiplierBp(uint256 _bp) external onlyOwner {
        require(_bp >= 10_000, "multiplier <1x");
        challengeBondMultiplierBp = _bp;
    }
    function setWinnerRewardBp(uint256 _bp) external onlyOwner {
        require(_bp <= 10_000, "reward >100%");
        winnerRewardBp = _bp;
    }
    function setRequireCounterTripleExists(bool _require) external onlyOwner {
        requireCounterTripleExists = _require;
    }

    /**
     * @notice Emergency pause (circuit breaker) in case of upstream issues or exploit signals.
     * @dev Disables registerThreat; read functions continue to work. Only callable by owner.
     */
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Resume normal operations after an emergency pause.
     * @dev Only callable by owner.
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Admin: update minimum registration assets threshold.
     * @dev Must be greater than zero.
     * @param _newMin Minimum TRUST required on a triple to be accepted.
     */
    function setMinRegistrationAssets(uint256 _newMin) external onlyOwner {
        if (_newMin == 0) revert InvalidMinRegistrationAssets();
        minRegistrationAssets = _newMin;
    }

    // --------- Views & helpers ---------
    function getDispute(address _target) external view returns (
        uint256 challengeDeadline,
        address challenger,
        uint256 counterTripleId,
        uint256 registrarBond,
        uint256 challengerBond
    ) {
        ThreatInfo memory info = threats[_target];
        return (info.challengeDeadline, info.challenger, info.counterTripleId, info.bond, info.challengerBond);
    }

    function _safeTransfer(address payable to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }
}
