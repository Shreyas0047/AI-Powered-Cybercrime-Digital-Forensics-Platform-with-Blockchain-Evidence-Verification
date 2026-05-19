"use strict";
/**
 * Blockchain Module Initialization
 * Sets up blockchain services on application startup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBlockchain = initializeBlockchain;
exports.shutdownBlockchain = shutdownBlockchain;
const verification_orchestrator_service_1 = require("./verification-orchestrator.service");
async function initializeBlockchain() {
    try {
        await verification_orchestrator_service_1.blockchainVerificationService.initialize();
        console.log('[Blockchain] Verification services initialized');
    }
    catch (error) {
        console.warn('[Blockchain] Initialization warning:', error);
    }
}
async function shutdownBlockchain() {
    console.log('[Blockchain] Shutting down services...');
}
exports.default = { initializeBlockchain, shutdownBlockchain };
//# sourceMappingURL=init.js.map