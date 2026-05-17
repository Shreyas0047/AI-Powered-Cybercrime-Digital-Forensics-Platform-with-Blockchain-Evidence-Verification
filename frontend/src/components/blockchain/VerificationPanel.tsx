/**
 * Verification Panel Component
 * UI for blockchain verification operations
 */

import { useState } from 'react';
import { useBlockchainStore } from '../../stores/blockchainStore';
import { IntegrityIndicator, VerificationStatusBadge, HashDisplay } from './IntegrityIndicator';
import { VerificationStatus, EvidenceIntegrityState } from '../../types/blockchain';

interface VerificationPanelProps {
  evidenceId: string;
  currentHash?: string;
  filePath?: string;
  onVerifyComplete?: (result: any) => void;
}

export function VerificationPanel({
  evidenceId,
  currentHash,
  filePath,
  onVerifyComplete,
}: VerificationPanelProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyEvidence, verificationHistory } = useBlockchainStore();

  const history = verificationHistory.get(evidenceId) || [];

  const handleVerify = async () => {
    if (!filePath) return;

    setIsVerifying(true);
    try {
      const result = await verifyEvidence(evidenceId, filePath);
      if (onVerifyComplete) {
        onVerifyComplete(result);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const getIntegrityState = (status: VerificationStatus): EvidenceIntegrityState => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return EvidenceIntegrityState.INTACT;
      case VerificationStatus.MODIFIED:
        return EvidenceIntegrityState.MODIFIED;
      case VerificationStatus.FAILED:
        return EvidenceIntegrityState.VERIFICATION_FAILED;
      default:
        return EvidenceIntegrityState.UNKNOWN;
    }
  };

  const latestStatus = history[0]?.status || VerificationStatus.PENDING;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Evidence Verification</h3>
        <VerificationStatusBadge status={latestStatus} />
      </div>

      {currentHash && (
        <div className="space-y-2">
          <HashDisplay hash={currentHash} label="SHA-256 Fingerprint" />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Integrity:</span>
          <IntegrityIndicator
            integrityState={getIntegrityState(latestStatus)}
            showLabel
          />
        </div>
      </div>

      {filePath && (
        <button
          onClick={handleVerify}
          disabled={isVerifying || !filePath}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isVerifying
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isVerifying ? 'Verifying...' : 'Verify Integrity'}
        </button>
      )}

      {history.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Verification History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((record, index) => (
              <div
                key={record.id || index}
                className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <IntegrityIndicator
                    integrityState={getIntegrityState(record.status)}
                    size="small"
                  />
                  <span className="text-gray-600">{record.method}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(record.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function VerificationStatsPanel() {
  const { stats, status, fetchStatus, fetchStats, isLoading } = useBlockchainStore();

  const handleRefresh = async () => {
    await Promise.all([fetchStatus(), fetchStats()]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Blockchain Verification</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {status && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded">
          <div className={`w-2 h-2 rounded-full ${status.available ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {status.available
              ? `${status.networkName} - Block #${status.blockNumber}`
              : 'Offline Mode'}
          </span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-xs text-green-700">Verified</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.modified}</div>
            <div className="text-xs text-red-700">Modified</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.blockchainOnChain}</div>
            <div className="text-xs text-blue-700">On Chain</div>
          </div>
        </div>
      )}

      {stats && stats.tamperAlerts > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <span className="font-medium">⚠ Tamper Alerts:</span>
            <span>{stats.tamperAlerts}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationPanel;