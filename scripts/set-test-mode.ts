/*
  Set Test Mode
  -------------
  Toggles requireCounterTripleExists for testing without real counter-triples.
  
  Usage:
    npx ts-node scripts/set-test-mode.ts <true|false>
*/
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [ { name: '_require', type: 'bool' } ],
    name: 'setRequireCounterTripleExists',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'requireCounterTripleExists',
    outputs: [ { name: '', type: 'bool' } ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/set-test-mode.ts <true|false>');
    process.exit(1);
  }

  const enable = args[0].toLowerCase() === 'true';
  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  console.log('🔧 Setting requireCounterTripleExists...');
  console.log('  Firewall:', firewallAddress);
  console.log('  New value:', enable);

  const current = await publicClient.readContract({
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'requireCounterTripleExists'
  });
  console.log('  Current:', current);

  const { request } = await publicClient.simulateContract({
    account,
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'setRequireCounterTripleExists',
    args: [enable]
  });
  const hash = await walletClient.writeContract(request);
  console.log('  Tx:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  Status:', receipt.status);
  console.log(`✅ Test mode ${enable ? 'DISABLED (production)' : 'ENABLED (testing)'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
