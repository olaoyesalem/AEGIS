// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title IEthMultiVault
/// @notice Interface matching deployed Intuition EthMultiVault contract for reading conviction.
/// @dev Based on 0xIntuition/intuition-contracts EthMultiVault.sol
interface IEthMultiVault {
    struct VaultState {
        uint256 totalAssets;
        uint256 totalShares;
        mapping(address => uint256) balanceOf;
    }

    /// @notice Returns vault state (total assets and shares) for a given term ID and curve ID.
    /// @param termId The term ID (atom or triple) to query.
    /// @param curveId The bonding curve ID (use 0 for default curve).
    /// @return totalAssets Total underlying ETH deposited into the vault.
    /// @return totalShares Total shares representing ownership.
    function getVault(bytes32 termId, uint256 curveId) external view returns (uint256 totalAssets, uint256 totalShares);

    /// @notice Check if a vault ID is a triple (vs atom).
        /// @param termId vault ID to check.
    /// @return bool true if triple, false if atom.
        function isTriple(bytes32 termId) external view returns (bool);

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
