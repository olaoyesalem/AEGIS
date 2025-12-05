/**
 * Block Address Script
 * --------------------
 * Simple script to flag and block a malicious address on the AEGIS firewall
 * 
 * Usage:
 *   Basic:
 *     npx hardhat run scripts/block-address.ts --network intuitionTestnet
 *   With script arguments (MUST use "--" separator so Hardhat ignores them):
 *     npx hardhat run scripts/block-address.ts --network intuitionTestnet -- --address 0xABC... --stake auto
 *   Or via env vars:
 *     ADDRESS=0xABC... STAKE=auto npx hardhat run scripts/block-address.ts --network intuitionTestnet
 *   Shortcut (auto stake):
 *     npm run block:auto
 * 
 * Environment variables required:
 *   - PRIVATE_KEY: Your wallet private key
 *   - FIREWALL_ADDRESS: Deployed AdaptiveImmuneFirewall contract address
 *   - INTUITION_RPC_URL: RPC endpoint (usually set in .env)
 * 
 * Interactive prompts will ask for:
 *   - Address to block
 *   - Amount of TRUST to stake (default: 0.01)
 *   - Reason for blocking (optional)
 */

import hre from 'hardhat';
import dotenv from 'dotenv';
import { resolveOrCreateRiskTripleIdForAddress } from './helpers/resolve-triple';
import { requireEnv } from './helpers/validate-env';
import * as readline from 'readline';
import { formatEther } from 'viem';

dotenv.config();

// Helper to get command line arguments
function getArg(flag: string, fallback?: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    return fallback;
}

