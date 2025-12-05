import { AegisClient, THREAT_LABELS, calculateCounterTripleId } from '../src';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Full workflow - Create threat triple and register it
 * 
 * This example demonstrates:
 * 1. Creating a threat triple on Intuition
 * 2. Staking on the triple
 * 3. Registering the threat on the firewall
 */
async function main() {
  // 1. Validate environment
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment');
  }

  // 2. Setup clients
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: intuitionTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: intuitionTestnet,
    transport: http(),
  });

  // 3. Initialize Aegis client
  const aegis = new AegisClient({
    publicClient,
    walletClient,
    firewallAddress: '0xYourFirewallAddressHere' as `0x${string}`,
    multiVaultAddress: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5',
  });

  if (!aegis.canWrite) {
    throw new Error('Wallet not configured properly');
  }

  console.log('🛡️  Aegis Antibody Agent\n');
  console.log(`Operator: ${account.address}\n`);

  // 4. Define the threat
  const maliciousAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' as `0x${string}`;
  const stakeAmount = parseEther('0.01'); // 0.01 ETH stake

  console.log(`🦠 Target: ${maliciousAddress}`);
  console.log(`💰 Stake: ${stakeAmount.toString()} wei (0.01 ETH)\n`);

  // 5. Check triple creation cost
  const tripleCost = await aegis.antibodyAgent!.getTripleCost();
  console.log(`💸 Protocol Fee: ${tripleCost.toString()} wei\n`);

  // 6. Create the threat triple and stake on it
  console.log('🧪 Creating threat triple...');
  const tripleResult = await aegis.antibodyAgent!.createThreatTriple({
    targetAddress: maliciousAddress,
    threatLabel: THREAT_LABELS.MALICIOUS,
    stakeAmount,
  });

  console.log(`✅ Triple created!`);
  console.log(`   Transaction: ${tripleResult.transactionHash}`);
  console.log(`   Triple ID: ${tripleResult.tripleId.toString()}`);
  console.log(`   Subject (Address): ${tripleResult.subjectId.toString()}`);
  console.log(`   Predicate ("is"): ${tripleResult.predicateId.toString()}`);
  console.log(`   Object ("Malicious"): ${tripleResult.objectId.toString()}\n`);

  // 7. Get minimum bond for registration
  const minBond = await aegis.threatManager!.getMinimumBond();
  console.log(`💰 Min Registration Bond: ${minBond.toString()} wei\n`);

  // 8. Register the threat on the firewall
  console.log('📝 Registering threat on firewall...');
  const registrationResult = await aegis.threatManager!.registerThreat({
    suspect: maliciousAddress,
    tripleId: tripleResult.tripleId,
    bond: minBond,
  });

  console.log(`✅ Threat registered!`);
  console.log(`   Transaction: ${registrationResult.transactionHash}\n`);

  // 9. Verify the registration
  console.log('🔍 Verifying registration...');
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for block confirmation

  const riskScore = await aegis.riskScorer.getRiskScore(maliciousAddress);
  console.log(`   Status: ${aegis.riskScorer.getRiskStatusLabel(riskScore.status)}`);
  console.log(`   Triple ID: ${riskScore.tripleId.toString()}`);
  console.log(`   Conviction: ${riskScore.assets.toString()} wei\n`);

  // 10. Show what happens next
  console.log('📋 What happens next:');
  console.log('   1. A challenge window is now open for others to dispute this claim');
  console.log('   2. Anyone can challenge by posting a counter-triple and bond');
  console.log('   3. After the challenge window, the threat can be resolved');
  console.log('   4. The winner gets their bond back plus a reward from the loser\n');

  const intel = await aegis.riskScorer.getThreatIntel(maliciousAddress);
  if (intel.challengeDeadline > 0n) {
    const deadline = new Date(Number(intel.challengeDeadline) * 1000);
    console.log(`⏰ Challenge Window Closes: ${deadline.toLocaleString()}`);
    
    const requiredChallengeBond = await aegis.threatManager!.calculateChallengeBond(maliciousAddress);
    console.log(`💰 Required Challenge Bond: ${requiredChallengeBond.toString()} wei`);
    
    const counterTripleId = calculateCounterTripleId(tripleResult.tripleId);
    console.log(`🔗 Counter-Triple ID: ${counterTripleId.toString()}\n`);
  }

  console.log('✅ All done! The threat is now registered and visible to the network.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
