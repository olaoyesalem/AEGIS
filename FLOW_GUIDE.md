# AEGIS Adaptive Immune Firewall - Complete Flow Guide

## Grand Scheme Overview

AEGIS is a decentralized threat classification system that uses **social conviction** (staked TRUST on Intuition triples) combined with **economic game theory** (bonds, challenges, slashing) to create a self-regulating security layer for Web3.

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│  INTUITION KNOWLEDGE GRAPH (Source of Truth)                    │
│  - Triples: [Address] → [is] → [Malicious]                      │
│  - Counter-triples: [Address] → [is] → [Trustworthy]            │
│  - Conviction = TRUST staked on each triple                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  AEGIS FIREWALL (Economic Security Layer)                        │
│  - Reads conviction from Intuition MultiVault                    │
│  - Requires bonds to register threats                            │
│  - Allows challenges with dispute resolution                     │
│  - Uses TWAP to resist manipulation                              │
│  - Auto-extends on volatility                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  INTEGRATING PROTOCOLS                                           │
│  - DeFi: Block addresses from trading, lending                   │
│  - NFTs: Prevent malicious minting/transfers                     │
│  - DAOs: Gate governance participation                           │
│  - Call: firewall.isBlocked(address) or riskScore(address)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Workflow: From Threat Detection to Resolution

### Phase 1: Threat Detection & Triple Creation

**Actor**: Security Researcher / Community Member

**Goal**: Create an Intuition triple claiming an address is malicious

**Script**: `scripts/antibody-agent.ts`

**Flow**:
```
1. Ensure atoms exist on Intuition:
   - [suspect_address] 
   - [is] (predicate)
   - [Malicious] (object)

2. Create triple: [suspect] → [is] → [Malicious]
   → Returns tripleId (e.g., 0x9342119e...)

3. Stake TRUST on the triple (e.g., 0.01 ETH)
   → Conviction recorded in MultiVault
```

**Functions Called**:
- `createAtomFromString()` (SDK) → `MultiVault.createAtom()`
- `createTripleStatement()` (SDK) → `MultiVault.createTriples()`
- Sends ETH as stake; emits `TripleCreated` event

---

### Phase 2: Threat Registration (with Bond)

**Actor**: Threat Registrar (could be same as detector or different)

**Goal**: Register the threat with AEGIS firewall, posting a bond

**Script**: `scripts/register-threat.ts`

**Flow**:
```
1. Call firewall.registerThreat(suspect, tripleId)
   ✓ Send minBond (default 0.0001 ETH) with transaction
   
2. Contract validates:
   - tripleId exists via MultiVault.isTriple(bytes32)
   - Triple has >= minRegistrationAssets conviction
   - Not blocked by active dispute
   - Not a downgrade of existing stronger registration

3. Contract records:
   - ThreatInfo with tripleId, registrar, bond amount
   - TWAP snapshots: assetsStart, counterAssetsStart
   - Opens challenge window (default 1 day)

4. Emit: ThreatRegistered(suspect, tripleId, registrar, timestamp)
```

**Functions Called**:
```solidity
// External call
firewall.registerThreat(suspect, tripleId) payable

// Internal validations
intuitionVault.isTriple(bytes32(tripleId))
intuitionVault.getVault(bytes32(tripleId), 0) → (assets, shares)

// State changes
threats[suspect] = ThreatInfo{...}
```

**Economic Result**:
- Registrar's bond is locked
- Challenge window opens for 24 hours
- Anyone can challenge during this window

---

### Phase 3: Challenge (Optional)

**Actor**: Challenger (defender of the accused address)

**Goal**: Dispute the registration by posting a higher bond and providing a counter-triple

**Script**: `scripts/challenge-threat.ts`

