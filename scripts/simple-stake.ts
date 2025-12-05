/*
  Simple Stake Script
  -------------------
  Directly stakes on an existing triple using createTriples with the known atom IDs.
  
  Usage:
    npx ts-node scripts/simple-stake.ts
*/
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet, getMultiVaultAddressFromChainId, createTriples } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  // Triple: [0x742d35Cc6634C0532925a3b844Bc454e4438f44e] -> [is] -> [Malicious]
  // Subject atom ID for address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
  const subjectAtomId = '0x71b1c3feb37c1d936f7b9bc01e62c72a6f9a1fc6aaa0c87e3f2f0c4f62f59e5a' as `0x${string}`;
  // Predicate atom ID for "is"
  const predicateAtomId = '0xb0681668ca193e8608b43adea19fecbbe0828ef5afc941cef257d30a20564ef1' as `0x${string}`;
  // Object atom ID for "Malicious"
  const objectAtomId = '0x8e80bb80c258bf7e69c9b37bf94e974f57df26a1c598e3cd2de0e4b7f2c02f45' as `0x${string}`;
  
  const depositAmount = parseEther('0.001');

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing in .env');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ 
    chain: intuitionTestnet, 
    transport: http(rpcUrl) 
  });
  const walletClient = createWalletClient({ 
    chain: intuitionTestnet, 
    transport: http(rpcUrl), 
    account 
  });

  const vaultAddress = getMultiVaultAddressFromChainId(intuitionTestnet.id) as `0x${string}`;

  console.log('\n💰 Staking on Malicious Triple');
  console.log('  Amount:', '0.001 TRUST');
  console.log('  Atoms:');
  console.log('    Subject (address):', subjectAtomId);
  console.log('    Predicate (is):', predicateAtomId);
  console.log('    Object (Malicious):', objectAtomId);

  // Get the triple creation cost
  const tripleCost = await publicClient.readContract({
    address: vaultAddress,
    abi: [
      {
        name: 'getTripleCost',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ] as const,
    functionName: 'getTripleCost'
  });

  const totalValue = depositAmount + tripleCost;
  
  console.log('\n💵 Costs:');
  console.log('  Triple creation fee:', Number(tripleCost) / 1e18, 'ETH');
  console.log('  Deposit amount:', Number(depositAmount) / 1e18, 'ETH');
  console.log('  Total to send:', Number(totalValue) / 1e18, 'ETH');

  console.log('\n📝 Submitting transaction...');
  
  const txHash = await createTriples(
    { walletClient, publicClient, address: vaultAddress },
    {
      args: [
        [subjectAtomId],    // subjectIds
        [predicateAtomId],  // predicateIds
        [objectAtomId],     // objectIds
        [depositAmount]     // assets for each triple
      ],
      value: totalValue // total ETH to send (deposit + fees)
    }
  );

  console.log('  Transaction hash:', txHash);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('  Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

  if (receipt.status === 'success') {
    console.log('\n✅ Successfully staked 0.001 TRUST on the malicious triple!');
    console.log('   You can now check the risk score to see the BLOCKED status.');
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
