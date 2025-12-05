import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { intuitionTestnet } from '@0xintuition/protocol';
import dotenv from 'dotenv';
dotenv.config();
import { requireEnv } from './validate-env';

import {
  calculateAtomId,
  calculateTripleId,
  findAtomIds,
  findTripleIds,
  createAtomFromString,
  createTripleStatement,
  getMultiVaultAddressFromChainId,
  getAtomDetails,
  getTripleDetails,
} from '@0xintuition/sdk';

export type ResolveTripleParams = {
  suspectAddress: string;
  depositTrust?: string; // in TRUST units (denominated with parseEther for now)
  rpcUrl?: string;
  privateKey?: string;
};

export type ResolveTripleResult = {
  tripleId: bigint; // vaultId in Intuition
  multivaultAddress: `0x${string}`;
  transactionHash?: `0x${string}`;
};

/**
 * Resolve or create the canonical Risk Triple for a suspect address:
 *   [suspect] -> [is] -> [Malicious]
 * Returns the tripleId (aka vaultId) to pass into ImmuneFirewall.registerThreat.
 *
 * NOTE: On-chain derivation isn't available; triple IDs are assigned by Intuition contracts.
 * This helper uses the SDK to create-or-resolve and returns the ID.
 */
export async function resolveOrCreateRiskTripleIdForAddress(
  params: ResolveTripleParams
): Promise<ResolveTripleResult> {
  const rpcUrl = params.rpcUrl ?? process.env.INTUITION_RPC_URL;
  if (!rpcUrl) throw new Error('INTUITION_RPC_URL missing');
  const pk = params.privateKey ?? process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY missing');
  // Validate when not provided via params
  requireEnv(['INTUITION_RPC_URL', 'PRIVATE_KEY']);

  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}`);

  const publicClient = createPublicClient({
    chain: intuitionTestnet,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: intuitionTestnet,
    transport: http(rpcUrl),
  });

  const multivaultAddress = getMultiVaultAddressFromChainId(intuitionTestnet.id) as `0x${string}`;

    console.log('  Finding or creating atoms...');
  
    // Convert strings to hex bytes for calculateAtomId
    const { stringToHex } = await import('viem');
    const subjectBytes = stringToHex(params.suspectAddress) as `0x${string}`;
    const predicateBytes = stringToHex('is') as `0x${string}`;
    const objectBytes = stringToHex('Malicious') as `0x${string}`;
    
    // Calculate atom IDs directly (deterministic)
    let subjectTermId = calculateAtomId(subjectBytes) as `0x${string}`;
    let predicateTermId = calculateAtomId(predicateBytes) as `0x${string}`;
    let objectTermId = calculateAtomId(objectBytes) as `0x${string}`;
  
    console.log('  Calculated atom IDs:', { subjectTermId, predicateTermId, objectTermId });
  
    // Check if atoms exist
    const [subjectExists, predicateExists, objectExists] = await Promise.all([
      publicClient.readContract({
        address: multivaultAddress,
        abi: [{ inputs: [{ name: 'termId', type: 'bytes32' }], name: 'isAtom', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }] as const,
        functionName: 'isAtom',
        args: [subjectTermId]
      }),
      publicClient.readContract({
        address: multivaultAddress,
        abi: [{ inputs: [{ name: 'termId', type: 'bytes32' }], name: 'isAtom', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }] as const,
        functionName: 'isAtom',
        args: [predicateTermId]
      }),
      publicClient.readContract({
        address: multivaultAddress,
        abi: [{ inputs: [{ name: 'termId', type: 'bytes32' }], name: 'isAtom', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }] as const,
        functionName: 'isAtom',
        args: [objectTermId]
      })
    ]);
  
    console.log('  Atoms exist:', { subjectExists, predicateExists, objectExists });
    
    // Create any missing atoms (pass 1n minimal deposit)
    if (!subjectExists) {
      console.log('  Creating subject atom:', params.suspectAddress);
      const subjectAtom = await createAtomFromString(
        { walletClient, publicClient, address: multivaultAddress },
        params.suspectAddress,
        1n
      );
      subjectTermId = subjectAtom.state.termId;
    }
  
    if (!predicateExists) {
      console.log('  Creating predicate atom: is');
      const predicateAtom = await createAtomFromString(
        { walletClient, publicClient, address: multivaultAddress },
        'is',
        1n
      );
      predicateTermId = predicateAtom.state.termId;
    }
  
    if (!objectExists) {
      console.log('  Creating object atom: Malicious');
      const objectAtom = await createAtomFromString(
        { walletClient, publicClient, address: multivaultAddress },
        'Malicious',
        1n
      );
      objectTermId = objectAtom.state.termId;
    }

    console.log('  Atoms resolved:', { subjectTermId, predicateTermId, objectTermId });

    // Check if triple already exists
    let tripleTermId: `0x${string}` | undefined;
    try {
      const tripleIds = await findTripleIds(
        multivaultAddress,
        [[subjectTermId, predicateTermId, objectTermId]]
      );
      tripleTermId = (tripleIds[0] as unknown) as `0x${string}` | undefined;
      if (tripleTermId) {
        console.log('  Triple already exists:', tripleTermId);
      }
    } catch (e) {
      console.log('  Triple does not exist yet');
    }

    let transactionHash: `0x${string}` | undefined;

    // Create triple if it doesn't exist, or deposit if it does
    if (!tripleTermId) {
      const deposit = params.depositTrust ?? '0';
      const depositAmount = parseEther(deposit);

      console.log('  Creating new triple with deposit:', deposit, 'TRUST');
      
      // Preview the cost to create the triple
      const cost = await publicClient.readContract({
        address: multivaultAddress,
        abi: [{
          inputs: [],
          name: 'getTripleCost',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }] as const,
        functionName: 'getTripleCost'
      });
      
      const totalValue = depositAmount + cost;
      console.log('  Triple creation cost:', Number(cost) / 1e18, 'ETH');
      console.log('  Total ETH to send:', Number(totalValue) / 1e18, 'ETH');
      
      const triple = await createTripleStatement(
        { walletClient, publicClient, address: multivaultAddress },
        {
          args: [
            [subjectTermId],    // subjectIds array (bytes32[])
            [predicateTermId],  // predicateIds array (bytes32[])
            [objectTermId],     // objectIds array (bytes32[])
            [depositAmount],    // assets array (uint256[])
          ],
          value: totalValue,  // Send deposit + creation cost
        }
      );

      // Parse the TripleCreated event from the returned state to get termId
      const tripleEvent = triple.state[0];
      tripleTermId = tripleEvent.args.termId as `0x${string}`;
      transactionHash = triple.transactionHash;
    }

  return {
      tripleId: BigInt(tripleTermId),
    multivaultAddress,
      transactionHash,
  };
}
