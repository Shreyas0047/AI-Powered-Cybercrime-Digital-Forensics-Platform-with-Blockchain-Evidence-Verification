"use strict";
/**
 * Blockchain Configuration
 * Web3 and blockchain integration settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletConfig = exports.verificationConfig = exports.blockchainConfig = void 0;
exports.blockchainConfig = {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    network: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.infura.io/v3/your-project-id',
    contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
    chainId: process.env.BLOCKCHAIN_CHAIN_ID ? parseInt(process.env.BLOCKCHAIN_CHAIN_ID) : 11155111,
    explorerUrl: process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io',
    confirmations: 12,
    gasSettings: {
        maxFeePerGas: '2000000000', // 2 gwei
        maxPriorityFeePerGas: '1000000000', // 1 gwei
        gasLimit: 500000,
    },
};
exports.verificationConfig = {
    hashAlgorithm: 'sha256',
    verificationBatchSize: 10,
    autoVerifyOnUpload: process.env.AUTO_VERIFY_ON_UPLOAD === 'true',
    storeHashesOnChain: process.env.STORE_HASHES_ON_CHAIN === 'true',
};
exports.walletConfig = {
    type: 'testnet',
    address: process.env.BLOCKCHAIN_WALLET_ADDRESS || '',
    minConfirmations: 6,
};
exports.default = {
    blockchain: exports.blockchainConfig,
    verification: exports.verificationConfig,
    wallet: exports.walletConfig,
};
//# sourceMappingURL=config.js.map