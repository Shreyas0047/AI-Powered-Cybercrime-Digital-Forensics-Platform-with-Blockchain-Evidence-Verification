/**
 * Blockchain Audit Panel Component
 * Displays blockchain audit log and tamper alerts
 */

import { useState, useEffect } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';
import { BlockchainEventType } from '../../types/blockchain';

export function BlockchainAuditPanel() {
  const [filters, setFilters] = useState({
    eventType: '',
    evidenceId: '',
  });
  const { auditLog, fetchAuditLog, isLoading } = useBlockchainStore();

  useEffect(() => {
    fetchAuditLog({
      eventType: filters.eventType || undefined,
      evidenceId: filters.evidenceId || undefined,
    });
  }, [filters, fetchAuditLog]);

  const getEventTypeColor = (eventType: BlockchainEventType) => {
    switch (eventType) {
      case BlockchainEventType.EVIDENCE_VERIFIED:
        return 'bg-green-100 text-green-800';
      case BlockchainEventType.EVIDENCE_REGISTERED:
        return 'bg-blue-100 text-blue-800';
      case BlockchainEventType.HASH_MISMATCH:
      case BlockchainEventType.TAMPER_DETECTED:
        return 'bg-red-100 text-red-800';
      case BlockchainEventType.VERIFICATION_FAILED:
        return 'bg-yellow-100 text-yellow-800';
      case BlockchainEventType.CHAIN_SYNC_COMPLETE:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Blockchain Audit Log</h3>
        <button
          onClick={() => fetchAuditLog(filters.eventType || filters.evidenceId ? filters : undefined)}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={filters.eventType}
          onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All Event Types</option>
          <option value={BlockchainEventType.EVIDENCE_REGISTERED}>Evidence Registered</option>
          <option value={BlockchainEventType.EVIDENCE_VERIFIED}>Evidence Verified</option>
          <option value={BlockchainEventType.HASH_MISMATCH}>Hash Mismatch</option>
          <option value={BlockchainEventType.TAMPER_DETECTED}>Tamper Detected</option>
          <option value={BlockchainEventType.VERIFICATION_FAILED}>Verification Failed</option>
          <option value={BlockchainEventType.CHAIN_SYNC_COMPLETE}>Chain Sync Complete</option>
        </select>

        <input
          type="text"
          placeholder="Evidence ID"
          value={filters.evidenceId}
          onChange={(e) => setFilters({ ...filters, evidenceId: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {auditLog.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No audit entries found</div>
        ) : (
          auditLog.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(entry.eventType as BlockchainEventType)}`}
                >
                  {formatEventType(entry.eventType)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{entry.details}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  {entry.evidenceId && (
                    <span className="font-mono truncate">ID: {entry.evidenceId}</span>
                  )}
                  {entry.transactionHash && (
                    <span className="font-mono truncate">
                      TX: {entry.transactionHash.substring(0, 10)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TamperAlertsPanel() {
  const { tamperAlerts, fetchTamperAlerts, acknowledgeAlert, isLoading } = useBlockchainStore();
  const [showUnacknowledgedOnly, setShowUnacknowledgedOnly] = useState(true);

  useEffect(() => {
    fetchTamperAlerts(showUnacknowledgedOnly);
  }, [showUnacknowledgedOnly, fetchTamperAlerts]);

  const handleAcknowledge = async (evidenceId: string, alertId: string) => {
    const notes = prompt('Add acknowledgment notes (optional):');
    await acknowledgeAlert(evidenceId, alertId, notes || undefined);
    fetchTamperAlerts(showUnacknowledgedOnly);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tamper Alerts</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showUnacknowledgedOnly}
            onChange={(e) => setShowUnacknowledgedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show unacknowledged only
        </label>
      </div>

      {isLoading && <div className="text-center text-gray-500 py-4">Loading...</div>}

      {!isLoading && tamperAlerts.length === 0 && (
        <div className="text-center text-gray-500 py-8">No tamper alerts found</div>
      )}

      <div className="space-y-3">
        {tamperAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}
                >
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(alert.detectedAt).toLocaleString()}
                </span>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(alert.evidenceId, alert.id)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Acknowledge
                </button>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="text-sm">
                <span className="text-gray-600">Evidence ID:</span>{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">{alert.evidenceId}</code>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Expected:</span>{' '}
                <code className="font-mono text-gray-600">{alert.expectedHash.substring(0, 16)}...</code>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Actual:</span>{' '}
                <code className="font-mono text-red-600">{alert.actualHash.substring(0, 16)}...</code>
              </div>
            </div>

            {alert.acknowledged && alert.acknowledgedAt && (
              <div className="mt-2 text-xs text-gray-500">
                Acknowledged by {alert.acknowledgedBy} on{' '}
                {new Date(alert.acknowledgedAt).toLocaleString()}
                {alert.notes && <span className="ml-2 italic">- {alert.notes}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlockchainAuditPanel;