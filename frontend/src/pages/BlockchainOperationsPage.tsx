/**
 * Blockchain Operations Page
 * Enterprise blockchain operational dashboard with sync, workers, and health monitoring
 */

import React from 'react';
import { BlockchainOperationsPanel } from '../components/blockchain/BlockchainOperationsPanel';
import { ReconciliationPanel } from '../components/blockchain/ReconciliationPanel';
import { useAuthStore } from '../stores/authStore';

export const BlockchainOperationsPage: React.FC = () => {
  const { user } = useAuthStore();

  // Check if user is admin (only admins can access some features)
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            Blockchain Operations
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Monitor and manage blockchain synchronization, verification queues, and system health
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Operations Panel */}
          <BlockchainOperationsPanel />

          {/* Reconciliation Panel - Admin Only */}
          {isAdmin && (
            <ReconciliationPanel />
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-cyan-400 mb-2">
            About Blockchain Operations
          </h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <strong className="text-slate-300">Synchronization:</strong> Manages the registration and verification of evidence on the blockchain</li>
            <li>• <strong className="text-slate-300">Verification Queue:</strong> Processes distributed verification jobs for evidence integrity</li>
            <li>• <strong className="text-slate-300">System Health:</strong> Monitors blockchain connection and data integrity metrics</li>
            <li>• <strong className="text-slate-300">Reconciliation:</strong> Detects and resolves inconsistencies between database and blockchain records</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BlockchainOperationsPage;