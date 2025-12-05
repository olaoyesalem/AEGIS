// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @notice Lightweight mock for testing. In production, use deployed Intuition EthMultiVault.
contract MockEthMultiVault {
    struct Vault {
        uint256 totalAssets;
        uint256 totalShares;
    }

    mapping(uint256 => Vault) private _vaults;
    mapping(uint256 => bool) private _isTriple;

    function setVault(uint256 vaultId, uint256 assets, uint256 shares) external {
        _vaults[vaultId] = Vault(assets, shares);
    }

    function setIsTriple(uint256 vaultId, bool value) external {
        _isTriple[vaultId] = value;
    }

    function vaults(uint256 vaultId) external view returns (uint256 totalAssets, uint256 totalShares) {
        Vault memory v = _vaults[vaultId];
        return (v.totalAssets, v.totalShares);
    }

    function isTripleId(uint256 id) external view returns (bool) {
        // Handle counter-triple IDs
        bool isCounterTriple = id > type(uint256).max / 2;
        return isCounterTriple ? _isTriple[type(uint256).max - id] : _isTriple[id];
    }

    function getTripleAtoms(uint256) external pure returns (uint256, uint256, uint256) {
        return (1, 2, 3); // Dummy values for testing
    }

    function getVaultStateForUser(uint256 vaultId, address) external view returns (uint256, uint256) {
        Vault memory v = _vaults[vaultId];
        return (v.totalShares, v.totalAssets);
    }
}
