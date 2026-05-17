/**
 * Reconciliation Panel
 * Displays and manages blockchain reconciliation issues
 */

import React, { useEffect, useState } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';

interface ReconciliationIssue {
  id: string;
  type: 'hash_mismatch' | 'orphan_record' | 'sync_failure' | 'transaction_failure' | 'drift_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidenceId?: string;
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolution?: string;
}

export const ReconciliationPanel: React.FC = () => {
  const {
    reconciliationIssues,
    reconciliationStats,
    fetchReconciliationIssues,
    fetchReconciliationStats,
    resolveReconciliationIssue,
    runReconciliation,
    isLoading,
  } = useBlockchainStore();

  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [showResolved, setShowResolved] = useState(false);
  const [resolveModal, setResolveModal] = useState<ReconciliationIssue | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    fetchReconciliationIssues(selectedSeverity || undefined);
    fetchReconciliationStats();
  }, [fetchReconciliationIssues, fetchReconciliationStats, selectedSeverity]);

  const handleResolve = async () => {
    if (resolveModal && resolutionText) {
      await resolveReconciliationIssue(resolveModal.id, resolutionText);
      setResolveModal(null);
      setResolutionText('');
      fetchReconciliationIssues(selectedSeverity || undefined);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hash_mismatch':
        return 'Hash Mismatch';
      case 'orphan_record':
        return 'Orphan Record';
      case 'sync_failure':
        return 'Sync Failure';
      case 'transaction_failure':
        return 'Transaction Failure';
      case 'drift_detected':
        return 'Integrity Drift';
      default:
        return type;
    }
  };

  const filteredIssues = showResolved
    ? reconciliationIssues
    : reconciliationIssues.filter(i => !i.resolved);

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Blockchain Reconciliation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Detect and resolve inconsistencies in blockchain records
            </p>
          </div>
          <button
            onClick={() => runReconciliation()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Run Full Reconciliation
          </button>
        </div>
      </div>

      {/* Stats */}
      {reconciliationStats && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{reconciliationStats.totalIssues}</div>
              <div className="text-xs text-gray-500">Total Issues</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{reconciliationStats.bySeverity?.critical ?? 0}</div>
              <div className="text-xs text-gray-500">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{reconciliationStats.bySeverity?.high ?? 0}</div>
              <div className="text-xs text-gray-500">High</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{reconciliationStats.resolvedToday}</div>
              <div className="text-xs text-gray-500">Resolved Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{reconciliationStats.autoResolved}</div>
              <div className="text-xs text-gray-500">Auto-Resolved</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Severity Filter:</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showResolved"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showResolved" className="text-sm text-gray-600">
              Show Resolved
            </label>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="p-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No reconciliation issues found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded uppercase ${
                        issue.severity === 'critical' ? 'bg-red-200' :
                        issue.severity === 'high' ? 'bg-orange-200' :
                        issue.severity === 'medium' ? 'bg-yellow-200' : 'bg-gray-200'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-sm font-medium">{getTypeLabel(issue.type)}</span>
                      {issue.resolved && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-200 text-green-800">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{issue.description}</p>
                    {issue.evidenceId && (
                      <p className="text-xs mt-1 opacity-75">Evidence ID: {issue.evidenceId}</p>
                    )}
                    <p className="text-xs mt-1 opacity-75">
                      Detected: {new Date(issue.detectedAt).toLocaleString()}
                    </p>
                    {issue.resolution && (
                      <p className="text-sm mt-2 font-medium">Resolution: {issue.resolution}</p>
                    )}
                  </div>
                  {!issue.resolved && (
                    <button
                      onClick={() => setResolveModal(issue)}
                      className="ml-4 px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Resolve Issue</h3>
            <p className="text-sm text-gray-600 mb-4">
              Issue: {resolveModal.description}
            </p>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Enter resolution description..."
              className="w-full border border-gray-300 rounded-md p-3 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResolveModal(null);
                  setResolutionText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionText}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPanel;