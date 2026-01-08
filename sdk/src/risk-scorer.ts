import type { Address, PublicClient } from 'viem';
import type { RiskScoreResult, ThreatIntelligence, FirewallParameters } from './types';
import { RiskStatus } from './types';
import { ADAPTIVE_IMMUNE_FIREWALL_ABI, MULTIVAULT_ABI } from './constants';
import { calculateCounterTripleId, toBytes32 } from './utils';

/**
 * RiskScorer - Module for querying risk scores and threat intelligence
 */
export class RiskScorer {
  constructor(
    private publicClient: PublicClient,
    private firewallAddress: Address,
    private multiVaultAddress: Address
  ) {}

  /**
   * Get the risk score for an address
   */
  async getRiskScore(target: Address): Promise<RiskScoreResult> {
    const result = await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'riskScore',
      args: [target],
    });

    
    const [assets, shares, statusNum, tripleId] = result;

    // Get counter-conviction if there's a registered triple
    let counterConviction = 0n;
    let netConviction = 0n;

    if (tripleId > 0n) {
      const counterTripleId = calculateCounterTripleId(tripleId);
      try {
        const [counterAssets] = await this.publicClient.readContract({
          address: this.multiVaultAddress,
          abi: MULTIVAULT_ABI,
          functionName: 'getVault',
          args: [toBytes32(counterTripleId), 0n],
        });
        counterConviction = counterAssets;
        netConviction = assets > counterConviction ? assets - counterConviction : 0n;
      } catch (error) {
        // Counter-triple might not exist yet
        netConviction = assets;
      }
    }

    return {
      assets,
      shares,
      status: statusNum as RiskStatus,
      tripleId,
      netConviction,
      counterConviction,
    };
  }

  /**
   * Check if an address is blocked
   */
  async isBlocked(target: Address): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'isBlocked',
      args: [target],
    });
  }

  /**
   * Get immunity score in basis points (0-10000, higher is better)
   */
  async getImmunityScore(target: Address): Promise<number> {
    const scoreBp = await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'immunityScoreBp',
      args: [target],
    });

    return Number(scoreBp);
  }

  /**
   * Get full threat intelligence for an address
   */
  async getThreatIntel(target: Address): Promise<ThreatIntelligence> {
    const [tripleId, registeredAt, registrar, conviction, counterConviction, statusNum] =
      await this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'getThreatIntel',
        args: [target],
      });

    const [challengeDeadline, challenger, counterTripleId, registrarBond, challengerBond] =
      await this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'getDispute',
        args: [target],
      });

    return {
      tripleId,
      registeredAt,
      registrar,
      conviction,
      counterConviction,
      status: statusNum as RiskStatus,
      bond: registrarBond,
      challengeDeadline,
      challenger,
      counterTripleId,
      challengerBond,
    };
  }

  /**
   * Get current firewall parameters
   */
  async getFirewallParameters(): Promise<FirewallParameters> {
    const [
      warnThreshold,
      blockThreshold,
      minBond,
      minRegistrationAssets,
      challengeWindow,
      challengeBondMultiplierBp,
      treasury,
    ] = await Promise.all([
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'WARN_STAKE_THRESHOLD',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'BLOCK_STAKE_THRESHOLD',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'minBond',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'minRegistrationAssets',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'challengeWindow',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'challengeBondMultiplierBp',
      }),
      this.publicClient.readContract({
        address: this.firewallAddress,
        abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
        functionName: 'treasury',
      }),
    ]);

    return {
      warnThreshold,
      blockThreshold,
      minBond,
      minRegistrationAssets,
      challengeWindow,
      challengeBondMultiplierBp,
      winnerRewardBp: 9000n, // This is hardcoded in the contract
      treasury,
    };
  }

  /**
   * Get vault information from Intuition MultiVault
   */
  async getVaultInfo(vaultId: bigint): Promise<{ assets: bigint; shares: bigint }> {
    const [assets, shares] = await this.publicClient.readContract({
      address: this.multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getVault',
      args: [toBytes32(vaultId), 0n],
    });

    return { assets, shares };
  }

  /**
   * Check if a vault ID is a triple
   */
  async isTriple(vaultId: bigint): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'isTriple',
      args: [toBytes32(vaultId)],
    });
  }

  /**
   * Batch check risk status for multiple addresses
   */
  async batchCheckRisk(targets: Address[]): Promise<Map<Address, RiskScoreResult>> {
    const results = await Promise.all(
      targets.map((target) => this.getRiskScore(target))
    );

    const map = new Map<Address, RiskScoreResult>();
    targets.forEach((target, index) => {
      map.set(target, results[index]);
    });

    return map;
  }

  /**
   * Get risk status as a human-readable string
   */
  getRiskStatusLabel(status: RiskStatus): string {
    switch (status) {
      case RiskStatus.UNREGISTERED_SAFE:
        return 'Unregistered (Safe)';
      case RiskStatus.SAFE:
        return 'Safe';
      case RiskStatus.WATCH:
        return 'Watch';
      case RiskStatus.BLOCKED:
        return 'Blocked';
      default:
        return 'Unknown';
    }
  }
}
