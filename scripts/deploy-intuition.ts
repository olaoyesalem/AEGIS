import { config as dotenv } from 'dotenv';
dotenv();
import { ethers, network } from 'hardhat';
import { requireEnv } from './helpers/validate-env';
import fs from 'fs';
import path from 'path';

// Usage: 
//   Testnet:  npx hardhat run scripts/deploy-intuition.ts --network intuitionTestnet
//   Mainnet:  npx hardhat run scripts/deploy-intuition.ts --network intuitionMainnet

// Network-specific configurations
const NETWORK_CONFIG: Record<string, { name: string; chainId: number; vaultAddress: string }> = {
  intuitionTestnet: {
    name: 'Intuition Testnet',
    chainId: 21097,
    vaultAddress: '0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91'
  },
  intuitionMainnet: {
    name: 'Intuition Mainnet',
    chainId: 1155,
    vaultAddress: '0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e'
  }
};

async function main() {
  // Validate environment
  requireEnv(['PRIVATE_KEY']);
  
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];
  
  if (!config) {
    throw new Error(`Unsupported network: ${networkName}. Use --network intuitionTestnet or --network intuitionMainnet`);
  }

  const vaultAddress = process.env.VAULT_ADDRESS_OVERRIDE || config.vaultAddress;
  
  console.log('=== Deploying Aegis AdaptiveImmuneFirewall ===');
  console.log('  Network:', config.name);
  console.log('  Chain ID:', config.chainId);
  console.log('  Intuition MultiVault:', vaultAddress);
  console.log('  WARN_STAKE_THRESHOLD:', '0.0001', 'TRUST (hardcoded in contract)');
  console.log('  BLOCK_STAKE_THRESHOLD:', '0.001', 'TRUST (hardcoded in contract)');

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
      `${networkName}-AdaptiveImmuneFirewall.json`
    );
    
    const deploymentData = {
      contract: 'AdaptiveImmuneFirewall',
      address,
      chainId: config.chainId,
      network: networkName,
      vaultAddress,
      warnStakeTrust: '0.0001',
      blockStakeTrust: '0.001',
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
    console.log(`\n📄 Deployment info saved to: ${filePath}`);
  } catch (err) {
    console.warn('⚠️  Could not save deployment info:', err);
  }

  console.log('\n=== Deployment Summary ===');
  console.log('  Contract:', 'AdaptiveImmuneFirewall');
  console.log('  Address:', address);
  console.log('  Network:', config.name, `(Chain ID: ${config.chainId})`);
  console.log('  Vault:', vaultAddress);
  
  console.log('\n📋 Next Steps:');
  console.log('  1. Verify contract on explorer:');
  if (networkName === 'intuitionMainnet') {
    console.log(`     https://explorer.intuition.systems/address/${address}`);
    console.log('\n  2. Update frontend/.env.local:');
    console.log(`     NEXT_PUBLIC_FIREWALL_ADDRESS=${address}`);
  } else {
    console.log(`     https://explorer.testnet.intuition.systems/address/${address}`);
  }
  console.log('\n  3. Rebuild frontend:');
  console.log('     cd ../frontend && npm run build');
  console.log('\n🎉 Deployment complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