// Helper to prompt user for input
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    console.log('🛡️  AEGIS - Block Malicious Address\n');

    // Validate environment
    requireEnv(['PRIVATE_KEY', 'INTUITION_RPC_URL']);

    const firewallAddress = process.env.FIREWALL_ADDRESS || getArg('--firewall');
    if (!firewallAddress) {
        throw new Error('❌ FIREWALL_ADDRESS environment variable or --firewall argument is required');
    }

    console.log(`Firewall Contract: ${firewallAddress}\n`);

    // Get address to block (from args or prompt)
    // Accept flag, env var ADDRESS, or prompt.
    let suspectAddress = getArg('--address') || process.env.ADDRESS;
    if (!suspectAddress) {
        suspectAddress = await prompt('Enter address to block (0x...): ');
    }

    // Validate address format
    if (!suspectAddress.startsWith('0x') || suspectAddress.length !== 42) {
        throw new Error('❌ Invalid address format. Must be 42 characters starting with 0x');
    }

    // Get stake amount (from args or prompt). Support keyword 'auto' to auto-compute BLOCK threshold coverage.
    // Accept flag, env var STAKE, or prompt.
    let stakeAmountInput = getArg('--stake') || process.env.STAKE;
    if (!stakeAmountInput) {
        const input = await prompt('Enter TRUST amount to stake or "auto" (default: auto for BLOCK): ');
        stakeAmountInput = input.trim() || 'auto';
    }

    // Get reason (optional)
    let reason = getArg('--reason');
    if (!reason) {
        reason = await prompt('Reason for blocking (optional): ');
    }

    console.log('\n📋 Summary:');
    console.log(`   Address to block: ${suspectAddress}`);
    console.log(`   Stake amount (requested): ${stakeAmountInput} TRUST`);
    console.log(`   Reason: ${reason || 'Not provided'}`);
    console.log('');

    // Confirm
    const confirm = await prompt('Proceed? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Cancelled by user');
        return;
    }

    // Prepare firewall contract instance early so we can read thresholds for auto stake calculations
    const hh: any = hre as any;
    const [signer] = await hh.ethers.getSigners();
    const firewall = await hh.ethers.getContractAt('AdaptiveImmuneFirewall', firewallAddress, signer);

    const warnThreshold = await firewall.WARN_STAKE_THRESHOLD();
    const blockThreshold = await firewall.BLOCK_STAKE_THRESHOLD();
    const minBond = await firewall.minBond();
    const minRegistrationAssets = await firewall.minRegistrationAssets();

    console.log('\n⚙️  Current Thresholds:');
    console.log(`   WARN: ${formatEther(warnThreshold)} TRUST`);
    console.log(`   BLOCK: ${formatEther(blockThreshold)} TRUST`);
    console.log(`   minRegistrationAssets: ${formatEther(minRegistrationAssets)} TRUST`);
    console.log(`   minBond (for registration): ${formatEther(minBond)} ETH`);

    let stakeAmountResolved: string;
    if (stakeAmountInput.toLowerCase() === 'auto') {
        // Add 5% safety margin above block threshold
        const safetyBp = 500n; // 5%
        const safety = (blockThreshold * safetyBp) / 10_000n;
        const target = blockThreshold + safety;
        stakeAmountResolved = formatEther(target); // convert to human string (approx)
        console.log(`\n🧮 Auto stake computed to exceed BLOCK threshold: ~${stakeAmountResolved} TRUST`);
    } else {
        stakeAmountResolved = stakeAmountInput;
    }

    console.log('\n⚗️  Step 1: Creating Intuition Risk Triple...');

    // Create or resolve the risk triple
    const { tripleId, transactionHash } = await resolveOrCreateRiskTripleIdForAddress({
        suspectAddress: suspectAddress,
        depositTrust: stakeAmountResolved,
    });

    if (transactionHash) {
        console.log(`   ✅ Triple created: ${transactionHash}`);
    } else {
        console.log(`   ✅ Triple already exists`);
    }
    console.log(`   Triple ID (vaultId): ${tripleId.toString()}`);

    console.log('\n💉 Step 2: Registering threat on firewall...');

    // Re-use firewall instance already initialized above

    // Check if already registered
    const existingThreat = await firewall.threats(suspectAddress);
    if (existingThreat.tripleId !== 0n) {
        console.log(`   ⚠️  Address already registered with tripleId: ${existingThreat.tripleId.toString()}`);
        console.log(`   Registered at: ${new Date(Number(existingThreat.registeredAt) * 1000).toISOString()}`);
        console.log(`   Registrar: ${existingThreat.registrar}`);

        const overwrite = await prompt('\n   Overwrite existing registration? (yes/no): ');
        if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
            console.log('❌ Cancelled - keeping existing registration');
            return;
        }
    }

    // Register the threat
    console.log('   Submitting transaction...');
    console.log(`   Paying registration bond: ${formatEther(minBond)} ETH`);
    const tx = await firewall.registerThreat(suspectAddress, tripleId, { value: minBond });
    console.log(`   Transaction hash: ${tx.hash}`);

    console.log('   Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt?.blockNumber}`);

    // Check the risk score
    console.log('\n📊 Step 3: Verifying risk status...');
    const riskScore = await firewall.riskScore(suspectAddress);
    // riskScore.assets is raw conviction; check if under thresholds and advise next action
    const assetsEth = hh.ethers.formatEther(riskScore.assets);
    const blockEth = hh.ethers.formatEther(blockThreshold);
    const warnEth = hh.ethers.formatEther(warnThreshold);
    const statusNames = ['UNREGISTERED_SAFE', 'SAFE', 'WATCH', 'BLOCKED'];

    console.log(`   Conviction (assets): ${assetsEth} TRUST`);
    console.log(`   Shares: ${riskScore.shares.toString()}`);
    console.log(`   Risk Status: ${statusNames[riskScore.status]}`);
    console.log(`   Triple ID: ${riskScore.tripleId.toString()}`);

    // Check if blocked
    const isBlocked = await firewall.isBlocked(suspectAddress);

    console.log('\n' + '='.repeat(60));
    if (isBlocked) {
        console.log('✅ SUCCESS: Address is now BLOCKED');
    } else if (riskScore.status === 2) {
        console.log('⚠️  Address is on WATCH list (not yet blocked)');
        console.log(`   Need ${blockEth} TRUST total net conviction to reach BLOCKED.`);
        const deficit = blockThreshold > riskScore.assets ? blockThreshold - riskScore.assets : 0n;
        if (deficit > 0n) {
            console.log(`   Additional required stake (approx): ${hh.ethers.formatEther(deficit)} TRUST`);
            console.log('   Run: npx hardhat run scripts/add-conviction.ts --network intuitionTestnet');
        }
    } else {
        console.log('ℹ️  Address is marked as SAFE (conviction below WATCH)');
        const warnDeficit = warnThreshold > riskScore.assets ? warnThreshold - riskScore.assets : 0n;
        const blockDeficit = blockThreshold > riskScore.assets ? blockThreshold - riskScore.assets : 0n;
        console.log(`   Need ${warnEth} TRUST total for WATCH (deficit: ${hh.ethers.formatEther(warnDeficit)}).`);
        console.log(`   Need ${blockEth} TRUST total for BLOCKED (deficit: ${hh.ethers.formatEther(blockDeficit)}).`);
        console.log('   Consider re-running with --stake auto or add conviction.');
    }
    console.log('='.repeat(60));

    console.log('\n📝 Next steps:');
    console.log('   - Check status: npx hardhat run scripts/check-immunity.ts --network intuitionTestnet');
    console.log('   - Add more conviction: npx hardhat run scripts/add-conviction.ts --network intuitionTestnet');
    console.log('   - View on explorer: https://testnet.intuition.sh/');
}

main().catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
