import { AegisClient, RiskStatus } from '../src';
import { createPublicClient, http } from 'viem';
import { intuitionTestnet } from '@0xintuition/protocol';

/**
 * Example: Read-only risk checking
 * 
 * This example shows how to use Aegis SDK to check risk scores
 * without needing a wallet or private key.
 */
async function main() {
  // 1. Create a public client (read-only)
  const publicClient = createPublicClient({
    chain: intuitionTestnet,
    transport: http(),
  });

  // 2. Initialize Aegis client
  const aegis = new AegisClient({
    publicClient,
    firewallAddress: '0xYourFirewallAddressHere' as `0x${string}`,
    multiVaultAddress: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5',
  });

  // 3. Example address to check
  const targetAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' as `0x${string}`;

  console.log('🛡️  Aegis Risk Assessment\n');
  console.log(`Target: ${targetAddress}\n`);

  // 4. Quick block check
  const isBlocked = await aegis.riskScorer.isBlocked(targetAddress);
  console.log(`❌ Blocked: ${isBlocked}`);

  // 5. Get detailed risk score
  const riskScore = await aegis.riskScorer.getRiskScore(targetAddress);
  console.log(`📊 Risk Status: ${aegis.riskScorer.getRiskStatusLabel(riskScore.status)}`);
  console.log(`💰 Malicious Conviction: ${riskScore.assets.toString()} wei`);
  console.log(`🛡️  Defensive Conviction: ${riskScore.counterConviction.toString()} wei`);
  console.log(`⚖️  Net Conviction: ${riskScore.netConviction.toString()} wei`);

  if (riskScore.tripleId > 0n) {
    console.log(`🔗 Triple ID: ${riskScore.tripleId.toString()}`);
  }

  // 6. Get immunity score (0-10000, higher is better)
  const immunityScore = await aegis.riskScorer.getImmunityScore(targetAddress);
  const immunityPercent = immunityScore / 100;
  console.log(`🏥 Immunity Score: ${immunityPercent}%`);

  // 7. Interpret the results
  console.log('\n📋 Recommendation:');
  switch (riskScore.status) {
    case RiskStatus.UNREGISTERED_SAFE:
      console.log('✅ This address is not registered in the system. No known threats.');
      break;
    case RiskStatus.SAFE:
      console.log('✅ This address is registered but considered safe (low threat conviction).');
      break;
    case RiskStatus.WATCH:
      console.log('⚠️  This address is under watch. Exercise caution.');
      break;
    case RiskStatus.BLOCKED:
      console.log('🚫 This address is BLOCKED. High threat conviction. Do not interact!');
      break;
  }

  // 8. Get full threat intelligence (if registered)
  if (riskScore.tripleId > 0n) {
    console.log('\n🔍 Full Threat Intelligence:');
    const intel = await aegis.riskScorer.getThreatIntel(targetAddress);
    
    const registeredDate = new Date(Number(intel.registeredAt) * 1000);
    console.log(`   Registered: ${registeredDate.toLocaleString()}`);
    console.log(`   Registrar: ${intel.registrar}`);
    console.log(`   Bond Posted: ${intel.bond.toString()} wei`);
    
    if (intel.challengeDeadline > 0n) {
      const deadline = new Date(Number(intel.challengeDeadline) * 1000);
      const now = new Date();
      if (deadline > now) {
        console.log(`   ⏰ Challenge Window Open Until: ${deadline.toLocaleString()}`);
      } else {
        console.log(`   ✅ Challenge Window Expired: ${deadline.toLocaleString()}`);
      }
    }

    if (intel.challenger !== '0x0000000000000000000000000000000000000000') {
      console.log(`   ⚔️  Challenged By: ${intel.challenger}`);
      console.log(`   Challenge Bond: ${intel.challengerBond.toString()} wei`);
    }
  }

  // 9. Get firewall parameters
  console.log('\n⚙️  Firewall Parameters:');
  const params = await aegis.riskScorer.getFirewallParameters();
  console.log(`   WARN Threshold: ${params.warnThreshold.toString()} wei`);
  console.log(`   BLOCK Threshold: ${params.blockThreshold.toString()} wei`);
  console.log(`   Min Bond: ${params.minBond.toString()} wei`);
  console.log(`   Challenge Window: ${params.challengeWindow.toString()} seconds`);
  console.log(`   Treasury: ${params.treasury}`);
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
