/*
  Create Counter-Triple for Testing
  ----------------------------------
  Creates the canonical counter-triple (maxUint256 - tripleId) to enable challenges.
  In production, defenders would naturally create these triples to stake on innocence.
  
  Usage:
    npx ts-node scripts/create-counter-triple.ts <original_triple_id>
*/
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet, getMultiVaultAddressFromChainId } from '@0xintuition/protocol';
import { createTripleStatement } from '@0xintuition/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/create-counter-triple.ts <original_triple_id>');
    process.exit(1);
  }

  const originalTripleHex = args[0] as `0x${string}`;
  const originalTripleId = BigInt(originalTripleHex);
  const counterTripleId = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') - originalTripleId;
  const counterTripleHex = '0x' + counterTripleId.toString(16).padStart(64, '0') as `0x${string}`;

  console.log('\n🔄 Creating Counter-Triple');
  console.log('  Original triple:', originalTripleHex);
  console.log('  Counter triple:', counterTripleHex);

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  const vaultAddress = getMultiVaultAddressFromChainId(intuitionTestnet.id);

  // Check if counter-triple already exists
  const isTriple = await publicClient.readContract({
    address: vaultAddress as `0x${string}`,
    abi: [{
      inputs: [{ name: 'termId', type: 'bytes32' }],
      name: 'isTriple',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function'
    }] as const,
    functionName: 'isTriple',
    args: [counterTripleHex]
  });

  if (isTriple) {
    console.log('✅ Counter-triple already exists!');
    process.exit(0);
  }

  console.log('\n⚠️  Counter-triple does not exist yet.');
  console.log('   In production, defenders create these by staking on "Not Malicious" claims.');
  console.log('   For testing, we can create an arbitrary triple with the right ID...');
  console.log('   However, Intuition triple IDs are deterministic from (subject,predicate,object).');
  console.log('   The counter ID would need to match a real triple hash.');
  console.log('\n💡 Recommended approach:');
  console.log('   1. Find the original triple\'s (subject, predicate, object)');
  console.log('   2. Create a defensive triple like [subject] -> [is] -> [Trustworthy]');
  console.log('   3. Use that triple\'s ID as the counter (if it matches)');
  console.log('\n   OR: Update contract to allow challenges without requiring counter-triple to exist.');

  console.log('\n🛠️  For now, attempting to create a minimal stake on a dummy triple...');
  console.log('   (This will likely fail or create wrong ID; kept for reference)');
  
  // Note: This won't create the exact counter ID we need; Intuition uses keccak256(subject,pred,obj)
  // Kept as placeholder to show the limitation
}

main().catch(e => { console.error(e); process.exit(1); });
