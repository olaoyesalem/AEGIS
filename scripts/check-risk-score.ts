/*
  Check Risk Score Script
  -----------------------
  Reads riskScore() and getThreatIntel() from the deployed AdaptiveImmuneFirewall.

  Usage:
    npx ts-node scripts/check-risk-score.ts <address>

  Example:
    npx ts-node scripts/check-risk-score.ts 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
*/
import { createPublicClient, http } from 'viem';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'riskScore',
    outputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'tripleId', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'getThreatIntel',
    outputs: [
      { name: 'tripleId', type: 'uint256' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'registrar', type: 'address' },
      { name: 'conviction', type: 'uint256' },
      { name: 'counterConviction', type: 'uint256' },
      { name: 'status', type: 'uint8' }
    ],
    stateMutability: 'view',
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

const STATUS_MAP: Record<number,string> = {
  0: 'UNREGISTERED_SAFE',
  1: 'SAFE',
  2: 'WATCH',
  3: 'BLOCKED'
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/check-risk-score.ts <address>');
    process.exit(1);
  }
  const target = args[0] as `0x${string}`;
  if (!target.startsWith('0x') || target.length !== 42) throw new Error('Invalid address');

  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing in .env');

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });

  console.log('\n🔍 Reading risk score for', target);
  console.log('Firewall:', firewallAddress);

  const [risk, intel, warnThreshold, blockThreshold] = await Promise.all([
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'riskScore', args: [target] }),
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'getThreatIntel', args: [target] }),
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'WARN_STAKE_THRESHOLD' }),
    publicClient.readContract({ address: firewallAddress, abi: FIREWALL_ABI, functionName: 'BLOCK_STAKE_THRESHOLD' }),
  ]);

  const [assets, shares, statusNumeric, tripleId] = risk as unknown as [bigint,bigint,number,bigint];
  const [intelTriple, registeredAt, registrar, conviction, counterConviction, intelStatus] = intel as unknown as [bigint,bigint,`0x${string}`,bigint,bigint,number];

  console.log('\nRisk Score');
  console.log('  assets (TRUST):', Number(assets) / 1e18);
  console.log('  shares:', shares.toString());
  console.log('  status:', STATUS_MAP[statusNumeric] || statusNumeric);
  console.log('  tripleId:', '0x' + tripleId.toString(16).padStart(64,'0'));

  console.log('\nThreat Intel');
  console.log('  tripleId:', '0x' + intelTriple.toString(16).padStart(64,'0'));
  console.log('  registeredAt (epoch):', registeredAt.toString());
  console.log('  registrar:', registrar);
  console.log('  conviction:', Number(conviction) / 1e18);
  console.log('  counterConviction:', Number(counterConviction) / 1e18);
  console.log('  intelStatus:', STATUS_MAP[intelStatus] || intelStatus);

  console.log('\nThresholds');
  console.log('  WARN_STAKE_THRESHOLD:', Number(warnThreshold) / 1e18);
  console.log('  BLOCK_STAKE_THRESHOLD:', Number(blockThreshold) / 1e18);

  if (statusNumeric === 2) {
    console.log('\nℹ️  Address is in WATCH zone; monitor for rising conviction.');
  } else if (statusNumeric === 3) {
    console.log('\n⚠️  Address is BLOCKED; enforce gating in integrated systems.');
  } else if (statusNumeric === 0) {
    console.log('\n✅ Address unregistered; considered safe by default.');
  } else {
    console.log('\n✅ Address is SAFE (below WARN threshold).');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