**Flow**:
```
1. Compute counter-triple ID:
   counterTripleId = type(uint256).max - tripleId
   
2. Call firewall.challengeThreat(suspect, counterTripleId)
   ✓ Send challengeBond = registrarBond × 1.5 (default)
   
3. Contract validates:
   - Challenge window still open
   - No existing challenge
   - Counter-triple matches expected ID
   - Challenge bond meets minimum (1.5x multiplier)
   
4. Contract records:
   - Challenger address
   - Counter-triple ID
   - Challenge bond amount

5. Emit: ThreatChallenged(suspect, challenger, counterTripleId, bond, deadline)
```

**Functions Called**:
```solidity
// External call
firewall.challengeThreat(suspect, counterTripleId) payable

// Internal validations
intuitionVault.isTriple(bytes32(counterTripleId))  // if requireCounterTripleExists=true
expectedCounter = type(uint256).max - tripleId

// State updates
threats[suspect].challenger = msg.sender
threats[suspect].counterTripleId = counterTripleId
threats[suspect].challengerBond = msg.value
```

**Economic Result**:
- Both bonds now locked
- Winner will receive 90% of loser's bond + their own bond back
- Treasury receives 10% of loser's bond

---

### Phase 4: Resolution (After Window Expires)

**Actor**: Anyone (permissionless)

**Goal**: Resolve the dispute by comparing TWAP conviction and distribute bonds

**Script**: `scripts/resolve-threat.ts`

**Flow**:
```
1. Wait for challenge window to expire
   (deadline = registeredAt + challengeWindow)

2. Call firewall.resolveThreat(suspect)

3. Contract reads current conviction:
   - assetsEnd = getVault(tripleId, 0)
   - counterEnd = getVault(counterTripleId, 0)

4. Compute TWAP (Time-Weighted Average):
   netStart = assetsStart - counterAssetsStart
   netEnd = assetsEnd - counterEnd

5. Check volatility (optional):
   If |netEnd - netStart| / netStart > 30%:
     → Extend window by 30 minutes
     → Emit ChallengeWindowExtended
     → Revert with ResolveDeferred

6. Compare TWAP:
   registrarWins = (assetsStart + assetsEnd) > (counterStart + counterEnd)

7. Distribute bonds:
   IF no challenger:
     → Refund registrar's bond
   
   IF registrarWins:
     → Registrar gets: own bond + 90% of challenger's bond
     → Treasury gets: 10% of challenger's bond
     → Registration persists
   
   ELSE (challenger wins):
     → Challenger gets: own bond + 90% of registrar's bond
     → Treasury gets: 10% of registrar's bond
     → Registration deleted (threat rejected)

8. Emit: ThreatResolved(suspect, confirmed, winnerPayout, treasuryCut)
```

**Functions Called**:
```solidity
// External call
firewall.resolveThreat(suspect)

// Internal reads
intuitionVault.getVault(bytes32(tripleId), 0) → (assetsEnd, _)
intuitionVault.getVault(bytes32(counterTripleId), 0) → (counterEnd, _)

// TWAP computation
netStart = s.assetsStart - s.counterAssetsStart
netEnd = assetsEnd - counterEnd
registrarWins = (s.assetsStart + assetsEnd) > (s.counterAssetsStart + counterEnd)

// Volatility check
deltaBp = |netEnd - netStart| * 10000 / netStart
if (deltaBp >= volatilityThresholdBp):
  s.challengeDeadline = block.timestamp + volatilityExtension
  revert ResolveDeferred()

// Bond distribution
_safeTransfer(winner, winnerPayout)
_safeTransfer(treasury, treasuryCut)
if (challengerWins): delete threats[suspect]
```

**Economic Result**:
- Winner profits from correct conviction
- Loser loses majority of bond (slashed)
- Treasury accumulates fees for protocol sustainability
- Accurate threat classification incentivized

---

## Continuous Operations: Risk Checking

**Actor**: Any protocol or user

**Goal**: Query current risk status of an address

**Functions**: (all view/pure, no gas cost)

### Check if Blocked
```solidity
firewall.isBlocked(address) → bool
// Returns true if net conviction >= BLOCK_STAKE_THRESHOLD
```

