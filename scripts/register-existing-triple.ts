/**
 * Register Existing Triple
 * -----------------------
 * Register a threat using an existing Intuition triple (no staking needed)
 * 
 * Usage:
 *   npx hardhat run scripts/register-existing-triple.ts --network intuitionTestnet -- \
 *     --address 0xScammerAddress \
 *     --triple 12345
 */

import hre from 'hardhat';
import dotenv from 'dotenv';
import { requireEnv } from './helpers/validate-env';

dotenv.config();

function getArg(flag: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    return undefined;
}

async function main() {
    console.log('🛡️  AEGIS - Register Existing Triple\n');

    requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);

    const firewallAddress = process.env.FIREWALL_ADDRESS || getArg('--firewall');
    if (!firewallAddress) {
        throw new Error('FIREWALL_ADDRESS env or --firewall required');
    }

    const suspectAddress = getArg('--address');
    if (!suspectAddress) {
        throw new Error('--address required');
    }

    const tripleIdStr = getArg('--triple');
    if (!tripleIdStr) {
        throw new Error('--triple <tripleId> required');
    }

    console.log(`Address: ${suspectAddress}`);
    console.log(`Triple ID: ${tripleIdStr}`);
    console.log(`Firewall: ${firewallAddress}\n`);

    const hh: any = hre as any;
    const [signer] = await hh.ethers.getSigners();
    const firewall = await hh.ethers.getContractAt('AdaptiveImmuneFirewall', firewallAddress, signer);

    // Check if already registered
    const existingThreat = await firewall.threats(suspectAddress);
    if (existingThreat.tripleId !== 0n) {
        console.log(`⚠️  Already registered with triple: ${existingThreat.tripleId}`);
        console.log(`Registered at: ${new Date(Number(existingThreat.registeredAt) * 1000).toISOString()}`);
        console.log(`Registrar: ${existingThreat.registrar}\n`);
    }

    // Register
    console.log('Registering threat...');
    const tx = await firewall.registerThreat(suspectAddress, tripleIdStr);
    console.log(`Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt?.blockNumber}\n`);

    // Check status
    const riskScore = await firewall.riskScore(suspectAddress);
    const isBlocked = await firewall.isBlocked(suspectAddress);
    const statusNames = ['UNREGISTERED_SAFE', 'SAFE', 'WATCH', 'BLOCKED'];

    console.log('Status:', statusNames[riskScore.status]);
    console.log('Blocked:', isBlocked ? '✅ YES' : '❌ NO');
    console.log('Conviction:', hh.ethers.formatEther(riskScore.assets), 'TRUST');
}

main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
