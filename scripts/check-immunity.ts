/*
  Check Immunity Script
  ---------------------
  Usage:
    FIREWALL_ADDRESS=0xYourFirewall npx hardhat run scripts/check-immunity.ts --network intuitionTestnet --address 0xTarget
*/
import hre from 'hardhat';
import dotenv from 'dotenv';
import { requireEnv } from './helpers/validate-env';

dotenv.config();

function getArg(flag: string, fallback?: string) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const firewallAddress = process.env.FIREWALL_ADDRESS || getArg('--firewall');
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS env or --firewall arg is required');
  // Network signer check
  requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);

  const target = getArg('--address');
  if (!target) throw new Error('--address is required');

  const hh: any = hre as any;
  const [signer] = await hh.ethers.getSigners();
  const firewall = await hh.ethers.getContractAt('AdaptiveImmuneFirewall', firewallAddress, signer);

  console.log('Querying riskScore...');
  const result = await firewall.riskScore(target);
  // result: [assets, shares, status, tripleId]
  const assets = result[0];
  const shares = result[1];
  const statusNum = Number(result[2]);
  const tripleId = result[3];
  const statusLabel = ['UNREGISTERED_SAFE', 'SAFE', 'WATCH', 'BLOCKED'][statusNum] || 'UNKNOWN';
  console.log('assets:', assets.toString());
  console.log('shares:', shares.toString());
  console.log('status:', statusLabel, `(${statusNum})`);
  console.log('tripleId:', tripleId.toString());

  const blocked = await firewall.isBlocked(target);
  console.log('isBlocked:', blocked);
}

main().catch((e) => {
  console.error('check-immunity failed:', e);
  process.exit(1);
});
