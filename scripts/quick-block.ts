/**
 * Quick Block Script (Non-Interactive)
 * ------------------------------------
 * Fast way to block an address without prompts
 * 
 * Usage:
 *   npx hardhat run scripts/quick-block.ts --network intuitionTestnet -- \
 *     --address 0xScammerAddress \
 *     --stake 0.01
 * 
 * Or set environment variables:
 *   SUSPECT_ADDRESS=0x... STAKE_AMOUNT=0.01 npx hardhat run scripts/quick-block.ts --network intuitionTestnet
 */

import hre from 'hardhat';
import dotenv from 'dotenv';
import { resolveOrCreateRiskTripleIdForAddress } from './helpers/resolve-triple';
import { requireEnv } from './helpers/validate-env';

dotenv.config();

function getArg(flag: string, fallback?: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    return fallback;
}

async function main() {
    console.log('🛡️  AEGIS Quick Block\n');

    // Validate environment
    requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);

    const firewallAddress = process.env.FIREWALL_ADDRESS || getArg('--firewall');
    if (!firewallAddress) {
        throw new Error('FIREWALL_ADDRESS env or --firewall required');
    }

    // Get parameters
    const suspectAddress = process.env.SUSPECT_ADDRESS || getArg('--address');
    if (!suspectAddress) {
        throw new Error('--address argument or SUSPECT_ADDRESS env required');
    }

    const stakeAmount = process.env.STAKE_AMOUNT || getArg('--stake') || '0.01';

    console.log(`Blocking: ${suspectAddress}`);
    console.log(`Stake: ${stakeAmount} TRUST`);
    console.log(`Firewall: ${firewallAddress}\n`);

    // Create triple
    console.log('Creating risk triple...');
    const { tripleId, transactionHash } = await resolveOrCreateRiskTripleIdForAddress({
        suspectAddress,
        depositTrust: stakeAmount,
    });

    if (transactionHash) {
        console.log(`✅ Triple tx: ${transactionHash}`);
    }
    console.log(`Triple ID: ${tripleId}\n`);

    // Register threat
    console.log('Registering threat...');
    const hh: any = hre as any;
    const [signer] = await hh.ethers.getSigners();
    const firewall = await hh.ethers.getContractAt('AdaptiveImmuneFirewall', firewallAddress, signer);

    const tx = await firewall.registerThreat(suspectAddress, tripleId);
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
