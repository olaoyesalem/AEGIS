import path from 'path';
import { config as dotenv } from 'dotenv';

// Load .env using process.cwd() to avoid __dirname issues under ESM/Node >=20
dotenv({ path: path.join(process.cwd(), '.env') });

// Warn if running on unsupported Node versions (>20) to avoid subtle Hardhat issues
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor > 20) {
  console.warn(`\n[Hardhat Warning] Detected Node.js v${process.versions.node}. Hardhat officially supports Node 18 & 20. Please switch (e.g. 'nvm use 20') to prevent unexpected behavior.\n`);
}
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

// Attempt to import chain constant; if unavailable (first install), fallback to explicit id.
let intuitionChainId = 13579; // Base Sepolia testnet default for Intuition
try {
  // dynamic import pattern to avoid breaking pre-install
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { intuitionTestnet } = require('@0xintuition/protocol');
  intuitionChainId = intuitionTestnet.id || intuitionChainId;
} catch (_) {}

const rpcUrl = process.env.INTUITION_RPC_URL;
if (!rpcUrl) {
  // Helpful early diagnostic instead of opaque HH8 error
  console.error(
    'Missing INTUITION_RPC_URL. Ensure you have an .env in the project root (next to hardhat.config.ts) or export INTUITION_RPC_URL before running Hardhat.'
  );
}
const pk = process.env.PRIVATE_KEY || '';

// NOTE:
// Previous paths.sources was set to 'blockchain/contracts' which, relative to this config file's directory (already /blockchain),
// pointed to a non-existent nested folder and led to "Nothing to compile". We reset paths to local defaults.
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    intuitionTestnet: {
      url: rpcUrl || 'https://rpc.testnet.intuition.systems',
      chainId: intuitionChainId,
      accounts: pk ? [pk.startsWith('0x') ? pk : `0x${pk}`] : [],
    },
    intuitionMainnet: {
      url: process.env.INTUITION_MAINNET_RPC_URL || 'https://rpc.intuition.systems',
      chainId: 1155,
      accounts: pk ? [pk.startsWith('0x') ? pk : `0x${pk}`] : [],
    },
  },
  paths: {
    sources: 'contracts',
    tests: 'test',
    cache: 'cache',
    artifacts: 'artifacts',
  },
};

export default config;
