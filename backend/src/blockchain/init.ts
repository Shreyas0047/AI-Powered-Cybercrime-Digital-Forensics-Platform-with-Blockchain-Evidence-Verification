/**
 * Blockchain Module Initialization
 * Sets up blockchain services on application startup
 */

import { blockchainVerificationService } from './verification-orchestrator.service';

export async function initializeBlockchain(): Promise<void> {
  try {
    await blockchainVerificationService.initialize();
    console.log('[Blockchain] Verification services initialized');
  } catch (error) {
    console.warn('[Blockchain] Initialization warning:', error);
  }
}

export async function shutdownBlockchain(): Promise<void> {
  console.log('[Blockchain] Shutting down services...');
}

export default { initializeBlockchain, shutdownBlockchain };