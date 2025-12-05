# AEGIS Tokenomics & Incentive Design

## Overview
AEGIS token serves as the governance and incentive layer for the Adaptive Immune Firewall. It aligns economic incentives with accurate threat classification and long-term protocol health.

---

## Core Token Utility

### 1. **Fee Capture & Revenue Sharing**
- **Registration/Challenge Fees**: A portion of native bonds (or future protocol fees) can be captured in AEGIS or converted to AEGIS via buy-and-burn or direct distribution.
- **Treasury Accumulation**: 10% of losing bonds flow to treasury; treasury can stake AEGIS or distribute to stakers/LPs.

### 2. **Staking for Conviction Weighting**
- **Reputation Multiplier**: Stakers lock AEGIS to gain higher weight when their convictions (triple stakes) are considered by the firewall.
- **Time-Weighted Rewards**: Longer staking duration → higher multiplier for conviction votes and higher AEGIS emission rewards.

### 3. **Governance**
- **Parameter Tuning**: AEGIS holders vote on:
  - `minBond`, `challengeWindow`, `challengeBondMultiplierBp`, `winnerRewardBp`
  - `volatilityThresholdBp`, `volatilityExtension`
  - `minRegistrationAssets`, thresholds (WARN/BLOCK)
- **Treasury Allocation**: Direct treasury funds to security audits, bug bounties, liquidity incentives.

### 4. **Slashing & Accountability**
- **Malicious Curator Slashing**: If a curator repeatedly registers false threats or challenges honest registrations, governance can slash their staked AEGIS.
- **Bond Forfeiture in AEGIS**: Optionally require bonds to include AEGIS (hybrid native + AEGIS), with slashed AEGIS burned or redistributed.

---

## Emission & Distribution

### Emissions Schedule
- **Fixed Supply**: 100M AEGIS (example cap).
- **Emissions Curve**: Linear decay over 5 years; emissions directed to:
  1. **Correct Registrars** (30%): Addresses whose threat registrations are not successfully challenged or whose challenges win.
  2. **Long-Term Conviction Stakers** (40%): Users who maintain conviction on accurate triples (verified via resolution outcomes).
  3. **Liquidity Providers** (20%): AEGIS/ETH LP incentives to ensure deep liquidity for bond conversions.
  4. **Treasury** (10%): Reserve for grants, partnerships, security.

### Time-Weighted Conviction Rewards
- **TWAP Conviction**: Track conviction (TRUST staked on triples) over rolling windows (e.g., 30 days).
- **Reward Formula**:  
  ```
  reward = baseEmission * (userConviction / totalConviction) * timeLockMultiplier
  ```
- **Time-Lock Multiplier**:
  - < 1 month: 1x
  - 1-3 months: 1.5x
  - 3-6 months: 2x
  - 6+ months: 3x

### Reputation NFTs (Optional)
- **Curator Badges**: Non-transferable NFTs minted to curators with consistent accuracy (e.g., 10+ correct registrations, 0 slashes).
- **Perks**: Lower bond requirements, higher emission multipliers, governance voting power boost.

---

## Sinks & Deflationary Mechanisms

### 1. **Bond Burns**
- Optionally burn a % of forfeited AEGIS bonds instead of redistributing 100%.
- **Example**: 50% of slashed AEGIS is burned; 50% goes to treasury.

### 2. **Registration Fee Burns**
- Introduce a small AEGIS fee (e.g., 10 AEGIS) per registration that is burned immediately.

### 3. **Challenge Escalation**
- Each subsequent challenge on the same suspect increases required AEGIS bond exponentially, with excess burned.

### 4. **Conviction Lock Penalty**
- Early unstaking from conviction (before resolution) incurs a 10% burn penalty on staked AEGIS.

---

## Overcoming Game-Theoretic Attacks