### Get Full Risk Score
```solidity
firewall.riskScore(address) → (assets, shares, RiskStatus, tripleId)
// RiskStatus: UNREGISTERED_SAFE | SAFE | WATCH | BLOCKED
```

### Get Immunity Score (Inverted)
```solidity
firewall.immunityScoreBp(address) → uint256
// Returns 0-10,000 (basis points)
// 10,000 = perfectly safe, 0 = maximum risk
```

### Get Full Threat Intel
```solidity
firewall.getThreatIntel(address) → (
  tripleId,
  registeredAt,
  registrar,
  conviction,
  counterConviction,
  status
)
```

### Get Dispute Status
```solidity
firewall.getDispute(address) → (
  challengeDeadline,
  challenger,
  counterTripleId,
  registrarBond,
  challengerBond
)
```

**Internal Logic**:
```
1. Read tripleId from threats[address]
2. If tripleId == 0: UNREGISTERED_SAFE
3. Else:
   - Read conviction: getVault(tripleId, 0)
   - Read counter: getVault(maxUint - tripleId, 0)
   - netConviction = max(conviction - counter, 0)
4. Map to status:
   - netConviction >= BLOCK_STAKE_THRESHOLD → BLOCKED
   - netConviction >= WARN_STAKE_THRESHOLD → WATCH
   - else → SAFE
```

---

## Admin Operations

### Adjust Economic Parameters

**Script**: Direct contract calls or create admin scripts

```solidity
// Bonds
firewall.setMinBond(0.0002 ether)
firewall.setMinRegistrationAssets(0.00001 ether)

// Challenge mechanics
firewall.setChallengeWindow(2 days)
firewall.setChallengeBondMultiplierBp(20000)  // 2x
firewall.setWinnerRewardBp(8500)  // 85% to winner, 15% to treasury

// Risk thresholds
firewall.setThresholds(
  0.0002 ether,  // WARN_STAKE_THRESHOLD
  0.002 ether    // BLOCK_STAKE_THRESHOLD
)

// TWAP/Volatility
firewall.setRequireCounterTripleExists(false)  // Test mode
// (Add setters for volatilityThresholdBp and volatilityExtension if needed)

// Treasury
firewall.setTreasury(0xNewTreasuryAddress)
```

### Emergency Controls
```solidity
firewall.emergencyPause()    // Disable registerThreat
firewall.emergencyUnpause()  // Resume operations
```

---

## Complete Function Call Map

### 1. Creating the Triple (Intuition SDK)
```typescript
// scripts/antibody-agent.ts
await createAtomFromString({...})  
  → MultiVault.createAtom(atomData, atomCost)
  
await createTripleStatement({...})  
  → MultiVault.createTriples(
      [subjectId], 
      [predicateId], 
      [objectId], 
      [stakeAmount]
    )
```

### 2. Registering the Threat (Firewall)
```typescript
// scripts/register-threat.ts
await firewall.registerThreat(suspect, tripleId, { value: minBond })

// Contract flow:
→ intuitionVault.isTriple(bytes32(tripleId))
→ intuitionVault.getVault(bytes32(tripleId), 0)
→ intuitionVault.getVault(bytes32(counterTripleId), 0)  // TWAP snapshot
→ threats[suspect] = ThreatInfo{...}
```

### 3. Challenging (Firewall)
```typescript
// scripts/challenge-threat.ts
const counterTripleId = BigInt('0xfff...fff') - tripleId
await firewall.challengeThreat(suspect, counterTripleId, { value: challengeBond })

// Contract flow:
→ intuitionVault.isTriple(bytes32(counterTripleId))  // optional
→ threats[suspect].challenger = msg.sender
→ threats[suspect].counterTripleId = counterTripleId
```

### 4. Resolving (Firewall)
```typescript
// scripts/resolve-threat.ts
await firewall.resolveThreat(suspect)

// Contract flow:
→ intuitionVault.getVault(bytes32(tripleId), 0)  // assetsEnd
→ intuitionVault.getVault(bytes32(counterTripleId), 0)  // counterEnd
→ TWAP: compare (start+end) for triple vs counter
→ Volatility check: if large swing, extend window
→ Distribute bonds: _safeTransfer(winner, amount)
→ delete threats[suspect] if challenger wins
```

