/**
 * Blockchain Operations Panel
 * Displays synchronization status, verification queues, and operational metrics
 */

import { useEffect, useState } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';

interface SyncStatusDisplay {
  lastSyncTimestamp: string | null;
  lastSuccessfulSync: string | null;
  pendingOperations: number;
  failedOperations: number;
  totalSynced: number;
  blockchainConfirmed: number;
  syncHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface HealthDisplay {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  blockchainConnection: boolean;
  verificationSuccessRate: number;
  syncQueueHealth: number;
  dataIntegrityScore: number;
  issues: string[];
}

export const BlockchainOperationsPanel: React.FC = () => {
  const {
    syncState,
    syncQueueStatus,
    workerStats,
    healthMetrics,
    fetchSyncStatus,
    fetchWorkerStatus,
    fetchHealthMetrics,
    processSyncQueue,
    retryFailedSync,
    runReconciliation,
    isLoading,
  } = useBlockchainStore();

  const [activeTab, setActiveTab] = useState<'sync' | 'worker' | 'health'>('sync');

  useEffect(() => {
    fetchSyncStatus();
    fetchWorkerStatus();
    fetchHealthMetrics();

    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchWorkerStatus();
      fetchHealthMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSyncStatus, fetchWorkerStatus, fetchHealthMetrics]);

  const handleProcessQueue = async () => {
    try {
      await processSyncQueue();
      fetchSyncStatus();
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailedSync();
      fetchSyncStatus();
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  };

  const handleRunReconciliation = async () => {
    try {
      await runReconciliation();
    } catch (error) {
      console.error('Failed to run reconciliation:', error);
    }
  };

  const getHealthColor = (status: HealthDisplay['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSyncHealthColor = (health: SyncStatusDisplay['syncHealth']) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Blockchain Operations
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Synchronization status, verification queues, and system health
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'sync'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Synchronization
        </button>
        <button
          onClick={() => setActiveTab('worker')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'worker'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Verification Queue
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'health'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          System Health
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'sync' && (
          <div className="space-y-4">
            {/* Sync Health Badge */}
            {syncState && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSyncHealthColor(syncState.syncHealth)}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  syncState.syncHealth === 'healthy' ? 'bg-green-500' :
                  syncState.syncHealth === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                Health: {syncState.syncHealth.charAt(0).toUpperCase() + syncState.syncHealth.slice(1)}
              </div>
            )}

            {/* Sync Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Pending</div>
                <div className="text-2xl font-bold text-gray-900">
                  {syncState?.pendingOperations ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {syncState?.failedOperations ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Total Synced</div>
                <div className="text-2xl font-bold text-green-600">
                  {syncState?.totalSynced ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">On Chain</div>
                <div className="text-2xl font-bold text-blue-600">
                  {syncState?.blockchainConfirmed ?? 0}
                </div>
              </div>
            </div>

            {/* Queue Status */}
            {syncQueueStatus && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Queue Status</h3>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{syncQueueStatus.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">{syncQueueStatus.pending}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{syncQueueStatus.inProgress}</div>
                    <div className="text-xs text-gray-500">Processing</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{syncQueueStatus.completed}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{syncQueueStatus.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                Last Sync: {syncState?.lastSyncTimestamp
                  ? new Date(syncState.lastSyncTimestamp).toLocaleString()
                  : 'Never'}
              </div>
              <div>
                Last Success: {syncState?.lastSuccessfulSync
                  ? new Date(syncState.lastSuccessfulSync).toLocaleString()
                  : 'Never'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleProcessQueue}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Process Queue
              </button>
              <button
                onClick={handleRetryFailed}
                disabled={isLoading || (syncState?.failedOperations ?? 0) === 0}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                Retry Failed
              </button>
              <button
                onClick={handleRunReconciliation}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                Run Reconciliation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'worker' && (
          <div className="space-y-4">
            {/* Worker Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Total Jobs</div>
                <div className="text-2xl font-bold text-gray-900">
                  {workerStats?.totalJobs ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Queued</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {workerStats?.queued ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Processing</div>
                <div className="text-2xl font-bold text-blue-600">
                  {workerStats?.processing ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {workerStats?.completed ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {workerStats?.failed ?? 0}
                </div>
              </div>
            </div>

            {/* Priority Distribution */}
            {workerStats?.byPriority && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">By Priority</h3>
                <div className="flex gap-4">
                  {Object.entries(workerStats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        priority === 'critical' ? 'bg-red-500' :
                        priority === 'high' ? 'bg-orange-500' :
                        priority === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-sm capitalize">{priority}: </span>
                      <span className="text-sm font-medium ml-1">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!workerStats || workerStats.totalJobs === 0) && (
              <div className="text-center py-8 text-gray-500">
                No verification jobs in queue
              </div>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div className="space-y-4">
            {/* Health Score */}
            {healthMetrics && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">System Health Score</div>
                  <div className={`text-3xl font-bold ${getHealthColor(healthMetrics.status)}`}>
                    {healthMetrics.score}/100
                  </div>
                </div>

                {/* Health Status Badge */}
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  healthMetrics.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  healthMetrics.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Status: {healthMetrics.status.charAt(0).toUpperCase() + healthMetrics.status.slice(1)}
                </div>

                {/* Health Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Blockchain Connection</div>
                    <div className={`text-lg font-medium ${healthMetrics.blockchainConnection ? 'text-green-600' : 'text-red-600'}`}>
                      {healthMetrics.blockchainConnection ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Verification Success</div>
                    <div className="text-lg font-medium text-gray-900">
                      {healthMetrics.verificationSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Sync Queue Health</div>
                    <div className="text-lg font-medium text-gray-900">
                      {healthMetrics.syncQueueHealth.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2 md:col-span-1">
                    <div className="text-sm text-gray-500">Data Integrity</div>
                    <div className="text-lg font-medium text-gray-900">
                      {healthMetrics.dataIntegrityScore.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {healthMetrics.issues.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-800 mb-2">
                      Issues Detected ({healthMetrics.issues.length})
                    </h3>
                    <ul className="space-y-1">
                      {healthMetrics.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-start">
                          <span className="mr-2">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {healthMetrics.issues.length === 0 && (
                  <div className="bg-green-50 rounded-lg p-4 text-center text-green-700">
                    No issues detected - system is healthy
                  </div>
                )}
              </>
            )}

            {!healthMetrics && (
              <div className="text-center py-8 text-gray-500">
                Loading health metrics...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainOperationsPanel;