import type { PublicClient, WalletClient } from 'viem';
import { parseEther, toHex } from 'viem';
import type { Address } from 'viem';
import { createAtomFromString, createTripleStatement, calculateAtomId } from '@0xintuition/sdk';
import { MULTIVAULT_ABI, THREAT_LABELS } from './constants';
import type { CreateThreatTripleOptions, CreateThreatTripleResult, VaultInfo } from './types';
import { toBytes32 } from './utils';

export class AntibodyAgent {
  constructor(
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private multiVaultAddress: Address
  ) {
    if (!walletClient.account) {
      throw new Error('WalletClient must have an account configured');
    }
  }

  private async ensureAtom(label: string): Promise<bigint> {
    // calculateAtomId from intuition sdk returns bytes32; normalize to bigint
    const atomIdHex = calculateAtomId(toHex(label));
    const atomId = BigInt(atomIdHex);

    try {
      const [, shares] = await this.publicClient.readContract({
        address: this.multiVaultAddress,
        abi: MULTIVAULT_ABI,
        functionName: 'vaults',
        args: [atomId],
      });

      if (shares > 0n) {
        return atomId;
      }
    } catch (error) {
      // Atom doesn't exist, proceed to creation
    }

    const depositAmount = parseEther('0.0001');
    const tx = await createAtomFromString(
      {
        walletClient: this.walletClient,
        publicClient: this.publicClient,
        address: this.multiVaultAddress,
      },
      label,
      depositAmount
    );

    const newIdHex = (tx.state as any).termId || (tx.state as any).vaultId;
    return BigInt(newIdHex);
  }

  
  async createThreatTriple(options: CreateThreatTripleOptions): Promise<CreateThreatTripleResult> {
    const { targetAddress, threatLabel = THREAT_LABELS.MALICIOUS, stakeAmount } = options;

    const subjectId = await this.ensureAtom(targetAddress);
    const predicateId = await this.ensureAtom('is');
    const objectId = await this.ensureAtom(threatLabel);

    const triple = await createTripleStatement(
      {
        walletClient: this.walletClient,
        publicClient: this.publicClient,
        address: this.multiVaultAddress,
      },
      {
        args: [
          [toBytes32(subjectId)],
          [toBytes32(predicateId)],
          [toBytes32(objectId)],
          [stakeAmount],
        ] as any,
        value: stakeAmount,
      }
    );

    const tripleEventArgs =
      (Array.isArray(triple.state) ? triple.state[0].args : (triple.state as any).args) ||
      (triple.state as any);
    const tripleVaultId =
      (tripleEventArgs as any).termId ||
      (tripleEventArgs as any).vaultId ||
      (tripleEventArgs as any).tripleId;

    return {
      transactionHash: triple.transactionHash,
      tripleId: tripleVaultId,
      subjectId,
      predicateId,
      objectId,
    };
  }

  async getTripleCost(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.multiVaultAddress,
      abi: [
        {
          inputs: [],
          name: 'getTripleCost',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      functionName: 'getTripleCost',
    });
  }

  async getVaultInfo(vaultId: bigint): Promise<VaultInfo> {
    const [assets, shares] = await this.publicClient.readContract({
      address: this.multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getVault',
      args: [toBytes32(vaultId), 0n],
    });

    return { assets, shares };
  }
}
