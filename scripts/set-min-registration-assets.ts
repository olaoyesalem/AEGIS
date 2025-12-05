/*
  Set Min Registration Assets
  ----------------------------
  Admin setter to adjust minRegistrationAssets threshold.
  
  Usage:
    npx ts-node scripts/set-min-registration-assets.ts <value_in_eth>
  
  Example (set to 0 to allow any triple):
    npx ts-node scripts/set-min-registration-assets.ts 0
*/
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import * as dotenv from 'dotenv';
dotenv.config();

const FIREWALL_ABI = [
  {
    inputs: [ { name: '_newMin', type: 'uint256' } ],
    name: 'setMinRegistrationAssets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'minRegistrationAssets',
    outputs: [ { name: '', type: 'uint256' } ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx ts-node scripts/set-min-registration-assets.ts <value_in_eth>');
    console.error('Example: npx ts-node scripts/set-min-registration-assets.ts 0');
    process.exit(1);
  }

  const valueEth = args[0];
  const valueWei = parseEther(valueEth);

  const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
  if (!firewallAddress) throw new Error('FIREWALL_ADDRESS missing');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(pk as `0x${string}`);

  const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
  const publicClient = createPublicClient({ chain: intuitionTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain: intuitionTestnet, transport: http(rpcUrl), account });

  console.log('🔧 Setting minRegistrationAssets...');
  console.log('  Firewall:', firewallAddress);
  console.log('  New value:', valueEth, 'ETH');

  // Read current
  const current = await publicClient.readContract({
    address: firewallAddress,
    abi: FIREWALL_ABI,
    functionName: 'minRegistrationAssets'
  });
  console.log('  Current:', Number(current) / 1e18, 'ETH');

  // Note: setting to 0 will revert with InvalidMinRegistrationAssets; use a tiny value like 1 wei instead
  if (valueWei === 0n) {
    console.log('⚠️  Setting to exactly 0 will revert; using 1 wei instead.');
    const adjustedValue = 1n;
    const { request } = await publicClient.simulateContract({
      account,
      address: firewallAddress,
      abi: FIREWALL_ABI,
      functionName: 'setMinRegistrationAssets',
      args: [adjustedValue]
    });
    const hash = await walletClient.writeContract(request);
    console.log('  Tx:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('  Status:', receipt.status);
    console.log('✅ minRegistrationAssets set to 1 wei (effectively 0)');
  } else {
    const { request } = await publicClient.simulateContract({
      account,
      address: firewallAddress,
      abi: FIREWALL_ABI,
      functionName: 'setMinRegistrationAssets',
      args: [valueWei]
    });
    const hash = await walletClient.writeContract(request);
    console.log('  Tx:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('  Status:', receipt.status);
    console.log('✅ minRegistrationAssets updated');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
