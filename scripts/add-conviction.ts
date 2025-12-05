/*
  Add Conviction to Existing Triple
  ----------------------------------
  Adds additional conviction to an existing malicious triple by re-staking.
  Uses the same method as the initial triple creation to add funds.
  
  Usage:
    npx ts-node scripts/add-conviction.ts <suspect_address> <amount_in_trust>

  Example:
    npx ts-node scripts/add-conviction.ts 0x742d35Cc6634C0532925a3b844Bc454e4438f44e 0.001
*/
import { resolveOrCreateRiskTripleIdForAddress } from './helpers/resolve-triple';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/add-conviction.ts <suspect_address> <amount_in_trust>');
    console.error('Example: npx ts-node scripts/add-conviction.ts 0x742d... 0.001');
    process.exit(1);
  }

  const suspectAddress = args[0];
  const depositTrust = args[1];

  console.log('\n💰 Adding Conviction to Triple');
  console.log('  Suspect Address:', suspectAddress);
  console.log('  Deposit Amount:', depositTrust, 'TRUST');

  const result = await resolveOrCreateRiskTripleIdForAddress({
    suspectAddress,
    depositTrust
  });

  console.log('\n✅ Success!');
  console.log('  Triple ID:', '0x' + result.tripleId.toString(16).padStart(64, '0'));
  if (result.transactionHash) {
    console.log('  Transaction:', result.transactionHash);
  } else {
    console.log('  (Triple already existed, deposit added)');
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  console.error(e);
  process.exit(1);
});
