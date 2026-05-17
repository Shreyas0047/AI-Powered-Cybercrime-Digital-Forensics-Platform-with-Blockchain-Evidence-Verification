/**
 * Blockchain Dashboard Component
 * Main dashboard for blockchain verification status
 */

import { useState, useEffect } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';

export function BlockchainDashboard() {
  const { status, stats, fetchStatus, fetchStats, isLoading } = useBlockchainStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'alerts'>('overview');

  useEffect(() => {
    fetchStatus();
    fetchStats();
  }, [fetchStatus, fetchStats]);

  const getNetworkStatusColor = (available: boolean) => {
    return available ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  const getStatusLabel = (available: boolean, networkName?: string) => {
    return available ? `Connected to ${networkName || 'Network'}` : 'Offline Mode';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Blockchain Verification</h2>
        <button
          onClick={() => {
            fetchStatus();
            fetchStats();
          }}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Network Status */}
      <div className={`p-4 rounded-lg mb-6 ${getNetworkStatusColor(status?.available || false)}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status?.available ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div>
            <p className="font-medium">{getStatusLabel(status?.available || false, status?.networkName)}</p>
            {status?.available && (
              <p className="text-sm opacity-80">Chain ID: {status.chainId} | Block: #{status.blockNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'transactions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'alerts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Alerts
          {stats && stats.tamperAlerts > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {stats.tamperAlerts}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Evidence"
            value={stats.totalEvidence}
            color="blue"
          />
          <StatCard
            label="Verified"
            value={stats.verified}
            color="green"
          />
          <StatCard
            label="Modified"
            value={stats.modified}
            color="red"
          />
          <StatCard
            label="On Chain"
            value={stats.blockchainOnChain}
            color="purple"
          />
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="text-center text-gray-500 py-8">
          Transaction history panel - view from /transactions endpoint
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="text-center text-gray-500 py-8">
          Tamper alerts panel - view from /alerts endpoint
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'red' | 'purple' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

export default BlockchainDashboard;