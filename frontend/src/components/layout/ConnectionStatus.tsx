import { useEffect } from 'react';
import { Radio, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { cn } from '../../utils/helpers';

export function ConnectionStatus() {
  const { isConnected, connect, disconnect } = useRealtimeStore();

  useEffect(() => {
    // Auto-connect on mount
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const handleReconnect = () => {
    disconnect();
    setTimeout(() => connect(), 500);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
        <Radio className={cn('w-3.5 h-3.5', isConnected ? 'text-green-500' : 'text-slate-400')} />
        {isConnected ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-600">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-red-500">Offline</span>
          </>
        )}
      </div>

      {!isConnected && (
        <button
          onClick={handleReconnect}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Reconnect"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;