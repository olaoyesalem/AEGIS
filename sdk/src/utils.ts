import { toHex, type Hex, keccak256, encodeAbiParameters } from 'viem';

/**
 * Calculate the atom ID from a label (matches Intuition's calculateAtomId)
 */
export function calculateAtomId(label: string): bigint {
  const labelHex = toHex(label);
  const hash = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes' }],
      [labelHex]
    )
  );
  return BigInt(hash);
}

/**
 * Calculate the counter-triple ID
 */
export function calculateCounterTripleId(tripleId: bigint): bigint {
  return BigInt(2) ** BigInt(256) - BigInt(1) - tripleId;
}

/**
 * Convert various ID formats to bytes32 hex string
 */
export function toBytes32(id: string | number | bigint): Hex {
  if (typeof id === 'string') {
    if (id.startsWith('0x') && id.length === 66) {
      return id as Hex;
    }
    // Try parsing as decimal
    try {
      const bi = BigInt(id);
      return `0x${bi.toString(16).padStart(64, '0')}` as Hex;
    } catch {
      throw new Error(`Cannot convert string to bytes32: ${id}`);
    }
  }
  if (typeof id === 'number' || typeof id === 'bigint') {
    const bi = BigInt(id);
    return `0x${bi.toString(16).padStart(64, '0')}` as Hex;
  }
  throw new Error(`Cannot convert id to bytes32: ${id}`);
}

/**
 * Format wei amount to ETH with decimals
 */
export function formatEther(wei: bigint, decimals: number = 6): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}

/**
 * Format basis points to percentage
 */
export function formatBasisPoints(bp: bigint): string {
  return (Number(bp) / 100).toFixed(2) + '%';
}

/**
 * Check if an address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate environment variables
 */
export interface EnvValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(env: Record<string, string | undefined>, required: string[]): EnvValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of required) {
    if (!env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  if (env.PRIVATE_KEY) {
    const pk = env.PRIVATE_KEY.trim();
    if (!pk.startsWith('0x') || pk.length !== 66) {
      errors.push('PRIVATE_KEY must be a 64-character hex string prefixed with 0x');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) {
        break;
      }
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString();
}

/**
 * Calculate time remaining until deadline
 */
export function timeUntilDeadline(deadline: bigint): {
  expired: boolean;
  remaining: number;
  formatted: string;
} {
  const now = Math.floor(Date.now() / 1000);
  const deadlineSeconds = Number(deadline);
  const remaining = deadlineSeconds - now;
  const expired = remaining <= 0;

  let formatted: string;
  if (expired) {
    formatted = 'Expired';
  } else {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  }

  return { expired, remaining, formatted };
}
