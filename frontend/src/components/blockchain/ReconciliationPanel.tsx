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
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-slate-700/30 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600';
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
    <div className="bg-slate-800/50 rounded-lg shadow-md border border-slate-700">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Blockchain Reconciliation
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Detect and resolve inconsistencies in blockchain records
            </p>
          </div>
          <button
            onClick={() => runReconciliation()}
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 text-sm"
          >
            Run Full Reconciliation
          </button>
        </div>
      </div>

      {/* Stats */}
      {reconciliationStats && (
        <div className="border-b border-slate-700 p-4 bg-slate-800/50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{reconciliationStats.totalIssues}</div>
              <div className="text-xs text-slate-400">Total Issues</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{reconciliationStats.bySeverity?.critical ?? 0}</div>
              <div className="text-xs text-slate-400">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{reconciliationStats.bySeverity?.high ?? 0}</div>
              <div className="text-xs text-slate-400">High</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{reconciliationStats.resolvedToday}</div>
              <div className="text-xs text-slate-400">Resolved Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">{reconciliationStats.autoResolved}</div>
              <div className="text-xs text-slate-400">Auto-Resolved</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Severity Filter:</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="border border-slate-600 bg-slate-700 rounded-md px-3 py-1 text-sm text-slate-200"
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
            <label htmlFor="showResolved" className="text-sm text-slate-400">
              Show Resolved
            </label>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="p-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No reconciliation issues found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`border rounded-lg p-4 ${
                  issue.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  issue.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                  issue.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-slate-700/30 border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded uppercase ${
                        issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600 text-slate-300'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-sm font-medium text-white">{getTypeLabel(issue.type)}</span>
                      {issue.resolved && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">{issue.description}</p>
                    {issue.evidenceId && (
                      <p className="text-xs mt-1 text-slate-400">Evidence ID: {issue.evidenceId}</p>
                    )}
                    <p className="text-xs mt-1 text-slate-500">
                      Detected: {new Date(issue.detectedAt).toLocaleString()}
                    </p>
                    {issue.resolution && (
                      <p className="text-sm mt-2 font-medium text-slate-300">Resolution: {issue.resolution}</p>
                    )}
                  </div>
                  {!issue.resolved && (
                    <button
                      onClick={() => setResolveModal(issue)}
                      className="ml-4 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 hover:bg-slate-600"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-medium mb-4 text-white">Resolve Issue</h3>
            <p className="text-sm text-slate-400 mb-4">
              Issue: {resolveModal.description}
            </p>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Enter resolution description..."
              className="w-full border border-slate-600 bg-slate-700 rounded-md p-3 text-sm text-slate-200 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResolveModal(null);
                  setResolutionText('');
                }}
                className="px-4 py-2 border border-slate-600 rounded-md text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionText}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md text-sm hover:bg-cyan-700 disabled:opacity-50"
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