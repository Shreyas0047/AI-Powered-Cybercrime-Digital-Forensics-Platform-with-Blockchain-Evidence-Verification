"use strict";
/**
 * Blockchain Service - Core Web3 Integration
 * Web3 provider management and blockchain communication
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainService = exports.BlockchainService = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const config_1 = require("./config");
class BlockchainService {
    provider = null;
    initialized = false;
    /**
     * Initialize Web3 provider
     */
    async initialize() {
        if (this.initialized)
            return;
        if (!config_1.blockchainConfig.enabled) {
            logger_1.default.info('[Blockchain] Blockchain disabled - running in offline mode');
            return;
        }
        try {
            // Dynamic import of ethers.js to support optional blockchain
            const { ethers } = await Promise.resolve().then(() => __importStar(require('ethers')));
            // Create RPC provider
            this.provider = new ethers.JsonRpcProvider(config_1.blockchainConfig.rpcUrl);
            // Verify connection
            const network = await this.provider.getNetwork();
            logger_1.default.info(`[Blockchain] Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
            this.initialized = true;
        }
        catch (error) {
            logger_1.default.warn('[Blockchain] Failed to initialize Web3 provider:', error);
            logger_1.default.warn('[Blockchain] Running in offline mode - local verification only');
        }
    }
    /**
     * Check if blockchain is available
     */
    isAvailable() {
        return this.initialized && this.provider !== null;
    }
    /**
     * Get current block number
     */
    async getBlockNumber() {
        if (!this.isAvailable()) {
            return 0;
        }
        return await this.provider.getBlockNumber();
    }
    /**
     * Get block by number
     */
    async getBlock(blockNumber) {
        if (!this.isAvailable()) {
            throw new Error('Blockchain not available');
        }
        return await this.provider.getBlock(blockNumber);
    }
    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        if (!this.isAvailable()) {
            throw new Error('Blockchain not available');
        }
        return await this.provider.getTransactionReceipt(txHash);
    }
    /**
     * Get gas price
     */
    async getGasPrice() {
        if (!this.isAvailable()) {
            return config_1.blockchainConfig.gasSettings.maxFeePerGas;
        }
        const feeData = await this.provider.getFeeData();
        return feeData.maxFeePerGas?.toString() || config_1.blockchainConfig.gasSettings.maxFeePerGas;
    }
    /**
     * Estimate gas for transaction
     */
    async estimateGas(tx) {
        if (!this.isAvailable()) {
            return config_1.blockchainConfig.gasSettings.gasLimit;
        }
        return await this.provider.estimateGas(tx);
    }
    /**
     * Get network information
     */
    async getNetworkInfo() {
        try {
            if (!this.isAvailable()) {
                return {
                    chainId: 0,
                    blockNumber: 0,
                    networkName: 'offline',
                    available: false,
                };
            }
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            return {
                chainId: Number(network.chainId),
                blockNumber,
                networkName: network.name,
                available: true,
            };
        }
        catch (error) {
            return {
                chainId: 0,
                blockNumber: 0,
                networkName: 'error',
                available: false,
            };
        }
    }
    /**
     * Format address for display
     */
    formatAddress(address) {
        if (!address || address.length < 10)
            return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    /**
     * Format transaction hash for display
     */
    formatTxHash(txHash) {
        if (!txHash || txHash.length < 20)
            return txHash;
        return `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`;
    }
    /**
     * Get explorer URL for transaction
     */
    getExplorerUrl(txHash) {
        return `${config_1.blockchainConfig.explorerUrl}/tx/${txHash}`;
    }
    /**
     * Get explorer URL for address
     */
    getAddressExplorerUrl(address) {
        return `${config_1.blockchainConfig.explorerUrl}/address/${address}`;
    }
    /**
     * Verify transaction confirmation
     */
    async verifyTransaction(txHash, requiredConfirmations = 12) {
        if (!this.isAvailable()) {
            return { confirmed: false, confirmations: 0, blockNumber: 0 };
        }
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt || !receipt.blockNumber) {
            return { confirmed: false, confirmations: 0, blockNumber: 0 };
        }
        const currentBlock = await this.provider.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber + 1;
        return {
            confirmed: confirmations >= requiredConfirmations,
            confirmations,
            blockNumber: receipt.blockNumber,
        };
    }
    /**
     * Clean up resources
     */
    async destroy() {
        if (this.provider) {
            this.provider = null;
            this.initialized = false;
        }
    }
}
exports.BlockchainService = BlockchainService;
exports.blockchainService = new BlockchainService();
exports.default = exports.blockchainService;
//# sourceMappingURL=blockchain.service.js.map