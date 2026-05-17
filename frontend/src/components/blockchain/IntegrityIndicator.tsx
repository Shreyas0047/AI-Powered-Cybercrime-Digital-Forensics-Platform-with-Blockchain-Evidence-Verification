/**
 * Integrity Indicator Component
 * Visual indicator for evidence integrity status
 */

import { VerificationStatus, EvidenceIntegrityState } from '../../types/blockchain';

interface IntegrityIndicatorProps {
  integrityState: EvidenceIntegrityState;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
}

const getStateConfig = (state: EvidenceIntegrityState) => {
  switch (state) {
    case EvidenceIntegrityState.INTACT:
      return {
        color: '#22c55e',
        bgColor: '#22c55e20',
        label: 'Verified',
        icon: '✓',
        description: 'Evidence integrity verified - file matches recorded hash',
      };
    case EvidenceIntegrityState.MODIFIED:
      return {
        color: '#ef4444',
        bgColor: '#ef444420',
        label: 'Modified',
        icon: '⚠',
        description: 'File has been modified - hash mismatch detected',
      };
    case EvidenceIntegrityState.VERIFICATION_FAILED:
      return {
        color: '#f59e0b',
        bgColor: '#f59e0b20',
        label: 'Failed',
        icon: '✗',
        description: 'Verification failed - unable to check integrity',
      };
    case EvidenceIntegrityState.UNKNOWN:
    default:
      return {
        color: '#6b7280',
        bgColor: '#6b728020',
        label: 'Pending',
        icon: '?',
        description: 'No verification performed yet',
      };
  }
};

const sizeClasses = {
  small: 'w-3 h-3 text-xs',
  medium: 'w-4 h-4 text-sm',
  large: 'w-5 h-5 text-base',
};

export function IntegrityIndicator({
  integrityState,
  size = 'medium',
  showLabel = false,
  showTooltip = true,
}: IntegrityIndicatorProps) {
  const config = getStateConfig(integrityState);

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`inline-flex items-center justify-center rounded-full font-bold ${sizeClasses[size]}`}
        style={{
          color: config.color,
          backgroundColor: config.bgColor,
          width: size === 'small' ? '12px' : size === 'large' ? '24px' : '16px',
          height: size === 'small' ? '12px' : size === 'large' ? '24px' : '16px',
        }}
        title={showTooltip ? config.description : undefined}
      >
        {config.icon}
      </div>
      {showLabel && (
        <span style={{ color: config.color }} className="font-medium">
          {config.label}
        </span>
      )}
    </div>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return 'bg-green-100 text-green-800 border-green-200';
      case VerificationStatus.MODIFIED:
        return 'bg-red-100 text-red-800 border-red-200';
      case VerificationStatus.FAILED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case VerificationStatus.ON_CHAIN:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case VerificationStatus.PENDING:
      case VerificationStatus.SYNCING:
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export function HashDisplay({ hash, label, truncate = true }: { hash: string; label?: string; truncate?: boolean }) {
  const displayHash = truncate && hash.length > 16
    ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
    : hash;

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-gray-500 font-medium">{label}</span>}
      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 break-all">
        {displayHash}
      </code>
    </div>
  );
}

export function BlockchainStatusIndicator({
  connected,
  networkName,
  chainId,
}: {
  connected: boolean;
  networkName?: string;
  chainId?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      <span className="text-sm text-gray-600">
        {connected ? `${networkName} (Chain: ${chainId})` : 'Offline'}
      </span>
    </div>
  );
}

export default IntegrityIndicator;