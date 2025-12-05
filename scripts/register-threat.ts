/*
  Register Threat Script
  ----------------------
  Directly calls ImmuneFirewall.registerThreat() with an existing triple ID.
  
  Usage:
    npx ts-node scripts/register-threat.ts <suspect_address> <triple_id>
    
  Example:
    npx ts-node scripts/register-threat.ts 0x742d35Cc6634C0532925a3b844Bc454e4438f44e 0x9342119eb178483ce251143cad336ec07c3438f51ac9d316101fac29bf77b002
*/

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { intuitionTestnet } from "@0xintuition/protocol";
import * as dotenv from "dotenv";

dotenv.config();

// ImmuneFirewall ABI (expanded for economic layer)
const FIREWALL_ABI = [
    {
        inputs: [
            { name: "suspect", type: "address" },
            { name: "tripleId", type: "uint256" }
        ],
        name: "registerThreat",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            { name: "suspect", type: "address" },
            { name: "counterTripleId", type: "uint256" }
        ],
        name: "challengeThreat",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [ { name: "suspect", type: "address" } ],
        name: "resolveThreat",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    { inputs: [], name: "minBond", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "challengeBondMultiplierBp", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "winnerRewardBp", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [ { name: "_target", type: "address" } ], name: "getDispute", outputs: [
            { name: "challengeDeadline", type: "uint256" },
            { name: "challenger", type: "address" },
            { name: "counterTripleId", type: "uint256" },
            { name: "registrarBond", type: "uint256" },
            { name: "challengerBond", type: "uint256" }
        ], stateMutability: "view", type: "function" }
] as const;

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("❌ ERROR: Missing required arguments");
        console.error("\nUsage:");
        console.error("  npx ts-node scripts/register-threat.ts <suspect_address> <triple_id>");
        console.error("\nExample:");
        console.error("  npx ts-node scripts/register-threat.ts 0x742d35Cc6634C0532925a3b844Bc454e4438f44e 0x9342119eb178483ce251143cad336ec07c3438f51ac9d316101fac29bf77b002");
        process.exit(1);
    }

    const suspectAddress = args[0] as `0x${string}`;
    const tripleIdHex = args[1];
    
    // Validate addresses
    if (!suspectAddress.startsWith('0x') || suspectAddress.length !== 42) {
        console.error("❌ ERROR: Invalid suspect address format");
        process.exit(1);
    }

    // Get firewall address from env
    const firewallAddress = process.env.FIREWALL_ADDRESS;
    if (!firewallAddress) {
        console.error("❌ ERROR: FIREWALL_ADDRESS not found in .env");
        console.error("   Please add: FIREWALL_ADDRESS=0x...");
        process.exit(1);
    }

    // Validate PRIVATE_KEY
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ ERROR: PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const privateKey = process.env.PRIVATE_KEY.trim();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Use custom RPC URL from .env if provided
    const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
    
    const publicClient = createPublicClient({
        chain: intuitionTestnet,
        transport: http(rpcUrl)
    });

    const walletClient = createWalletClient({
        account,
        chain: intuitionTestnet,
        transport: http(rpcUrl)
    });

    console.log(`🛡️  Aegis Threat Registration`);
    console.log(`   - Firewall: ${firewallAddress}`);
    console.log(`   - Operator: ${account.address}`);
    console.log(`   - Suspect: ${suspectAddress}`);
    console.log(`   - Triple ID: ${tripleIdHex}`);

    // Convert hex triple ID to BigInt
    const tripleId = BigInt(tripleIdHex);

    console.log("\n📝 Preparing registerThreat (payable)...");
    
    try {
            // Debug: Check if triple exists and has enough assets
            console.log("   - Checking triple validity...");
        
                const vaultAddress = "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91" as `0x${string}`; // MultiVault
        
            // Check isTriple
            const isTripleResult = await publicClient.readContract({
                    address: vaultAddress,
                abi: [{
                    inputs: [{ name: "termId", type: "bytes32" }],
                    name: "isTriple",
                    outputs: [{ name: "", type: "bool" }],
                    stateMutability: "view",
                    type: "function"
                }] as const,
                functionName: "isTriple",
                args: [tripleIdHex as `0x${string}`]
            });
            console.log(`   - isTriple: ${isTripleResult}`);
        
            // Check assets in vault (bytes32 termId, curveId = 0)
            const [assets, shares] = await publicClient.readContract({
                address: vaultAddress,
                abi: [{
                    inputs: [
                        { name: "termId", type: "bytes32" },
                        { name: "curveId", type: "uint256" }
                    ],
                    name: "getVault",
                    outputs: [
                        { name: "", type: "uint256" },
                        { name: "", type: "uint256" }
                    ],
                    stateMutability: "view",
                    type: "function"
                }] as const,
                functionName: "getVault",
                args: [tripleIdHex as `0x${string}`, 0n]
            });
            console.log(`   - Triple assets: ${Number(assets) / 1e18} ETH`);
            console.log(`   - Triple shares: ${shares}`);
        
                        // Read minRegistrationAssets & minBond
                        const [minAssets, minBond, multiplierBp] = await Promise.all([
                            publicClient.readContract({
                                address: firewallAddress as `0x${string}`,
                                abi: [{ inputs: [], name: "minRegistrationAssets", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const,
                                functionName: "minRegistrationAssets"
                            }),
                            publicClient.readContract({
                                address: firewallAddress as `0x${string}`,
                                abi: FIREWALL_ABI,
                                functionName: "minBond"
                            }),
                            publicClient.readContract({
                                address: firewallAddress as `0x${string}`,
                                abi: FIREWALL_ABI,
                                functionName: "challengeBondMultiplierBp"
                            })
                        ]);
                        console.log(`   - Min required conviction assets: ${Number(minAssets) / 1e18} ETH`);
                        console.log(`   - Current minBond: ${Number(minBond) / 1e18} ETH`);
                        console.log(`   - Challenge bond multiplier (bp): ${multiplierBp}`);
        
        // Simulate the transaction first
                // Include bond value (minBond) in simulation
                const minBondValue = await publicClient.readContract({
                    address: firewallAddress as `0x${string}`,
                    abi: FIREWALL_ABI,
                    functionName: "minBond"
                });
                console.log(`   - Sending bond value: ${Number(minBondValue) / 1e18} ETH`);
                const { request } = await publicClient.simulateContract({
                    account,
                    address: firewallAddress as `0x${string}`,
                    abi: FIREWALL_ABI,
                    functionName: "registerThreat",
                    args: [suspectAddress, tripleId],
                    value: minBondValue
                });

        // Execute the transaction
    const hash = await walletClient.writeContract(request);
        console.log(`   - Transaction submitted: ${hash}`);
        
        // Wait for confirmation
        console.log("   - Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log(`\n✅ Threat Registered Successfully!`);
            console.log(`   - Block: ${receipt.blockNumber}`);
            console.log(`   - Gas Used: ${receipt.gasUsed}`);
            console.log(`\n🛡️  ${suspectAddress} is now tracked by the firewall`);
        } else {
            console.error("\n❌ Transaction failed");
        }
    } catch (error: any) {
        console.error("\n❌ Registration Failed:", error.message || error);
        if (error.message?.includes('AlreadyRegistered')) {
            console.log("\n💡 This threat is already registered in the firewall");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
