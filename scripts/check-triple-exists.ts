/*
  Check Triple Exists Script
  --------------------------
  Verifies if a triple exists and gets its details.
  
  Usage:
    npx ts-node scripts/check-triple-exists.ts <triple_id>
*/
import { createPublicClient, http } from 'viem';
import { intuitionTestnet, getMultiVaultAddressFromChainId } from '@0xintuition/protocol';
import { getTripleDetails } from '@0xintuition/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const MULTIVAULT_ABI = [
  {
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'sharesOffset', type: 'uint256' }
    ],
    name: 'getVault',
    outputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'termId', type: 'bytes32' }],
    name: 'isTriple',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/check-triple-exists.ts <triple_id>');
    process.exit(1);
  }

  const tripleId = args[0] as `0x${string}`;

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ 
    chain: intuitionTestnet, 
    transport: http(rpcUrl) 
  });

  const vaultAddress = getMultiVaultAddressFromChainId(intuitionTestnet.id) as `0x${string}`;

  console.log('\n🔍 Checking Triple');
  console.log('  Triple ID:', tripleId);
  console.log('  Vault Address:', vaultAddress);

  // Check if it's a triple
  const isTriple = await publicClient.readContract({
    address: vaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'isTriple',
    args: [tripleId as `0x${string}`]
  });

  console.log('  Is Triple:', isTriple);

  if (!isTriple) {
    console.log('\n❌ This ID is NOT a triple!');
    console.log('   It might be an atom, or it might not exist yet.');
    process.exit(1);
  }

  // Get vault state
  const [assets, shares] = await publicClient.readContract({
    address: vaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'getVault',
    args: [tripleId as `0x${string}`, 0n]
  });

  console.log('\n📊 Vault State:');
  console.log('  Assets (conviction):', Number(assets) / 1e18, 'TRUST');
  console.log('  Shares:', Number(shares) / 1e18);

  // Try to get details with SDK
  try {
    console.log('\n📝 Fetching details from SDK...');
    const details = await getTripleDetails(tripleId);
    console.log('  Details:', JSON.stringify(details, null, 2));
  } catch (e: any) {
    console.log('  SDK fetch failed:', e.message);
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
