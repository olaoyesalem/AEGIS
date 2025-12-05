/*
  Link Threat Script
  ------------------
  Usage:
    # network via --network flag as usual
    FIREWALL_ADDRESS=0xYourFirewall npx hardhat run scripts/link-threat.ts --network <net> --address 0xSuspect --deposit 0.01

  This resolves (or creates) the canonical Intuition Risk Triple for a suspect address
  and calls ImmuneFirewall.registerThreat(suspect, tripleId).
*/
import hre from 'hardhat';
import dotenv from 'dotenv';
import { resolveOrCreateRiskTripleIdForAddress } from './helpers/resolve-triple';
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
  // Ensure we can sign and reach the network; resolver also checks these.
  requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);

  const suspect = getArg('--address');
  if (!suspect) throw new Error('--address is required');

  const deposit = getArg('--deposit', '0.01'); // TRUST units (denominated with parseEther semantics)

  console.log('Resolving/creating triple for suspect:', suspect);
  const { tripleId, transactionHash } = await resolveOrCreateRiskTripleIdForAddress({
    suspectAddress: suspect,
    depositTrust: deposit,
  });

  if (transactionHash) {
    console.log('Triple tx hash:', transactionHash);
  }
  console.log('Resolved tripleId (vaultId):', tripleId.toString());

  const hh: any = hre as any;
  const [signer] = await hh.ethers.getSigners();
  const firewall = await hh.ethers.getContractAt('AdaptiveImmuneFirewall', firewallAddress, signer);

  console.log('Calling registerThreat on firewall...');
  const tx = await firewall.registerThreat(suspect, tripleId);
  const rc = await tx.wait();
  console.log('registerThreat tx mined in block', rc?.blockNumber);
}

main().catch((e) => {
  console.error('link-threat failed:', e);
  process.exit(1);
});
