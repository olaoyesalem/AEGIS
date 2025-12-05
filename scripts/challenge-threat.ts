/*
  Challenge Threat Script
  -----------------------
  Challenges an existing threat registration by posting a higher bond and supplying
  the canonical counter-triple (maxUint256 - tripleId).

  Usage:
    npx ts-node scripts/challenge-threat.ts <suspect_address> <triple_id>

  Example:
    npx ts-node scripts/challenge-threat.ts 0xSuspect 0xTripleId
*/
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [ { name: 'suspect', type: 'address' }, { name: 'counterTripleId', type: 'uint256' } ],
    name: 'challengeThreat',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { inputs: [], name: 'challengeBondMultiplierBp', outputs: [ { name: '', type: 'uint256' } ], stateMutability: 'view', type: 'function' },
  { inputs: [ { name: '_target', type: 'address' } ], name: 'getDispute', outputs: [
      { name: 'challengeDeadline', type: 'uint256' },
      { name: 'challenger', type: 'address' },
      { name: 'counterTripleId', type: 'uint256' },
      { name: 'registrarBond', type: 'uint256' },
      { name: 'challengerBond', type: 'uint256' }
    ], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'minBond', outputs: [ { name: '', type: 'uint256' } ], stateMutability: 'view', type: 'function' }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/challenge-threat.ts <suspect> <registeredTripleId>');
    process.exit(1);
  }
  const suspect = args[0] as `0x${string}`;
  const registeredTripleIdHex = args[1] as `0x${string}`;
  if (!suspect.startsWith('0x') || suspect.length !== 42) throw new Error('Invalid suspect');

  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing in .env');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  const registeredTripleId = BigInt(registeredTripleIdHex);
  const counterTripleId = (BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') - registeredTripleId);

  console.log('\n⚔️  Challenge Threat');
  console.log('  Suspect:', suspect);
  console.log('  Registered triple:', registeredTripleIdHex);
  console.log('  Counter triple (computed): 0x' + counterTripleId.toString(16).padStart(64, '0'));

  // Read dispute & economics
  const [dispute, multiplierBp, minBond] = await Promise.all([
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'getDispute', args: [suspect] }),
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'challengeBondMultiplierBp' }),
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'minBond' })
  ]);

  const registrarBond = dispute[3];
  const requiredChallengeBond = (registrarBond * multiplierBp) / 10000n;

  console.log('  Registrar bond:', Number(registrarBond) / 1e18, 'ETH');
  console.log('  Multiplier (bp):', multiplierBp.toString());
  console.log('  Required challenge bond:', Number(requiredChallengeBond) / 1e18, 'ETH');

  // Simulate + send challenge
  const { request } = await publicClient.simulateContract({
    account,
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'challengeThreat',
    args: [suspect, counterTripleId],
    value: requiredChallengeBond
  });
  const hash = await walletClient.writeContract(request);
  console.log('  Tx submitted:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('  Status:', receipt.status);
}

main().catch(e => { console.error(e); process.exit(1); });
