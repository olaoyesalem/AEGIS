import type { AegisConfig } from './types';
import { RiskScorer } from './risk-scorer';
import { ThreatManager } from './threat-manager';
import { AntibodyAgent } from './antibody-agent';

/**
 * Main SDK client for interacting with the Aegis protocol
 */
export class AegisClient {
  public readonly riskScorer: RiskScorer;
  public readonly threatManager: ThreatManager | null;
  public readonly antibodyAgent: AntibodyAgent | null;

  constructor(config: AegisConfig) {
    // Risk scoring is always available (read-only)
    this.riskScorer = new RiskScorer(
      config.publicClient,
      config.firewallAddress,
      config.multiVaultAddress
    );

    // Threat management and antibody require a wallet
    if (config.walletClient) {
      this.threatManager = new ThreatManager(
        config.publicClient,
        config.walletClient,
        config.firewallAddress
      );

      this.antibodyAgent = new AntibodyAgent(
        config.publicClient,
        config.walletClient,
        config.multiVaultAddress
      );
    } else {
      this.threatManager = null;
      this.antibodyAgent = null;
    }
  }

  /**
   * Check if threat management features are available
   */
  get canWrite(): boolean {
    return this.threatManager !== null && this.antibodyAgent !== null;
  }
}
