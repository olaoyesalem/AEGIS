/*
  Set Challenge Window
  --------------------
  Admin setter for challenge window duration (for faster testing).
  
  Usage:
    npx ts-node scripts/set-challenge-window.ts <seconds>
    
  Examples:
    npx ts-node scripts/set-challenge-window.ts 60     # 1 minute
    npx ts-node scripts/set-challenge-window.ts 3600   # 1 hour
    npx ts-node scripts/set-challenge-window.ts 86400  # 1 day (default)
*/
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [ { name: '_seconds', type: 'uint256' } ],
    name: 'setChallengeWindow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'challengeWindow',
    outputs: [ { name: '', type: 'uint256' } ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/set-challenge-window.ts <seconds>');
    process.exit(1);
  }

  const seconds = BigInt(args[0]);
  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  console.log('🔧 Setting challengeWindow...');
  console.log('  Firewall:', firewallAddress);
  console.log('  New value:', seconds.toString(), 'seconds');

  const current = await publicClient.readContract({
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'challengeWindow'
  });
  console.log('  Current:', current.toString(), 'seconds');

  const { request } = await publicClient.simulateContract({
    account,
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'setChallengeWindow',
    args: [seconds]
  });
  const hash = await walletClient.writeContract(request);
  console.log('  Tx:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  Status:', receipt.status);
  console.log(`✅ Challenge window updated`);
}

main().catch(e => { console.error(e); process.exit(1); });
