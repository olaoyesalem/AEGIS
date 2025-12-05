

// Sources flattened with hardhat v2.27.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity 0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity 0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity 0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File contracts/interfaces/IIntuitionMultiVault.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity 0.8.20;

/// @title IEthMultiVault
/// @notice Interface matching deployed Intuition EthMultiVault contract for reading conviction.
/// @dev Based on 0xIntuition/intuition-contracts EthMultiVault.sol
interface IEthMultiVault {
    struct VaultState {
        uint256 totalAssets;
        uint256 totalShares;
        mapping(address => uint256) balanceOf;
    }

    /// @notice Returns vault state (total assets and shares) for a given vault ID.
    /// @param vaultId The vault ID (atom or triple) to query.
    /// @return totalAssets Total underlying ETH deposited into the vault.
    /// @return totalShares Total shares representing ownership.
    function vaults(uint256 vaultId) external view returns (uint256 totalAssets, uint256 totalShares);

    /// @notice Check if a vault ID is a triple (vs atom).
    /// @param id vault ID to check.
    /// @return bool true if triple, false if atom.
    function isTripleId(uint256 id) external view returns (bool);

    /// @notice Get the three atom IDs composing a triple.
    /// @param id triple vault ID.
    /// @return subjectId predicate objectId The three atom vault IDs.
    function getTripleAtoms(uint256 id) external view returns (uint256, uint256, uint256);

    /// @notice Returns user's share and asset balance in a vault.
    /// @param vaultId Vault ID to query.
    /// @param receiver User address.
    /// @return shares User's shares in vault.
    /// @return assets User's claimable assets (after fees).
    function getVaultStateForUser(uint256 vaultId, address receiver) external view returns (uint256, uint256);
}


// File contracts/AdaptiveImmuneFirewall.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity 0.8.20;



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
    uint256 public minRegistrationAssets = 0.01 ether; // Triple must have >= 0.01 TRUST conviction

    struct ThreatInfo {
        uint256 tripleId;
        uint256 registeredAt;
        address registrar;
    }
    mapping(address => ThreatInfo) public threats;

    enum RiskStatus { UNREGISTERED_SAFE, SAFE, WATCH, BLOCKED }

    event ThreatRegistered(address indexed suspect, uint256 indexed tripleId, address indexed registrar, uint256 timestamp);
    event ThresholdsEvaluated(address indexed target, uint256 tripleId, uint256 assets, RiskStatus status);
    event ThresholdsUpdated(uint256 newWarn, uint256 newBlock);
    event EmergencyPaused(address admin);
    event EmergencyUnpaused(address admin);

    error InvalidThresholds();
    error ZeroAddress();
    error ZeroTripleId();
    error NotATriple(uint256 vaultId);
    error WeakSignal(); // New triple doesn't meet minimum conviction
    error DowngradeAttempt(); // Attempt to overwrite a stronger existing tag with a weaker one

    /**
     * @notice Initializes the firewall with the Intuition MultiVault address.
     * @param _intuitionVault Address of Intuition's MultiVault contract used to read conviction for triples.
     * @dev Thresholds (WARN/BLOCK) are set to hardcoded test defaults and can be updated via setThresholds.
     */
    constructor(address _intuitionVault) Ownable(msg.sender) {
        if (_intuitionVault == address(0)) revert ZeroAddress();
        intuitionVault = IEthMultiVault(_intuitionVault);
    }

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
    function registerThreat(address _suspect, uint256 _tripleId) external whenNotPaused {
        if (_suspect == address(0)) revert ZeroAddress();
        if (_tripleId == 0) revert ZeroTripleId();
        // Validate that _tripleId is actually a triple (not an atom)
        if (!intuitionVault.isTripleId(_tripleId)) revert NotATriple(_tripleId);

        // 1. Validate minimum conviction on the proposed triple
        (uint256 newAssets, ) = intuitionVault.vaults(_tripleId);
        if (newAssets < minRegistrationAssets) revert WeakSignal();

        // 2. Overwrite protection: only stronger conviction can replace an existing tag
        uint256 currentTripleId = threats[_suspect].tripleId;
        if (currentTripleId != 0) {
            (uint256 currentAssets, ) = intuitionVault.vaults(currentTripleId);
            if (currentAssets > newAssets) revert DowngradeAttempt();
        }


        threats[_suspect] = ThreatInfo({
            tripleId: _tripleId,
            registeredAt: block.timestamp,
            registrar: msg.sender
        });
        emit ThreatRegistered(_suspect, _tripleId, msg.sender, block.timestamp);
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
        (assets, shares) = intuitionVault.vaults(tripleId);

        // Check for counter-triple conviction (defensive signal)
        uint256 counterTripleId = type(uint256).max - tripleId;
        (uint256 counterAssets, ) = intuitionVault.vaults(counterTripleId);

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
        (uint256 counterAssets, ) = intuitionVault.vaults(counterTripleId);
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
        (counterConviction, ) = intuitionVault.vaults(counterTripleId);
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
}
