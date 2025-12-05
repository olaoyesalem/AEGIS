# @aegis/sdk

> TypeScript SDK for Aegis - The Blockchain Immune System

[![npm version](https://badge.fury.io/js/@aegis%2Fsdk.svg)](https://www.npmjs.com/package/@aegis/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The Aegis SDK provides a comprehensive TypeScript interface for interacting with the Aegis decentralized threat detection protocol. It enables developers to integrate blockchain security features directly into their applications, wallets, and DeFi protocols.

## 🌟 Features

- **Risk Assessment**: Check immunity scores and threat levels for any address
- **Threat Management**: Register, challenge, and resolve threats on-chain
- **Antibody Creation**: Create and stake on threat triples using Intuition Protocol
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modular**: Use only the components you need
- **Battle-Tested**: Built on viem and Intuition SDK

## 📦 Installation

```bash
npm install @aegis/sdk viem
# or
yarn add @aegis/sdk viem
# or
pnpm add @aegis/sdk viem
```

## 🚀 Quick Start

### Read-Only Usage (Risk Checking)

```typescript
import { AegisClient } from '@aegis/sdk';
import { createPublicClient, http } from 'viem';
import { intuitionTestnet } from '@0xintuition/protocol';

// Create a public client (read-only)
const publicClient = createPublicClient({
  chain: intuitionTestnet,
  transport: http(),
});

// Initialize Aegis client
const aegis = new AegisClient({
  publicClient,
  firewallAddress: '0xYourFirewallAddress',
  multiVaultAddress: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5',
});

// Check if an address is blocked
const isBlocked = await aegis.riskScorer.isBlocked('0xSuspectAddress');
console.log('Address is blocked:', isBlocked);

// Get detailed risk score
const riskScore = await aegis.riskScorer.getRiskScore('0xSuspectAddress');
console.log('Risk Status:', aegis.riskScorer.getRiskStatusLabel(riskScore.status));
console.log('Net Conviction:', riskScore.netConviction.toString());

// Get immunity score (0-10000, higher is better)
const immunityScore = await aegis.riskScorer.getImmunityScore('0xSuspectAddress');
console.log('Immunity Score:', immunityScore / 100, '%');
```

### Full Usage (with Wallet)

```typescript
import { AegisClient } from '@aegis/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';

const account = privateKeyToAccount('0xYourPrivateKey');

const publicClient = createPublicClient({
  chain: intuitionTestnet,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: intuitionTestnet,
  transport: http(),
});

const aegis = new AegisClient({
  publicClient,
  walletClient,
  firewallAddress: '0xYourFirewallAddress',
  multiVaultAddress: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5',
});

// Now you can use all features
if (aegis.canWrite) {
  // Create a threat triple and stake on it
  const result = await aegis.antibodyAgent!.createThreatTriple({
    targetAddress: '0xMaliciousAddress',
    threatLabel: 'Scammer',
    stakeAmount: parseEther('0.01'),
  });

  console.log('Threat triple created:', result.tripleId);

  // Register the threat on-chain
  const minBond = await aegis.threatManager!.getMinimumBond();
  const registration = await aegis.threatManager!.registerThreat({
    suspect: '0xMaliciousAddress',
    tripleId: result.tripleId,
    bond: minBond,
  });

  console.log('Threat registered:', registration.transactionHash);
}
```

## 📚 API Reference

### AegisClient

The main entry point for the SDK.

```typescript
const aegis = new AegisClient(config: AegisConfig);
```

**Config Options:**
- `publicClient`: viem PublicClient (required)
- `walletClient`: viem WalletClient (optional, needed for write operations)
- `firewallAddress`: Address of the deployed AdaptiveImmuneFirewall contract
- `multiVaultAddress`: Address of the Intuition MultiVault contract
- `graphqlUrl`: GraphQL endpoint for Intuition (optional)

**Properties:**
- `riskScorer`: RiskScorer instance (always available)
- `threatManager`: ThreatManager instance (null if no wallet)
- `antibodyAgent`: AntibodyAgent instance (null if no wallet)
- `canWrite`: boolean indicating if write operations are available

### RiskScorer

Module for querying risk information (read-only).

#### Methods

**`async getRiskScore(target: Address): Promise<RiskScoreResult>`**

Get comprehensive risk information for an address.

```typescript
const score = await aegis.riskScorer.getRiskScore('0xAddress');
// Returns: { assets, shares, status, tripleId, netConviction, counterConviction }
```

**`async isBlocked(target: Address): Promise<boolean>`**

Quick check if an address is blocked.

```typescript
const blocked = await aegis.riskScorer.isBlocked('0xAddress');
```

**`async getImmunityScore(target: Address): Promise<number>`**

Get immunity score in basis points (0-10000, higher = safer).

```typescript
const score = await aegis.riskScorer.getImmunityScore('0xAddress');
console.log(`${score / 100}% safe`);
```

**`async getThreatIntel(target: Address): Promise<ThreatIntelligence>`**

Get full threat intelligence including dispute information.

```typescript
const intel = await aegis.riskScorer.getThreatIntel('0xAddress');
// Returns: tripleId, registeredAt, registrar, conviction, counterConviction,
//          status, bond, challengeDeadline, challenger, counterTripleId, challengerBond
```

**`async getFirewallParameters(): Promise<FirewallParameters>`**

Get current firewall configuration.

```typescript
const params = await aegis.riskScorer.getFirewallParameters();
// Returns: warnThreshold, blockThreshold, minBond, challengeWindow, etc.
```

**`async batchCheckRisk(targets: Address[]): Promise<Map<Address, RiskScoreResult>>`**

Check multiple addresses at once.

```typescript
const results = await aegis.riskScorer.batchCheckRisk([
  '0xAddress1',
  '0xAddress2',
  '0xAddress3',
]);
```

**`getRiskStatusLabel(status: RiskStatus): string`**

Convert risk status enum to human-readable string.

```typescript
const label = aegis.riskScorer.getRiskStatusLabel(RiskStatus.BLOCKED);
// Returns: "Blocked"
```

### ThreatManager

Module for registering, challenging, and resolving threats (requires wallet).

#### Methods

**`async registerThreat(options: RegisterThreatOptions): Promise<{ transactionHash, event }>`**

Register a threat on-chain.

```typescript
const result = await aegis.threatManager.registerThreat({
  suspect: '0xMaliciousAddress',
  tripleId: 123456n,
  bond: parseEther('0.001'),
});
```

**`async challengeThreat(options: ChallengeThreatOptions): Promise<{ transactionHash, event }>`**

Challenge an existing threat registration.

```typescript
const result = await aegis.threatManager.challengeThreat({
  suspect: '0xAddress',
  counterTripleId: calculateCounterTripleId(originalTripleId),
  bond: parseEther('0.0015'), // Must be >= challengeBondMultiplier * registrar bond
});
```

**`async resolveThreat(suspect: Address): Promise<{ transactionHash, event }>`**

Resolve a threat after the challenge window expires.

```typescript
const result = await aegis.threatManager.resolveThreat('0xAddress');
```

**`async calculateChallengeBond(suspect: Address): Promise<bigint>`**

Calculate the required bond to challenge a threat.

```typescript
const requiredBond = await aegis.threatManager.calculateChallengeBond('0xAddress');
```

**`async getMinimumBond(): Promise<bigint>`**

Get the minimum bond required for threat registration.

```typescript
const minBond = await aegis.threatManager.getMinimumBond();
```

### AntibodyAgent

Module for creating threat triples and staking (requires wallet).

#### Methods

**`async createThreatTriple(options: CreateThreatTripleOptions): Promise<CreateThreatTripleResult>`**

Create a new threat triple on Intuition and stake on it.

```typescript
const result = await aegis.antibodyAgent.createThreatTriple({
  targetAddress: '0xMaliciousAddress',
  threatLabel: 'Scammer', // Optional, defaults to 'Malicious'
  stakeAmount: parseEther('0.01'),
});

// Returns: { transactionHash, tripleId, subjectId, predicateId, objectId }
```

**`async getTripleCost(): Promise<bigint>`**

Get the protocol fee for creating a triple.

```typescript
const cost = await aegis.antibodyAgent.getTripleCost();
```

**`async getVaultInfo(vaultId: bigint): Promise<VaultInfo>`**

Get assets and shares for a vault.

```typescript
const info = await aegis.antibodyAgent.getVaultInfo(123456n);
// Returns: { assets, shares }
```

## 🎯 Use Cases

### 1. Wallet Integration

Prevent users from sending funds to flagged addresses:

```typescript
async function canSendTo(address: Address): Promise<boolean> {
  const blocked = await aegis.riskScorer.isBlocked(address);
  if (blocked) {
    showWarning('This address has been flagged as malicious');
    return false;
  }
  return true;
}
```

### 2. DEX Protection

Block trades with suspicious tokens:

```typescript
async function validateTrade(tokenAddress: Address) {
  const risk = await aegis.riskScorer.getRiskScore(tokenAddress);
  
  if (risk.status === RiskStatus.BLOCKED) {
    throw new Error('Cannot trade with blocked token');
  }
  
  if (risk.status === RiskStatus.WATCH) {
    showWarning('This token is under watch. Proceed with caution.');
  }
}
```

### 3. DAO Governance

Require higher quorum for proposals from flagged addresses:

```typescript
async function getRequiredQuorum(proposer: Address): Promise<number> {
  const immunityScore = await aegis.riskScorer.getImmunityScore(proposer);
  
  // Lower immunity = higher quorum required
  const baseQuorum = 51;
  const penaltyQuorum = 75;
  
  return immunityScore < 5000 ? penaltyQuorum : baseQuorum;
}
```

### 4. AI Agent Safety

Prevent AI agents from interacting with risky contracts:

```typescript
async function shouldInteract(contractAddress: Address): Promise<boolean> {
  const intel = await aegis.riskScorer.getThreatIntel(contractAddress);
  
  return intel.status === RiskStatus.UNREGISTERED_SAFE || 
         intel.status === RiskStatus.SAFE;
}
```

## 🛠️ Utilities

### Calculate Counter-Triple ID

```typescript
import { calculateCounterTripleId } from '@aegis/sdk';

const counterTripleId = calculateCounterTripleId(originalTripleId);
```

### Format Values

```typescript
import { formatEther, formatBasisPoints, formatTimestamp } from '@aegis/sdk';

const ethValue = formatEther(weiAmount, 4); // "0.0123 ETH"
const percentage = formatBasisPoints(7500n); // "75.00%"
const date = formatTimestamp(timestamp); // ISO date string
```

### Time Utilities

```typescript
import { timeUntilDeadline } from '@aegis/sdk';

const info = timeUntilDeadline(challengeDeadline);
console.log(info.formatted); // "2h 30m 15s"
console.log(info.expired); // false
```

## 📝 TypeScript Types

The SDK is fully typed. Key types include:

```typescript
// Risk Status
enum RiskStatus {
  UNREGISTERED_SAFE = 0,
  SAFE = 1,
  WATCH = 2,
  BLOCKED = 3,
}

// Risk Score Result
interface RiskScoreResult {
  assets: bigint;
  shares: bigint;
  status: RiskStatus;
  tripleId: bigint;
  netConviction: bigint;
  counterConviction: bigint;
}

// Threat Intelligence
interface ThreatIntelligence {
  tripleId: bigint;
  registeredAt: bigint;
  registrar: Address;
  conviction: bigint;
  counterConviction: bigint;
  status: RiskStatus;
  bond: bigint;
  challengeDeadline: bigint;
  challenger: Address;
  counterTripleId: bigint;
  challengerBond: bigint;
}
```

## 🔧 Advanced Usage

### Custom GraphQL Queries

```typescript
import { TRIPLE_QUERY, POSITIONS_QUERY } from '@aegis/sdk';
import { request } from 'graphql-request';

const data = await request(
  'https://testnet.intuition.sh/v1/graphql',
  TRIPLE_QUERY,
  { id: tripleId }
);
```

### Batch Operations

```typescript
// Check multiple addresses in parallel
const addresses = ['0xAddr1', '0xAddr2', '0xAddr3'];
const results = await aegis.riskScorer.batchCheckRisk(addresses);

for (const [address, score] of results) {
  console.log(`${address}: ${score.status}`);
}
```

### Event Monitoring

```typescript
// Watch for threat registrations
publicClient.watchContractEvent({
  address: firewallAddress,
  abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
  eventName: 'ThreatRegistered',
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('New threat:', log.args);
    });
  },
});
```

## 🧪 Testing

```bash
# Coming soon
npm test
```

## 📄 License

MIT © Aegis Team

## 🤝 Contributing

Contributions are welcome! Please see our contributing guidelines.

## 🔗 Links

- [Documentation](https://github.com/aegis/docs)
- [Intuition Protocol](https://docs.intuition.systems/)
- [GitHub](https://github.com/aegis/sdk)
- [Discord](https://discord.gg/aegis)

## 💡 Support

- [Documentation](https://docs.aegis.xyz)
- [Discord Community](https://discord.gg/aegis)
- [GitHub Issues](https://github.com/aegis/sdk/issues)

---

**Built with ❤️ using viem, TypeScript, and Intuition Protocol**
