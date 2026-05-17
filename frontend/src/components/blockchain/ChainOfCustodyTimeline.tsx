/**
 * Chain of Custody Timeline Component
 * Visualizes evidence custody chain with verification history
 */

import { useEffect, useState } from 'react';
import api from '../../services/api';

interface CustodyEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  performedByName: string;
  details: string;
  integrityStatus?: string;
  transactionHash?: string;
}

interface ChainOfCustodyProps {
  evidenceId: string;
}

interface ChainResponse {
  chain: {
    events: CustodyEvent[];
    integrityStatus: string;
    blockchainVerified: boolean;
  };
}

export const ChainOfCustodyTimeline: React.FC<ChainOfCustodyProps> = ({ evidenceId }) => {
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState<string>('unknown');
  const [blockchainVerified, setBlockchainVerified] = useState(false);

  useEffect(() => {
    fetchChainOfCustody();
  }, [evidenceId]);

  const fetchChainOfCustody = async () => {
    try {
      setLoading(true);
      const response = await api.get<ChainResponse>(`/custody/chain/${evidenceId}`);
      if (response.success && response.data?.chain) {
        setEvents(response.data.chain.events || []);
        setIntegrityStatus(response.data.chain.integrityStatus || 'unknown');
        setBlockchainVerified(response.data.chain.blockchainVerified || false);
      }
    } catch (error) {
      console.error('Failed to fetch chain of custody:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      evidence_created: '📝',
      evidence_uploaded: '📤',
      verification_registered: '🔐',
      blockchain_synced: '⛓️',
      investigation_linked: '🔗',
      analyst_accessed: '👤',
      integrity_checked: '✅',
      verification_completed: '✓',
      verification_failed: '✗',
      tamper_detected: '⚠️',
      evidence_modified: '📝',
      custody_transferred: '➡️',
      blockchain_confirmed: '🔗',
    };
    return icons[eventType] || '📋';
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('tamper') || eventType.includes('failed')) return 'border-l-red-500';
    if (eventType.includes('verified') || eventType.includes('completed')) return 'border-l-green-500';
    if (eventType.includes('blockchain')) return 'border-l-blue-500';
    if (eventType.includes('modified')) return 'border-l-orange-500';
    return 'border-l-gray-400';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      syncing: 'bg-blue-100 text-blue-800',
      integrity_mismatch: 'bg-red-100 text-red-800',
      tamper_suspected: 'bg-red-100 text-red-800',
      verification_failed: 'bg-red-100 text-red-800',
      blockchain_unavailable: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Chain of Custody</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(integrityStatus)}`}>
              {integrityStatus.replace(/_/g, ' ').toUpperCase()}
            </span>
            {blockchainVerified && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                🔗 ON-CHAIN
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No custody events recorded
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Events */}
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.eventId}
                  className={`relative pl-12 border-l-2 ${getEventColor(event.eventType)} py-2`}
                >
                  {/* Icon */}
                  <div className="absolute left-3 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-sm">
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>👤 {event.performedByName}</span>
                          <span>•</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Blockchain reference */}
                    {event.transactionHash && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
                        Tx: {event.transactionHash.substring(0, 10)}...{event.transactionHash.substring(event.transactionHash.length - 8)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChainOfCustodyTimeline;