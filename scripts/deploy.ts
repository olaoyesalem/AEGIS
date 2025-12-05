import { config as dotenv } from 'dotenv';
dotenv();
import { ethers } from 'hardhat';
import { getMultiVaultAddressFromChainId, intuitionTestnet } from '@0xintuition/protocol';
import { requireEnv } from './helpers/validate-env';
import fs from 'fs';
import path from 'path';

// Usage: npx hardhat run scripts/deploy.ts --network intuitionTestnet
// Expects ENV: optional VAULT_ADDRESS_OVERRIDE

async function main() {
  // validate environment
  requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);
  // Automatically resolve MultiVault address from Intuition protocol package
  const vaultAddress = process.env.VAULT_ADDRESS_OVERRIDE || getMultiVaultAddressFromChainId(intuitionTestnet.id);
  if (!vaultAddress) throw new Error('Could not resolve Intuition MultiVault address');

  console.log('=== Deploying Aegis AdaptiveImmuneFirewall ===');
  console.log('  Network:', intuitionTestnet.name);
  console.log('  Chain ID:', intuitionTestnet.id);
  console.log('  Intuition MultiVault:', vaultAddress);
  console.log('  WARN_STAKE_THRESHOLD:', '0.0001', 'TRUST (hardcoded)');
  console.log('  BLOCK_STAKE_THRESHOLD:', '0.001', 'TRUST (hardcoded)');

  const factory = await ethers.getContractFactory('AdaptiveImmuneFirewall');
  const contract = await factory.deploy(vaultAddress);

  console.log('\nAwaiting deployment...');
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('✅ AdaptiveImmuneFirewall deployed at:', address);

  // Persist deployment info to deployments/<network>-AdaptiveImmuneFirewall.json
  try {
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
    const filePath = path.join(
      deploymentsDir,
      `${intuitionTestnet.name || 'intuitionTestnet'}-AdaptiveImmuneFirewall.json`
    );
    // Fetch thresholds from the contract to record actual values
    const warn = await contract.WARN_STAKE_THRESHOLD();
    const block = await contract.BLOCK_STAKE_THRESHOLD();
    const payload = {
      contract: 'AdaptiveImmuneFirewall',
      address,
      chainId: intuitionTestnet.id,
      network: intuitionTestnet.name,
      vaultAddress,
      warnStakeTrust: ethers.formatEther(warn),
      blockStakeTrust: ethers.formatEther(block),
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    console.log(`📄 Wrote deployment info to: ${filePath}`);
    console.log('👉 Set this in your .env as:');
    console.log(`   FIREWALL_ADDRESS=${address}`);
  } catch (e) {
    console.warn('Could not persist deployment info:', e);
  }
  console.log('\nNext steps:');
  console.log('  1. Run antibody-agent.ts to create risk triples');
  console.log('  2. Call contract.registerThreat(address, tripleId)');
  console.log('  3. Query contract.isBlocked(address) or riskScore(address)');
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
