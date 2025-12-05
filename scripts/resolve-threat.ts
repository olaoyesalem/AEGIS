/*
  Resolve Threat Script
  ---------------------
  Attempts to resolve a threat after its (possibly extended) challenge window.
  Will revert with ResolveDeferred if volatility extension triggers; re-run later.

  Usage:
    npx ts-node scripts/resolve-threat.ts <suspect_address>
*/
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  { inputs: [ { name: 'suspect', type: 'address' } ], name: 'resolveThreat', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [ { name: '_target', type: 'address' } ], name: 'getDispute', outputs: [
      { name: 'challengeDeadline', type: 'uint256' },
      { name: 'challenger', type: 'address' },
      { name: 'counterTripleId', type: 'uint256' },
      { name: 'registrarBond', type: 'uint256' },
      { name: 'challengerBond', type: 'uint256' }
    ], stateMutability: 'view', type: 'function' }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/resolve-threat.ts <suspect>');
    process.exit(1);
  }
  const suspect = args[0] as `0x${string}`;
  if (!suspect.startsWith('0x') || suspect.length !== 42) throw new Error('Invalid suspect');

  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  // Pre-check dispute status
  const dispute = await publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'getDispute', args: [suspect] });
  const deadline = dispute[0];
  console.log('\n🕒 Challenge deadline:', deadline.toString());
  console.log('⏱ Current time:', Math.floor(Date.now() / 1000));

  if (deadline !== 0n && BigInt(Math.floor(Date.now() / 1000)) <= deadline) {
    console.log('⚠️  Window still active; resolve will revert.');
  }

  try {
    const { request } = await publicClient.simulateContract({ account, address: firewallAddress, abi: FIREWALL_ABI, functionName: 'resolveThreat', args: [suspect] });
    const hash = await walletClient.writeContract(request);
    console.log('Tx submitted:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Status:', receipt.status);
  } catch (e: any) {
    if (/ResolveDeferred/.test(e.message)) {
      console.log('🔄 Volatility extension triggered; wait and retry later.');
    } else {
      console.error('❌ Resolve failed:', e.message || e);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
