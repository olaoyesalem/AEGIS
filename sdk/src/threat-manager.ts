import type { Address, WalletClient, PublicClient, Hex } from 'viem';
import type {
  RegisterThreatOptions,
  ChallengeThreatOptions,
  ThreatRegisteredEvent,
  ThreatChallengedEvent,
  ThreatResolvedEvent,
} from './types';
import { ADAPTIVE_IMMUNE_FIREWALL_ABI } from './constants';
import { retry } from './utils';

export class ThreatManager {
  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private firewallAddress: Address
  ) {
    if (!walletClient.account) {
      throw new Error('WalletClient must have an account configured');
    }
  }

  async registerThreat(options: RegisterThreatOptions): Promise<{
    transactionHash: Hex;
    event: ThreatRegisteredEvent | null;
  }> {
    const { suspect, tripleId, bond } = options;
    const account = this.walletClient.account!;

    const hash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account,
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'registerThreat',
      args: [suspect, tripleId],
      value: bond,
    });

    await retry(() => this.publicClient.waitForTransactionReceipt({ hash }), {
      maxAttempts: 5,
      initialDelay: 2000,
    });

    return { transactionHash: hash, event: null };
  }

  async challengeThreat(options: ChallengeThreatOptions): Promise<{
    transactionHash: Hex;
    event: ThreatChallengedEvent | null;
  }> {
    const { suspect, counterTripleId, bond } = options;
    const account = this.walletClient.account!;

    const hash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account,
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'challengeThreat',
      args: [suspect, counterTripleId],
      value: bond,
    });

    await retry(() => this.publicClient.waitForTransactionReceipt({ hash }), {
      maxAttempts: 5,
      initialDelay: 2000,
    });

    return { transactionHash: hash, event: null };
  }

  async resolveThreat(suspect: Address): Promise<{
    transactionHash: Hex;
    event: ThreatResolvedEvent | null;
  }> {
    const account = this.walletClient.account!;

    const hash = await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account,
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'resolveThreat',
      args: [suspect],
    });

    await retry(() => this.publicClient.waitForTransactionReceipt({ hash }), {
      maxAttempts: 5,
      initialDelay: 2000,
    });

    return { transactionHash: hash, event: null };
  }

  async calculateChallengeBond(suspect: Address): Promise<bigint> {
    const [, , , registrarBond] = await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'getDispute',
      args: [suspect],
    });

    const multiplierBp = await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'challengeBondMultiplierBp',
    });

    return (registrarBond * multiplierBp) / 10000n;
  }

  async getMinimumBond(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.firewallAddress,
      abi: ADAPTIVE_IMMUNE_FIREWALL_ABI,
      functionName: 'minBond',
    });
  }
}
