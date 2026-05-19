/**
 * Live Activity Stream
 * Real-time activity feed with animated event streaming
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Shield,
  Terminal,
  FileText,
  Network,
  Cpu,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface ActivityEvent {
  id: string;
  type: 'alert' | 'investigation' | 'evidence' | 'analysis' | 'system' | 'network';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  timestamp: Date;
  source?: string;
}

interface LiveActivityStreamProps {
  events?: ActivityEvent[];
  maxHeight?: string;
  autoStream?: boolean;
  title?: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { icon: Shield, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  low: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  info: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

const typeIcons = {
  alert: AlertTriangle,
  investigation: Search,
  evidence: FileText,
  analysis: Cpu,
  system: Terminal,
  network: Network,
};

const generateMockEvent = (): ActivityEvent => {
  const types: ActivityEvent['type'][] = ['alert', 'investigation', 'evidence', 'analysis', 'system', 'network'];
  const severities: ActivityEvent['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];

  const mockEvents = [
    { title: 'Suspicious PowerShell Execution', description: 'Detected encoded command execution in sandbox' },
    { title: 'New Evidence Uploaded', description: 'Malware sample added to investigation INV-2024-5A3B' },
    { title: 'AI Analysis Complete', description: 'Behavioral classification: ransomware-like (94% confidence)' },
    { title: 'Alert Acknowledged', description: 'Analyst acknowledged critical alert #1247' },
    { title: 'Network Connection Detected', description: 'Outbound connection to suspicious IP 192.168.1.100' },
    { title: 'File Modified', description: '247 files encrypted in C:\\Users directory' },
    { title: 'Registry Persistence Attempt', description: 'HKLM\\Run key modification detected' },
    { title: 'Process Spawned', description: 'cmd.exe spawned by suspicious process' },
  ];

  const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const severity = type === 'alert' ? severities[Math.floor(Math.random() * 3)] : 'info';

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    ...randomEvent,
    timestamp: new Date(),
    source: 'Sandbox Agent',
  };
};

export function LiveActivityStream({
  events: initialEvents,
  maxHeight = '400px',
  autoStream = true,
  title = 'Live Activity',
}: LiveActivityStreamProps) {
  const { isDark } = useTheme();
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents || []);
  const [isStreaming, setIsStreaming] = useState(autoStream);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousLengthRef = useRef(events.length);

  useEffect(() => {
    if (!initialEvents) {
      setEvents([
        {
          id: '1',
          type: 'alert',
          severity: 'critical',
          title: 'Ransomware Behavior Detected',
          description: 'Mass file encryption pattern detected in sandbox session',
          timestamp: new Date(Date.now() - 60000),
          source: 'Behavioral Engine',
        },
        {
          id: '2',
          type: 'analysis',
          severity: 'high',
          title: 'AI Classification Complete',
          description: 'Sample classified as LockBit variant with 94% confidence',
          timestamp: new Date(Date.now() - 120000),
          source: 'AI Engine',
        },
        {
          id: '3',
          type: 'evidence',
          severity: 'info',
          title: 'Evidence Extracted',
          description: '3 artifacts extracted from sandbox session',
          timestamp: new Date(Date.now() - 180000),
          source: 'Sandbox Agent',
        },
      ]);
    }
  }, [initialEvents]);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const newEvent = generateMockEvent();
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  useEffect(() => {
    if (events.length > previousLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    previousLengthRef.current = events.length;
  }, [events.length]);

  const filteredEvents = events.filter((event) => {
    if (filter !== 'all' && event.type !== filter) return false;
    return true;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-4 border-b',
        isDark ? 'border-slate-700/50' : 'border-slate-200'
      )}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
            {isStreaming && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className={cn(
            'text-base font-semibold',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            {title}
          </h3>
          <span className={cn(
            'px-2 py-0.5 text-xs rounded-full',
            isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
          )}>
            {filteredEvents.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border outline-none',
              isDark
                ? 'bg-slate-700 border-slate-600 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            )}
          >
            <option value="all">All Types</option>
            <option value="alert">Alerts</option>
            <option value="investigation">Investigations</option>
            <option value="evidence">Evidence</option>
            <option value="analysis">Analysis</option>
            <option value="system">System</option>
            <option value="network">Network</option>
          </select>

          {/* Streaming Toggle */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isStreaming
                ? 'bg-emerald-500/10 text-emerald-500'
                : isDark
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-slate-100 text-slate-500'
            )}
          >
            {isStreaming ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Paused
              </>
            )}
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        <div className="p-2">
          <AnimatePresence initial={false}>
            {filteredEvents.map((event, index) => {
              const severityStyle = event.severity ? severityConfig[event.severity] : severityConfig.info;
              const TypeIcon = typeIcons[event.type];
              const Icon = severityStyle.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'mb-2 p-3 rounded-xl border transition-all duration-200',
                    severityStyle.bg,
                    severityStyle.border,
                    'hover:shadow-md'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'mt-0.5 p-2 rounded-lg',
                      isDark ? 'bg-slate-800/50' : 'bg-white'
                    )}>
                      <Icon className={cn('w-4 h-4', severityStyle.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-mono',
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        )}>
                          {formatTime(event.timestamp)}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                        )}>
                          {event.type}
                        </span>
                        {event.severity && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-xs rounded font-medium capitalize',
                            severityStyle.bg,
                            severityStyle.color
                          )}>
                            {event.severity}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        'text-sm font-medium mt-1',
                        isDark ? 'text-slate-200' : 'text-slate-700'
                      )}>
                        {event.title}
                      </p>
                      <p className={cn(
                        'text-xs mt-1',
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      )}>
                        {event.description}
                      </p>
                      {event.source && (
                        <p className={cn(
                          'text-xs mt-2',
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        )}>
                          Source: {event.source}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredEvents.length === 0 && (
            <div className={cn(
              'flex flex-col items-center justify-center py-12',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}>
              <Activity className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No activity events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveActivityStream;