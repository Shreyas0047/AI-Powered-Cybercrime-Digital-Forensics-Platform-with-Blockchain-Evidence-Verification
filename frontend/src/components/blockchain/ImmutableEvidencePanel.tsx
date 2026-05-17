/**
 * Immutable Evidence Panel Component
 * Display evidence with blockchain verification status
 */

import { useState } from 'react';
import { IntegrityIndicator, VerificationStatusBadge, HashDisplay } from './IntegrityIndicator';
import { useBlockchainStore } from '../../stores/blockchainStore';
import { VerificationStatus, EvidenceIntegrityState } from '../../types/blockchain';

interface ImmutableEvidencePanelProps {
  evidenceId: string;
  evidenceName: string;
  currentHash?: string;
  blockchainHash?: string;
  verificationStatus?: VerificationStatus;
  integrityState?: EvidenceIntegrityState;
  transactionHash?: string;
  onVerify?: () => void;
  onRegister?: () => void;
}

export function ImmutableEvidencePanel({
  evidenceId,
  evidenceName,
  currentHash,
  blockchainHash,
  verificationStatus,
  integrityState,
  transactionHash,
  onVerify,
  onRegister,
}: ImmutableEvidencePanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { status } = useBlockchainStore();

  const isVerified = verificationStatus === VerificationStatus.VERIFIED;
  const isOnChain = !!blockchainHash && !!transactionHash;
  const isModified = verificationStatus === VerificationStatus.MODIFIED;

  const getStateFromStatus = (status?: VerificationStatus): EvidenceIntegrityState => {
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

  return (
    <div className={`bg-white border rounded-lg p-4 ${isModified ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <IntegrityIndicator integrityState={integrityState || getStateFromStatus(verificationStatus)} showLabel />
          <h3 className="font-semibold text-gray-900 truncate max-w-xs">{evidenceName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isVerified && <span className="text-xs text-green-600 font-medium">Verified</span>}
          {isOnChain && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              On Chain
            </span>
          )}
          {isModified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Tamper Detected
            </span>
          )}
        </div>
      </div>

      {/* Hash Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {currentHash && (
          <HashDisplay hash={currentHash} label="Local SHA-256" truncate />
        )}
        {blockchainHash && (
          <HashDisplay hash={blockchainHash} label="Blockchain SHA-256" truncate />
        )}
      </div>

      {/* Transaction Info */}
      {transactionHash && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Transaction</span>
              <p className="font-mono text-sm text-gray-700 truncate">{transactionHash}</p>
            </div>
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              View on Explorer
            </a>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        {onVerify && (
          <button
            onClick={onVerify}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Verify Integrity
          </button>
        )}
        {onRegister && status?.available && (
          <button
            onClick={onRegister}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            Register on Blockchain
          </button>
        )}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Evidence Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Evidence ID:</span>
              <span className="font-mono">{evidenceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Verification Status:</span>
              <VerificationStatusBadge status={verificationStatus || VerificationStatus.PENDING} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Integrity State:</span>
              <span>{integrityState || 'Unknown'}</span>
            </div>
            {blockchainHash && (
              <div className="flex justify-between">
                <span className="text-gray-500">Hash Match:</span>
                <span className={currentHash === blockchainHash ? 'text-green-600' : 'text-red-600'}>
                  {currentHash === blockchainHash ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImmutableEvidencePanel;