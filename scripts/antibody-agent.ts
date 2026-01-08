import { 
    createPublicClient, 
    createWalletClient, 
    http, 
    parseEther, 
    toHex,
    Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { intuitionTestnet, getMultiVaultAddressFromChainId } from "@0xintuition/protocol";
import { 
    createAtomFromString, 
    createTripleStatement,
    calculateAtomId
} from "@0xintuition/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ABI for checking if a vault exists (has assets or shares)
const VAULT_ABI = [{
    inputs: [{ name: "vaultId", type: "uint256" }],
    name: "vaults",
    outputs: [
        { name: "assets", type: "uint256" },
        { name: "shares", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
}] as const;

async function main() {
    // 1. Setup The "Nervous System" (Clients)
    
    // Validate PRIVATE_KEY environment variable
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ ERROR: PRIVATE_KEY not found in environment variables");
        console.error("\n📋 Setup Instructions:");
        console.error("   1. Create a .env file in the AEGIS directory if it doesn't exist");
        console.error("   2. Add your private key:");
        console.error("      PRIVATE_KEY=0x<your_64_character_hex_private_key>");
        console.error("\n⚠️  SECURITY WARNING: Never commit .env files to version control!");
        process.exit(1);
    }

    // Validate PRIVATE_KEY format
    const privateKey = process.env.PRIVATE_KEY.trim();
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        console.error("❌ ERROR: PRIVATE_KEY must be a 64-character hex string prefixed with '0x'");
        console.error(`   Current length: ${privateKey.length} (expected: 66 including '0x')`);
        console.error("\n   Example format: 0x1234567890abcdef...");
        process.exit(1);
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Use custom RPC URL from .env if provided
    const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];
    console.log(`🔗 Using RPC: ${rpcUrl}`);
    
    const publicClient = createPublicClient({
        chain: intuitionTestnet,
        transport: http(rpcUrl)
    });

    const walletClient = createWalletClient({
        account,
        chain: intuitionTestnet,
        transport: http(rpcUrl)
    });

    console.log(`🛡️  Aegis Antibody Activated. Operator: ${account.address}`);
    
    // Check wallet balance
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceInEth = Number(balance) / 1e18;
    console.log(`💰 Wallet Balance: ${balanceInEth.toFixed(6)} ETH`);
    
    if (balance === 0n) {
        console.error("\n❌ ERROR: Your wallet has 0 ETH");
        console.error("📋 You need testnet ETH to:");
        console.error("   - Pay for gas fees");
        console.error("   - Pay protocol fees for creating atoms/triples");
        console.error("   - Stake on the triple");
        console.error("\n💡 Get testnet ETH from the Intuition testnet faucet");
        console.error(`   Your address: ${account.address}`);
        process.exit(1);
    }
    
    if (balanceInEth < 0.01) {
        console.warn(`\n⚠️  WARNING: Low balance (${balanceInEth.toFixed(6)} ETH)`);
        console.warn("   Recommended: At least 0.01 ETH for testing");
        console.warn("   You may encounter 'InsufficientBalance' errors\n");
    }

    // 2. Define the Pathogen (The Scammer)
    const pathogenAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Example Bad Actor
    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionTestnet.id);

    console.log(`\n🦠 Targeting Pathogen: ${pathogenAddress}`);


    // Helper to get or create an Atom
    const ensureAtom = async (label: string) => {
        // A. Calculate the ID
        const atomId = calculateAtomId(toHex(label));
        
        // B. Check if it exists on-chain (SAFELY)
        try {
            const [assets, shares] = await publicClient.readContract({
                address: multiVaultAddress,
                abi: VAULT_ABI,
                functionName: "vaults",
                args: [BigInt(atomId)]
            });

            if (shares > 0n) {
                console.log(`   - Found existing Atom: "${label}" (${atomId})`);
                return atomId;
            }
        } catch (e) {
            // If the contract reverts, it likely means the Atom doesn't exist yet.
            // We ignore the error and proceed to creation.
            console.log(`   - Atom "${label}" not found (New ID). Proceeding to create...`);
        }

        // C. If not found (or check failed), create it
        console.log(`   - Creating new Atom: "${label}"...`);
        try {
            // createAtomFromString needs a deposit amount to pay protocol fees
            // Use a minimal deposit amount (0.0001 ETH)
            const depositAmount = parseEther("0.0001");
            
            const tx = await createAtomFromString(
                { walletClient, publicClient, address: multiVaultAddress },
                label,
                depositAmount  // Add deposit to cover atom creation fees
            );
            
            // Handle return type variations
            const newId = (tx.state as any).termId || (tx.state as any).vaultId;
            console.log(`     > Created! ID: ${newId} (tx: ${tx.transactionHash})`);
            return newId;
        } catch (creationError: any) {
            console.error(`     > Creation failed: ${creationError.message || creationError}`);
            // If it's an "already exists" error, that's okay - return calculated ID
            if (creationError.message?.includes('AtomExists') || creationError.message?.includes('already exists')) {
                console.log(`     > Atom already exists. Using calculated ID.`);
                return atomId;
            }
            // Otherwise, throw the error
            throw creationError;
        }
    };

    console.log("⚗️  Synthesizing Atoms...");
    
    // Create the 3 Atoms
    // Note: We don't need to hex encode here, the function does it internally for the check
    const subjectId = await ensureAtom(pathogenAddress);
    const predicateId = await ensureAtom("is");
    const objectId = await ensureAtom("Malicious");

    // 4. The Sting (Create Triple & Stake)
    console.log("\n💉 Injecting 'Malicious' Signal into the Knowledge Graph...");
    
    // Query the actual cost to create a triple
    console.log("   - Querying triple creation cost...");
    const tripleCost = await publicClient.readContract({
        address: multiVaultAddress,
        abi: [{
            inputs: [],
            name: "getTripleCost",
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
            type: "function"
        }] as const,
        functionName: "getTripleCost"
    });
    console.log(`   - Triple protocol fee: ${Number(tripleCost) / 1e18} ETH`);

    // Helper to normalize returned ids (termIds) to bytes32 Hex strings
    const toBytes32 = (id: any): Hex => {
        if (typeof id === 'string') {
            if (id.startsWith('0x') && id.length === 66) return id as Hex;
            // attempt decimal -> hex32
            try {
                const bi = BigInt(id);
                return (`0x${bi.toString(16).padStart(64, '0')}`) as Hex;
            } catch {}
        }
        if (typeof id === 'bigint') {
            return (`0x${id.toString(16).padStart(64, '0')}`) as Hex;
        }
        if (typeof id === 'number') {
            return (`0x${id.toString(16).padStart(64, '0')}`) as Hex;
        }
        throw new Error(`Cannot convert id to bytes32: ${id}`);
    };

    try {
    // Desired stake to influence firewall classification.
    // NOTE: AdaptiveImmuneFirewall BLOCK_STAKE_THRESHOLD is 0.001 TRUST (0.001 ETH in our test setup).
    // Use a stake at-or-above that threshold to push a suspect to BLOCKED.
    // Increase the stake to slightly above the BLOCK threshold and add a small buffer.
    const stakeAmount = parseEther("0.0012"); // 0.0012 ETH (slightly above 0.001)

    // Add a tiny buffer to avoid precise-fee reverts from on-chain checks (in wei).
    const feeBuffer = 1000000000000n; // 1e12 wei = 0.000001 ETH

    // Ensure bigint arithmetic: tripleCost is returned as bigint from the RPC.
    const totalRequired = stakeAmount + BigInt(tripleCost) + feeBuffer; // stake + triple protocol fee + buffer

        // Pre-flight balance check (gas not included; user should have small buffer)
        if (balance < totalRequired) {
            console.error("\n❌ ERROR: Insufficient balance for triple creation");
            console.error(`   Needed (stake + tripleCost): ${(Number(totalRequired)/1e18).toFixed(6)} ETH`);
            console.error(`   Available: ${(Number(balance)/1e18).toFixed(6)} ETH`);
            console.error("   ACTION: Fund wallet or reduce stakeAmount");
            return;
        }

        console.log(`   - Staking: ${(Number(stakeAmount) / 1e18).toFixed(6)} ETH on triple (aiming for BLOCKED)`);
        console.log(`   - Triple protocol fee: ${(Number(tripleCost) / 1e18).toFixed(6)} ETH`);
        console.log(`   - Total send (value): ${(Number(totalRequired) / 1e18).toFixed(6)} ETH`);

        const triple = await createTripleStatement(
            { walletClient, publicClient, address: multiVaultAddress },
            {
                // createTripleStatement expects parallel arrays for a batch; we pass single-element arrays
                args: [
                    [toBytes32(subjectId)],
                    [toBytes32(predicateId)],
                    [toBytes32(objectId)],
                    [stakeAmount]
                ] as any,
                // IMPORTANT: value must be stakeAmount + tripleCost, otherwise contract reverts with InsufficientBalance
                value: totalRequired,
            }
        );

        console.log(`\n✅ Signal Injected Successfully!`);
        console.log(`   - Transaction Hash: ${triple.transactionHash}`);
        
    // TripleCreated event returns array of events; parser returns events list
    // Our sdk wrapper returns event args as 'state'. For triple creation it's a single event.
    const tripleEventArgs = (Array.isArray(triple.state) ? triple.state[0].args : (triple.state as any).args) || (triple.state as any);
    const tripleVaultId = (tripleEventArgs as any).termId || (tripleEventArgs as any).vaultId || (tripleEventArgs as any).tripleId;
    console.log(`   - Triple Vault (termId) ID: ${tripleVaultId}`);
        
    console.log(`\n⚠️  NEXT: Call 'registerThreat' on AdaptiveImmuneFirewall to activate classification`);
    console.log(`   - Suspect: ${pathogenAddress}`);
    console.log(`   - Triple ID: ${tripleVaultId}`);
    console.log("   - Suggested bond (min): 0.0001 ETH (check contract 'minBond')");
    console.log("   - After registration, net conviction >= BLOCK threshold should mark address BLOCKED unless counter-triple exists.");

    } catch (error) {
        console.error("❌ Injection Failed:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});