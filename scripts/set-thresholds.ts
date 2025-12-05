/*
  Set Thresholds Script
  ---------------------
  Admin setter to adjust WARN_STAKE_THRESHOLD and BLOCK_STAKE_THRESHOLD.
  
  Usage:
    FIREWALL_ADDRESS=0x... npx ts-node scripts/set-thresholds.ts <warn_threshold> <block_threshold>
  
  Example:
    FIREWALL_ADDRESS=0x760dA5196e4FAD85C3e41f56a7f019FE867863D7 npx ts-node scripts/set-thresholds.ts 0.0001 0.0005
*/
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [
      { name: '_newWarn', type: 'uint256' },
      { name: '_newBlock', type: 'uint256' }
    ],
    name: 'setThresholds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'WARN_STAKE_THRESHOLD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'BLOCK_STAKE_THRESHOLD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: FIREWALL_ADDRESS=0x... npx ts-node scripts/set-thresholds.ts <warn_threshold> <block_threshold>');
    console.error('Example: npx ts-node scripts/set-thresholds.ts 0.0001 0.0005');
    process.exit(1);
  }

  const warnEth = args[0];
  const blockEth = args[1];
  const warnWei = parseEther(warnEth);
  const blockWei = parseEther(blockEth);

  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  console.log('🔧 Setting Thresholds...');
  console.log('  Firewall:', firewallAddress);
  console.log('  New WARN:', warnEth, 'TRUST');
  console.log('  New BLOCK:', blockEth, 'TRUST');

  // Read current
  const [currentWarn, currentBlock] = await Promise.all([
    publicClient.readContract({
      address: firewallAddress,
      abi: FIREWALL_ABI,
      functionName: 'WARN_STAKE_THRESHOLD'
    }),
    publicClient.readContract({
      address: firewallAddress,
      abi: FIREWALL_ABI,
      functionName: 'BLOCK_STAKE_THRESHOLD'
    })
  ]);

  console.log('  Current WARN:', Number(currentWarn) / 1e18, 'TRUST');
  console.log('  Current BLOCK:', Number(currentBlock) / 1e18, 'TRUST');

  const { request } = await publicClient.simulateContract({
    account,
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'setThresholds',
    args: [warnWei, blockWei]
  });

  const hash = await walletClient.writeContract(request);
  console.log('  Tx:', hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  Status:', receipt.status);
  console.log('✅ Thresholds updated');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
