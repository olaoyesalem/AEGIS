import { expect } from 'chai';
import { ethers } from 'ethers';
declare const hre: any;

describe('Aegis ImmuneFirewall Suite', () => {
  const WARN = ethers.parseEther('0.25');
  const BLOCK = ethers.parseEther('0.5');
  const TRIPLE_ID = 12345n;

  async function deployMockVault() {
    // Lightweight mock for testing (replace with forked testnet in integration tests)
    const MockVault = await hre.ethers.getContractFactory('MockEthMultiVault');
    const vault = await MockVault.deploy();
    await vault.waitForDeployment();
    return vault;
  }

  describe('ImmuneFirewall', () => {
    it('should block address when conviction meets threshold', async () => {
      const vault = await deployMockVault();
      const vaultAddr = await vault.getAddress();

      const Firewall = await hre.ethers.getContractFactory('ImmuneFirewall');
      const fw = await Firewall.deploy(vaultAddr, BLOCK);
      await fw.waitForDeployment();

      const [signer] = await hre.ethers.getSigners();

      // Register threat
      await fw.registerThreat(signer.address, Number(TRIPLE_ID));

      // Initially zero conviction => safe
      expect(await fw.checkImmunity(signer.address)).to.be.true;

      // Set conviction above threshold
      await vault.setVault(Number(TRIPLE_ID), BLOCK, 0);
      expect(await fw.checkImmunity(signer.address)).to.be.false;
    });

    it('should return threat level for target', async () => {
      const vault = await deployMockVault();
      const vaultAddr = await vault.getAddress();

      const Firewall = await hre.ethers.getContractFactory('ImmuneFirewall');
      const fw = await Firewall.deploy(vaultAddr, BLOCK);
      await fw.waitForDeployment();

      const [signer] = await hre.ethers.getSigners();

      await fw.registerThreat(signer.address, Number(TRIPLE_ID));
      await vault.setVault(Number(TRIPLE_ID), ethers.parseEther('0.3'), 0);

      const level = await fw.getThreatLevel(signer.address);
      expect(level).to.equal(ethers.parseEther('0.3'));
    });
  });

  describe('AdaptiveImmuneFirewall', () => {
    it('should classify SAFE/WATCH/BLOCKED correctly', async () => {
      const vault = await deployMockVault();
      const vaultAddr = await vault.getAddress();

      const Firewall = await hre.ethers.getContractFactory('AdaptiveImmuneFirewall');
      const fw = await Firewall.deploy(vaultAddr, WARN, BLOCK);
      await fw.waitForDeployment();

      const [signer] = await hre.ethers.getSigners();

      // Mark triple as valid
      await vault.setIsTriple(Number(TRIPLE_ID), true);

      // Register threat
      await fw.registerThreat(signer.address, Number(TRIPLE_ID));

      // Initially zero => SAFE
      let result = await fw.riskScore(signer.address);
      expect(result[2]).to.equal(1); // RiskStatus.SAFE

      // Set assets above WARN but below BLOCK => WATCH
      await vault.setVault(Number(TRIPLE_ID), ethers.parseEther('0.3'), 0);
      result = await fw.riskScore(signer.address);
      expect(result[2]).to.equal(2); // RiskStatus.WATCH

      // Set assets above BLOCK => BLOCKED
      await vault.setVault(Number(TRIPLE_ID), ethers.parseEther('0.6'), 0);
      result = await fw.riskScore(signer.address);
      expect(result[2]).to.equal(3); // RiskStatus.BLOCKED

      expect(await fw.isBlocked(signer.address)).to.be.true;
    });

    it('should factor counter-triple conviction', async () => {
      const vault = await deployMockVault();
      const vaultAddr = await vault.getAddress();

      const Firewall = await hre.ethers.getContractFactory('AdaptiveImmuneFirewall');
      const fw = await Firewall.deploy(vaultAddr, WARN, BLOCK);
      await fw.waitForDeployment();

      const [signer] = await hre.ethers.getSigners();

      await vault.setIsTriple(Number(TRIPLE_ID), true);
      await fw.registerThreat(signer.address, Number(TRIPLE_ID));

      // Set malicious conviction at 0.6 ETH (BLOCKED level)
      await vault.setVault(Number(TRIPLE_ID), ethers.parseEther('0.6'), 0);

      // Set counter-triple conviction at 0.5 ETH (defense)
      const counterTripleId = Number(2n ** 256n - 1n - TRIPLE_ID);
      await vault.setVault(counterTripleId, ethers.parseEther('0.5'), 0);

      // Net conviction = 0.6 - 0.5 = 0.1 ETH => SAFE
      const result = await fw.riskScore(signer.address);
      expect(result[2]).to.equal(1); // RiskStatus.SAFE
    });

    it('should pause and unpause', async () => {
      const vault = await deployMockVault();
      const vaultAddr = await vault.getAddress();

      const Firewall = await hre.ethers.getContractFactory('AdaptiveImmuneFirewall');
      const fw = await Firewall.deploy(vaultAddr, WARN, BLOCK);
      await fw.waitForDeployment();

      const [signer] = await hre.ethers.getSigners();

      await fw.emergencyPause();

      await vault.setIsTriple(Number(TRIPLE_ID), true);

      // Should revert when paused
      await expect(fw.registerThreat(signer.address, Number(TRIPLE_ID))).to.be.reverted;

      await fw.emergencyUnpause();

      // Should work after unpause
      await expect(fw.registerThreat(signer.address, Number(TRIPLE_ID))).to.not.be.reverted;
    });
  });
});

// Mock contract embedded in test file (for standalone testing; use real vault in integration tests)
