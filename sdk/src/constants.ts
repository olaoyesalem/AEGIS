import type { Address } from 'viem';

/**
 * Contract ABIs
 */

export const ADAPTIVE_IMMUNE_FIREWALL_ABI = [
  // Read functions
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'riskScore',
    outputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'tripleId', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'isBlocked',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'immunityScoreBp',
    outputs: [{ name: 'scoreBp', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'getThreatIntel',
    outputs: [
      { name: 'tripleId', type: 'uint256' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'registrar', type: 'address' },
      { name: 'conviction', type: 'uint256' },
      { name: 'counterConviction', type: 'uint256' },
      { name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_target', type: 'address' }],
    name: 'getDispute',
    outputs: [
      { name: 'challengeDeadline', type: 'uint256' },
      { name: 'challenger', type: 'address' },
      { name: 'counterTripleId', type: 'uint256' },
      { name: 'registrarBond', type: 'uint256' },
      { name: 'challengerBond', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'WARN_STAKE_THRESHOLD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BLOCK_STAKE_THRESHOLD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minBond',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minRegistrationAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'challengeWindow',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'challengeBondMultiplierBp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: '_suspect', type: 'address' },
      { name: '_tripleId', type: 'uint256' },
    ],
    name: 'registerThreat',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_suspect', type: 'address' },
      { name: '_counterTripleId', type: 'uint256' },
    ],
    name: 'challengeThreat',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: '_suspect', type: 'address' }],
    name: 'resolveThreat',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'suspect', type: 'address' },
      { indexed: true, name: 'tripleId', type: 'uint256' },
      { indexed: true, name: 'registrar', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'ThreatRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'suspect', type: 'address' },
      { indexed: true, name: 'challenger', type: 'address' },
      { indexed: true, name: 'counterTripleId', type: 'uint256' },
      { indexed: false, name: 'bond', type: 'uint256' },
      { indexed: false, name: 'deadline', type: 'uint256' },
    ],
    name: 'ThreatChallenged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'suspect', type: 'address' },
      { indexed: false, name: 'confirmed', type: 'bool' },
      { indexed: false, name: 'winnerPayout', type: 'uint256' },
      { indexed: false, name: 'treasuryCut', type: 'uint256' },
    ],
    name: 'ThreatResolved',
    type: 'event',
  },
] as const;

export const MULTIVAULT_ABI = [
  {
    inputs: [
      { name: 'vaultId', type: 'bytes32' },
      { name: 'blockNumber', type: 'uint256' },
    ],
    name: 'getVault',
    outputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'vaultId', type: 'uint256' }],
    name: 'vaults',
    outputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'isTriple',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTripleCost',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAtomCost',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Known contract addresses by chain ID
 */
export const CONTRACT_ADDRESSES: Record<number, { multiVault?: Address; firewall?: Address }> = {
  // Intuition Testnet (Base Sepolia fork)
  13579: {
    multiVault: '0x430BbF52503Bd4801E51182f4cB9f8F534225DE5' as Address,
    // firewall address should be set after deployment
  },
};

/**
 * Default threat labels
 */
export const THREAT_LABELS = {
  MALICIOUS: 'Malicious',
  SCAMMER: 'Scammer',
  RUG_PULL: 'RugPull',
  PHISHING: 'Phishing',
  EXPLOIT: 'Exploit',
  FAKE_TOKEN: 'FakeToken',
  FAKE_NFT: 'FakeNFT',
  FAKE_DAPP: 'FakeDApp',
  COMPROMISED: 'Compromised',
} as const;

/**
 * GraphQL query for fetching triple data
 */
export const TRIPLE_QUERY = `
  query GetTriple($id: numeric!) {
    vaults(where: { id: { _eq: $id } }) {
      id
      total_shares
      current_share_price
      position_count
      atom {
        label
        vault_id
      }
      triple {
        subject_id
        predicate_id
        object_id
        counter_vault_id
      }
      positions(order_by: { shares: desc }, limit: 10) {
        account {
          id
          label
        }
        shares
      }
    }
  }
`;

/**
 * GraphQL query for fetching positions
 */
export const POSITIONS_QUERY = `
  query GetPositions($vaultId: numeric!) {
    positions(
      where: { vault_id: { _eq: $vaultId } }
      order_by: { shares: desc }
      limit: 100
    ) {
      id
      account {
        id
        label
      }
      shares
      vault {
        id
        current_share_price
      }
    }
  }
`;
