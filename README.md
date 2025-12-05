# Aegis – The Blockchain Immune System

**Aegis** is a decentralized, adaptive immune system for Web3 that replaces static blacklists with a living defense layer powered by the **Intuition Protocol**. Instead of relying on centralized authorities, Aegis uses a network of "**Antibodies**"—AI agents and human researchers—who **stake crypto-assets to flag malicious actors**, backing their accusations with financial conviction. This creates a dynamic **threat score** on the blockchain that wallets and smart contracts can read in real-time, automatically blocking transactions with low-immunity entities and neutralizing scams based on collective, evolving intelligence.

---

## 🧬 Core Concept

Every blockchain ecosystem suffers from:
- 🚨 Scammers creating new addresses
- 🎭 Contracts hiding malicious logic  
- 🏴‍☠️ DAOs infiltrated by bad actors
- 🤖 AI agents interacting with unsafe data
- 💸 Users falling into exploits, rug pulls, fake claims

**Current solutions are manual and reactive.** Aegis **fixes this at the protocol level** using:

| Mechanism | Description |
|-----------|-------------|
| **Universal Risk Graph** | Decentralized trust layer (Intuition Protocol) |
| **Staked Beliefs** | Economic skin-in-the-game for threat claims |
| **Biological Evolution** | Adaptive immunity like antibodies learning from exposure |
| **Real-time Queries** | On-chain smart contract checks + off-chain GraphQL |

This is **not a blacklist**. It's not a rating system. It's not human moderation. It's a living, adaptive immune mechanism that evolves with new data—**exactly like antibodies learning from pathogens**.

---

## 🏗️ Architecture

### Smart Contracts

#### 1. `ImmuneFirewall.sol`
**Simple, gas-efficient firewall for on-chain checks.**

```solidity
function checkImmunity(address _target) public returns (bool isSafe);
function getThreatLevel(address _target) external view returns (uint256);
```

- Reads conviction from Intuition `EthMultiVault`
- If `assets >= minStakeThreshold` → BLOCKED
- If `assets < minStakeThreshold` → SAFE
- Emits `ImmunityCheck` event for indexing

#### 2. `AdaptiveImmuneFirewall.sol`
**Production-grade firewall with multi-tier risk classification.**

```solidity
enum RiskStatus { UNREGISTERED_SAFE, SAFE, WATCH, BLOCKED }

function riskScore(address _target) public view returns (
    uint256 assets,
    uint256 shares,
    RiskStatus status,
    uint256 tripleId
);
```

**Features:**
- **Multi-tier risk**: SAFE / WATCH / BLOCKED
- **Counter-triple detection**: Reads defensive conviction (`type(uint256).max - tripleId`)
- **Net conviction**: `Malicious conviction - Defensive conviction`
- **Pausable**: Emergency circuit breaker
- **Ownable**: Admin threshold updates

---

## 🧪 Setup & Deployment

### Prerequisites
- Node.js 18+ or 20+ (LTS recommended; v25 unsupported by Hardhat)
- Private key with testnet ETH (Base Sepolia or Sepolia)
- Intuition testnet access

### Installation

```bash
cd blockchain
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
PRIVATE_KEY=your_private_key_here
INTUITION_RPC_URL=https://base-sepolia.blockpi.network/v1/rpc/public
MIN_STAKE_TRUST=0.5
INTUITION_GRAPHQL_URL=https://testnet.intuition.sh/v1/graphql
```

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy AdaptiveImmuneFirewall

```bash
npx hardhat run scripts/deploy.ts --network intuitionTestnet
```

**Output:**
```
=== Deploying Aegis AdaptiveImmuneFirewall ===
  Network: Intuition Testnet
  Chain ID: 13579
  Intuition MultiVault: 0x...
  WARN_STAKE_THRESHOLD: 0.0001 TRUST
  BLOCK_STAKE_THRESHOLD: 0.001 TRUST

✅ AdaptiveImmuneFirewall deployed at: 0xYourContractAddress
```

### Run Antibody Agent

```bash
npx ts-node scripts/antibody-agent.ts
```

### Register Threat On-Chain

```bash
npx hardhat console --network intuitionTestnet
```

```javascript
const fw = await ethers.getContractAt('AdaptiveImmuneFirewall', '0xYourContractAddress');
await fw.registerThreat('0xScammerAddress', <VAULT_ID>);
```

---

## 📊 How It Works: Step-by-Step

1. **Threat Detection** (Off-chain AI/human)
2. **Conviction Staking** (Antibody Agent creates Triple + deposits TRUST)
3. **On-Chain Registration** (AdaptiveImmuneFirewall links address → tripleId)
4. **Real-Time Immunity Check** (Wallets/Contracts query `isBlocked` or read `riskScore`)
5. **Adaptive Response** (Community stakes → conviction rises/falls)

---

## 🎯 Use Cases

| Use Case | Description |
|----------|-------------|
| **Wallet Integration** | Wallets block sends to flagged addresses |
| **DEX Protection** | Exchanges reject swaps with malicious tokens |
| **DAO Governance** | Proposals from flagged addresses require higher quorum |
| **AI Agent Safety** | Agents refuse to interact with risky contracts |
| **Cross-Chain Immunity** | Risk data bridges to L2s, sidechains |

---

## 🚀 Roadmap

- [x] Core contracts + Antibody agent
- [x] GraphQL integration
- [ ] Front-end dashboard
- [ ] ML detection agents
- [ ] Governance & economics layer
- [ ] Cross-chain deployment

---

## 📚 References

- [Intuition Documentation](https://docs.intuition.systems/)
- [Intuition SDK](https://github.com/0xIntuition/intuition-ts/tree/main/packages/sdk)
- [Intuition GraphQL API](https://testnet.intuition.sh/v1/graphql)

---

**Built with ❤️ using Hardhat, TypeScript, viem, and Intuition Protocol.**

*Aegis: The immune system blockchain deserves.*
