import { createPublicClient, http, parseAbiItem } from "viem";
import { intuitionTestnet } from "@0xintuition/protocol";
import * as dotenv from "dotenv";
import { requireEnv } from "./helpers/validate-env";

dotenv.config();

// Minimum ABI for events
const FIREWALL_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "suspect", type: "address" },
            { indexed: true, name: "tripleId", type: "uint256" },
            { indexed: true, name: "registrar", type: "address" },
            { indexed: false, name: "timestamp", type: "uint256" }
        ],
        name: "ThreatRegistered",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "suspect", type: "address" },
            { indexed: true, name: "challenger", type: "address" },
            { indexed: true, name: "counterTripleId", type: "uint256" },
            { indexed: false, name: "bond", type: "uint256" },
            { indexed: false, name: "deadline", type: "uint256" }
        ],
        name: "ThreatChallenged",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "suspect", type: "address" },
            { indexed: false, name: "confirmed", type: "bool" },
            { indexed: false, name: "winnerPayout", type: "uint256" },
            { indexed: false, name: "treasuryCut", type: "uint256" }
        ],
        name: "ThreatResolved",
        type: "event"
    }
] as const;

async function sendNotification(message: string) {
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log(" [Internal] " + message);
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message, // Slack format
                content: message // Discord format
            })
        });
        if (!response.ok) {
            console.error(`Failed to send notification: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

async function main() {
    requireEnv(['FIREWALL_ADDRESS']);
    
    const firewallAddress = process.env.FIREWALL_ADDRESS as `0x${string}`;
    const rpcUrl = process.env.INTUITION_RPC_URL || intuitionTestnet.rpcUrls.default.http[0];

    const client = createPublicClient({
        chain: intuitionTestnet,
        transport: http(rpcUrl)
    });

    console.log(`📡 Aegis Firewall Monitoring Started`);
    console.log(`   - Firewall: ${firewallAddress}`);
    console.log(`   - Network: ${intuitionTestnet.name}`);
    console.log(`   - Webhook: ${process.env.NOTIFICATION_WEBHOOK_URL ? "Configured" : "Not configured (logging only)"}`);

    // Listen for ThreatRegistered
    client.watchContractEvent({
        address: firewallAddress,
        abi: FIREWALL_ABI,
        eventName: 'ThreatRegistered',
        onLogs: (logs) => {
            for (const log of logs) {
                const { suspect, tripleId, registrar } = log.args;
                const message = `🚨 *New Threat Registered*\nSuspect: \`${suspect}\`\nTriple ID: \`${tripleId}\`\nRegistrar: \`${registrar}\``;
                console.log(message.replace(/\*/g, ''));
                sendNotification(message);
            }
        }
    });

    // Listen for ThreatChallenged
    client.watchContractEvent({
        address: firewallAddress,
        abi: FIREWALL_ABI,
        eventName: 'ThreatChallenged',
        onLogs: (logs) => {
            for (const log of logs) {
                const { suspect, challenger, counterTripleId, bond, deadline } = log.args;
                const message = `⚔️ *Threat Challenged*\nSuspect: \`${suspect}\`\nChallenger: \`${challenger}\`\nCounter Triple ID: \`${counterTripleId}\`\nBond: \`${Number(bond!) / 1e18} ETH\`\nDeadline: <t:${deadline}:R>`;
                console.log(message.replace(/\*/g, ''));
                sendNotification(message);
            }
        }
    });

    // Listen for ThreatResolved
    client.watchContractEvent({
        address: firewallAddress,
        abi: FIREWALL_ABI,
        eventName: 'ThreatResolved',
        onLogs: (logs) => {
            for (const log of logs) {
                const { suspect, confirmed, winnerPayout, treasuryCut } = log.args;
                const status = confirmed ? "✅ *Confirmed Malicious*" : "⚪ *Cleared/Dismissed*";
                const message = `🏁 *Threat Resolved*\nSuspect: \`${suspect}\`\nStatus: ${status}\nWinner Payout: \`${Number(winnerPayout!) / 1e18} ETH\`\nTreasury Cut: \`${Number(treasuryCut!) / 1e18} ETH\``;
                console.log(message.replace(/\*/g, ''));
                sendNotification(message);
            }
        }
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log("\nStopping monitor...");
        process.exit();
    });
}

main().catch(console.error);