### 5. Querying Risk (Firewall Views)
```typescript
// Any time, no gas
const blocked = await firewall.isBlocked(address)
const [assets, shares, status, tripleId] = await firewall.riskScore(address)
const scoreBp = await firewall.immunityScoreBp(address)
const intel = await firewall.getThreatIntel(address)
const dispute = await firewall.getDispute(address)
```

---

## Economic Incentive Loop

```
┌──────────────────────────────────────────────────────────────┐
│  1. Accurate Threat Detection                                │
│     → Security researchers stake TRUST on real threats       │
│     → Creates conviction on Intuition                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  2. Registration with Bond                                   │
│     → Registrar posts minBond (e.g., 0.0001 ETH)            │
│     → Opens challenge window                                 │
│     → If unchallenged: bond refunded, threat persists        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  3. Challenge Opportunity                                    │
│     → Defenders post higher bond (1.5x) to dispute          │
│     → Must back counter-triple with conviction               │
│     → Creates economic cost for challenges                   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  4. TWAP Resolution                                          │
│     → Average conviction over window (not final snapshot)    │
│     → Prevents last-minute whale manipulation                │
│     → Volatility extension gives reaction time               │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  5. Bond Distribution                                        │
│     → Winner gets 90% of loser's bond + own bond back       │
│     → Treasury gets 10% for protocol sustainability          │
│     → Loser is economically punished for false claim         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  6. Truth Emerges                                            │
│     → Correct registrations persist (with conviction proof)  │
│     → False claims are removed (challenger wins)             │
│     → Protocols integrate isBlocked() for security gating    │
└──────────────────────────────────────────────────────────────┘
```

---

## Attack Resistance Summary

| Attack Vector | Mitigation Mechanism |
|---------------|---------------------|
| **Spam registrations** | minBond cost + minRegistrationAssets threshold |
| **Whale last-minute spike** | TWAP averages conviction over full window |
| **Flash manipulation** | Volatility extension (30% swing → +30min window) |
| **Collusion** | <100% winner payout (treasury cut); onchain transparency |
| **Downgrade attacks** | Only stronger conviction can overwrite existing |
| **Bribery** | Conviction commitment (can't move stake during window) |
| **Sybil challenges** | Higher bond requirement (1.5x multiplier) |

---

## Quick Reference: Scripts & Commands

```bash
# Create threat triple
npx ts-node scripts/antibody-agent.ts

# Register threat (post bond)
npx ts-node scripts/register-threat.ts <suspect> <tripleId>

# Challenge threat (post higher bond)
npx ts-node scripts/challenge-threat.ts <suspect> <tripleId>

# Resolve after window
npx ts-node scripts/resolve-threat.ts <suspect>

# Admin: adjust parameters
npx ts-node scripts/set-min-registration-assets.ts <value_eth>
npx ts-node scripts/set-challenge-window.ts <seconds>
npx ts-node scripts/set-test-mode.ts <true|false>

# Deploy new firewall
npm run deploy
```

---

## Future: Tokenomics Layer (AEGIS Token)

When Phase 2 launches, AEGIS token will enhance the system:

- **Staking**: Lock AEGIS to boost conviction weight
- **Emissions**: Reward accurate registrars and long-term conviction stakers
- **Governance**: Vote on economic parameters and thresholds
- **Reputation**: NFTs for consistent accuracy (lower bonds, higher rewards)
- **Slashing**: Punish malicious curators by burning staked AEGIS

See `TOKENOMICS.md` for full design.

---

## Key Takeaway

**AEGIS transforms threat intelligence from a centralized, opaque process into a decentralized, economically incentivized game where truth emerges through conviction + skin-in-the-game.**

The grand scheme: **Conviction (Intuition) + Economics (Bonds) + Time (TWAP) = Credibly Neutral Security**
