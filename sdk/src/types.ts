import type { Address, Hex, PublicClient, WalletClient } from 'viem';

/**
 * Risk status classification for addresses
 */
export enum RiskStatus {
  /** Address is not registered in the system (treated as safe) */
  UNREGISTERED_SAFE = 0,
  /** Address has been registered but conviction is below WARN threshold */
  SAFE = 1,
  /** Address has conviction between WARN and BLOCK thresholds */
  WATCH = 2,
  /** Address has conviction above BLOCK threshold */
  BLOCKED = 3,
}

/**
 * Configuration for initializing the Aegis SDK
 */
export interface AegisConfig {
  /** Public client for reading blockchain data */
  publicClient: PublicClient;
  /** Wallet client for signing transactions (optional, only needed for write operations) */
  walletClient?: WalletClient;
  /** Address of the deployed AdaptiveImmuneFirewall contract */
  firewallAddress: Address;
  /** Address of the Intuition MultiVault contract */
  multiVaultAddress: Address;
  /** GraphQL endpoint for Intuition data (optional) */
  graphqlUrl?: string;
}

/**
 * Risk score information for an address
 */
export interface RiskScoreResult {
  /** Raw conviction (assets staked) backing the malicious triple */
  assets: bigint;
  /** Shares in the vault */
  shares: bigint;
  /** Current risk status classification */
  status: RiskStatus;
  /** Triple ID associated with this threat (0 if unregistered) */
  tripleId: bigint;
  /** Net conviction (malicious - defensive) */
  netConviction: bigint;
  /** Counter-triple conviction (defensive stakes) */
  counterConviction: bigint;
}

/**
 * Full threat intelligence data
 */
export interface ThreatIntelligence {
  /** Triple ID representing the threat */
  tripleId: bigint;
  /** Timestamp when threat was registered */
  registeredAt: bigint;
  /** Address that registered the threat */
  registrar: Address;
  /** Current malicious conviction */
  conviction: bigint;
  /** Current defensive conviction */
  counterConviction: bigint;
  /** Current risk status */
  status: RiskStatus;
  /** Bond posted by registrar */
  bond: bigint;
  /** Challenge deadline (0 if none) */
  challengeDeadline: bigint;
  /** Challenger address (zero address if none) */
  challenger: Address;
  /** Counter-triple ID used for challenge */
  counterTripleId: bigint;
  /** Bond posted by challenger */
  challengerBond: bigint;
}

/**
 * Options for registering a threat
 */
export interface RegisterThreatOptions {
  /** Address to flag as malicious */
  suspect: Address;
  /** Triple ID representing the threat claim */
  tripleId: bigint;
  /** Bond to post (must be >= minBond) */
  bond: bigint;
}

/**
 * Options for challenging a threat
 */
export interface ChallengeThreatOptions {
  /** Address whose threat is being challenged */
  suspect: Address;
  /** Counter-triple ID (should be maxUint256 - tripleId) */
  counterTripleId: bigint;
  /** Bond to post (must be >= challengeBondMultiplier * registrar's bond) */
  bond: bigint;
}

/**
 * Options for creating a threat triple
 */
export interface CreateThreatTripleOptions {
  /** Address to flag as malicious */
  targetAddress: Address;
  /** Label for the threat type (e.g., "Malicious", "Scammer", "RugPull") */
  threatLabel?: string;
  /** Amount to stake on the triple (in wei) */
  stakeAmount: bigint;
}

/**
 * Result from creating a threat triple
 */
export interface CreateThreatTripleResult {
  /** Transaction hash */
  transactionHash: Hex;
  /** Created triple vault ID */
  tripleId: bigint;
  /** Subject atom ID (address) */
  subjectId: bigint;
  /** Predicate atom ID ("is") */
  predicateId: bigint;
  /** Object atom ID (threat label) */
  objectId: bigint;
}

/**
 * Vault information from Intuition
 */
export interface VaultInfo {
  /** Total assets in the vault */
  assets: bigint;
  /** Total shares in the vault */
  shares: bigint;
}

/**
 * Event emitted when a threat is registered
 */
export interface ThreatRegisteredEvent {
  suspect: Address;
  tripleId: bigint;
  registrar: Address;
  timestamp: bigint;
}

/**
 * Event emitted when a threat is challenged
 */
export interface ThreatChallengedEvent {
  suspect: Address;
  challenger: Address;
  counterTripleId: bigint;
  bond: bigint;
  deadline: bigint;
}

/**
 * Event emitted when a threat is resolved
 */
export interface ThreatResolvedEvent {
  suspect: Address;
  confirmed: boolean;
  winnerPayout: bigint;
  treasuryCut: bigint;
}

/**
 * Firewall parameters
 */
export interface FirewallParameters {
  warnThreshold: bigint;
  blockThreshold: bigint;
  minBond: bigint;
  minRegistrationAssets: bigint;
  challengeWindow: bigint;
  challengeBondMultiplierBp: bigint;
  winnerRewardBp: bigint;
  treasury: Address;
}