### Attack Vector: Whale Manipulation
**Mitigation via Tokenomics**:
- **Quadratic Weighting**: Conviction influence scales with sqrt(staked AEGIS), reducing marginal power of large holders.
- **Reputation Gating**: High-stakes decisions (e.g., parameter changes) require reputation NFTs + AEGIS stake.
- **Time Locks**: Whales cannot dump immediately after influencing a vote; minimum lock periods apply.

### Attack Vector: Sybil/Spam
**Mitigation**:
- **Progressive Bonding**: Each additional registration from the same address within 24h requires 2x AEGIS bond.
- **Proof-of-Human Gating**: Integrate with Worldcoin, Gitcoin Passport, or similar for human-verified curator status (lower bonds, higher rewards).

### Attack Vector: Collusion (Registrar + Challenger)
**Mitigation**:
- **Asymmetric Rewards**: Winner gets <90% of loser's bond; remainder burned or sent to uninvolved curators via lottery.
- **Random Audits**: A random subset of resolutions (5%) is reviewed by DAO; collusion detected = full slash + ban.

### Attack Vector: Bribery
**Mitigation**:
- **Conviction Commitment**: Once conviction is staked, it cannot be moved until resolution + cool-down; bribes cannot be honored instantly.
- **Anonymous Staking**: Optionally allow zero-knowledge conviction staking (zk-SNARKs) so bribers cannot verify compliance.

---

## Phased Rollout

### Phase 1: Foundation (Current)
- ✅ Bond-and-challenge with native currency
- ✅ TWAP resolution
- ✅ Volatility-based extensions
- **Next**: Deploy AEGIS token (ERC-20) with simple staking contract.

### Phase 2: Incentive Layer (Q1 2026)
- Emissions begin: rewards for correct registrars and long-term conviction.
- Treasury accumulation from bond forfeitures.
- Governance DAO launch (Snapshot or on-chain voting).

### Phase 3: Advanced Game Theory (Q2 2026)
- Quadratic weighting for conviction.
- Reputation NFTs and curator badges.
- Proof-of-human integration.

### Phase 4: Cross-Chain & Ecosystem (Q3+ 2026)
- AEGIS multi-chain deployment (Base, Arbitrum, etc.).
- Firewall-as-a-Service for other protocols (licensing fees paid in AEGIS).
- Integration with broader DeFi risk oracles (e.g., Gauntlet, Chaos Labs).

---

## Summary Table

| Component | Mechanism | Attack Mitigation |
|-----------|-----------|-------------------|
| **AEGIS Staking** | Lock AEGIS for conviction weight + emissions | Reduces mercenary behavior via time-locks |
| **Emissions** | Time-weighted, outcome-based rewards | Aligns long-term accuracy over short-term gaming |
| **Burns** | Slash forfeitures, registration fees | Deflationary pressure; raises cost of spam |
| **Quadratic Weighting** | sqrt(stake) influence | Limits whale dominance |
| **Reputation NFTs** | Earned via accuracy history | Sybil resistance; incentivizes quality over quantity |
| **Treasury Governance** | DAO votes on params & allocations | Decentralizes control; prevents admin capture |
| **Proof-of-Human** | Optional for lower bonds/higher rewards | Blocks bot farms and Sybil attacks |

---

## Next Steps (Implementation)

1. **Deploy AEGIS ERC-20** with fixed supply (100M).
2. **Staking Contract**: Lock AEGIS, track time-weighted balances, distribute emissions.
3. **Governance Module**: Snapshot integration or on-chain governor for param votes.
4. **Reputation System**: NFT minting on milestones (10/50/100 correct registrations).
5. **Fee Router**: Capture % of native bonds as AEGIS buy-and-burn or direct AEGIS fees.
6. **Analytics Dashboard**: Track emissions, burns, staker APY, curator leaderboards.

---

**Outcome**: A self-sustaining economic flywheel where accurate threat classification is profitable, manipulation is costly, and long-term alignment is rewarded. AEGIS becomes the credibly neutral coordination layer for decentralized security.
