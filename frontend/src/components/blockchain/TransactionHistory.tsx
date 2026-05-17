/**
 * Transaction History Component
 * Display blockchain transaction history
 */

import { useState } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';

export function TransactionHistory() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all');
  const { transactions, isLoading } = useBlockchainStore();

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return tx.status === 'pending' || tx.status === 'confirming';
    if (filter === 'confirmed') return tx.status === 'confirmed';
    if (filter === 'failed') return tx.status === 'failed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'confirming':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === f
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-center text-gray-500 py-4">Loading transactions...</div>}

      {!isLoading && filteredTransactions.length === 0 && (
        <div className="text-center text-gray-500 py-8">No transactions found</div>
      )}

      <div className="space-y-3">
        {filteredTransactions.map((tx) => (
          <div
            key={tx.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {getTypeLabel(tx.type)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>ID: {tx.id}</p>
                  {tx.transactionHash && (
                    <p className="font-mono truncate">TX: {tx.transactionHash}</p>
                  )}
                  <p>Confirmations: {tx.confirmations}/{tx.requiredConfirmations}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
                {tx.gasUsed && (
                  <p className="text-xs text-gray-400 mt-1">
                    Gas: {tx.gasUsed}
                  </p>
                )}
              </div>
            </div>

            {tx.error && (
              <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
                Error: {tx.error}
              </div>
            )}

            {tx.status === 'failed' && (
              <button className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Retry Transaction
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionHistory;