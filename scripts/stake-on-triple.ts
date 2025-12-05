/*
  Stake on Triple Script
  ----------------------
  Stakes TRUST tokens on a specific Intuition triple to increase its conviction.
  Uses the Intuition protocol's deposit function.
  
  Usage:
    npx ts-node scripts/stake-on-triple.ts <triple_id> <amount_in_trust>

  Example:
    npx ts-node scripts/stake-on-triple.ts 0x9342119eb178483ce251143cad336ec07c3438f51ac9d316101fac29bf77b002 0.001
*/
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet, getMultiVaultAddressFromChainId, MultiVaultAbi, deposit } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/stake-on-triple.ts <triple_id> <amount_in_trust>');
    console.error('Example: npx ts-node scripts/stake-on-triple.ts 0x9342... 0.001');
    process.exit(1);
  }

  const tripleId = args[0] as `0x${string}`;
  const amountStr = args[1];
  const amount = parseEther(amountStr);

  if (!tripleId.startsWith('0x') || tripleId.length !== 66) {
    throw new Error('Invalid triple ID format. Must be 0x followed by 64 hex characters.');
  }

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

  console.log('\n💰 Staking on Triple');
  console.log('  Triple ID:', tripleId);
  console.log('  Amount:', amountStr, 'TRUST');
  console.log('  Vault Address:', vaultAddress);
  console.log('  Account:', account.address);

  // Verify it's a triple
  const isTriple = await publicClient.readContract({
    address: vaultAddress,
    abi: MultiVaultAbi,
    functionName: 'isTriple',
    args: [tripleId]
  });

  if (!isTriple) {
    throw new Error(`ID ${tripleId} is not a valid triple in the vault!`);
  }

  // Check current conviction
  const [assetsBefore, sharesBefore] = await publicClient.readContract({
    address: vaultAddress,
    abi: MultiVaultAbi,
    functionName: 'getVault',
    args: [tripleId, 0n]
  });

  console.log('\n📊 Current State:');
  console.log('  Assets (conviction):', Number(assetsBefore) / 1e18, 'TRUST');
  console.log('  Shares:', Number(sharesBefore) / 1e18);

  // Use the deposit helper from protocol package
  console.log('\n📝 Submitting stake transaction...');
  
  const txHash = await deposit(
    { walletClient, publicClient, address: vaultAddress },
    {
      args: [account.address, tripleId, 0n, 0n], // receiver, termId, curveId (0), minShares (0)
      value: amount // The actual deposit amount is sent as value
    }
  );

  console.log('  Transaction hash:', txHash);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('  Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

  // Check new conviction
  const [assetsAfter, sharesAfter] = await publicClient.readContract({
    address: vaultAddress,
    abi: MultiVaultAbi,
    functionName: 'getVault',
    args: [tripleId, 0n]
  });

  console.log('\n📊 New State:');
  console.log('  Assets (conviction):', Number(assetsAfter) / 1e18, 'TRUST');
  console.log('  Shares:', Number(sharesAfter) / 1e18);
  console.log('  Increase:', Number(assetsAfter - assetsBefore) / 1e18, 'TRUST');
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
