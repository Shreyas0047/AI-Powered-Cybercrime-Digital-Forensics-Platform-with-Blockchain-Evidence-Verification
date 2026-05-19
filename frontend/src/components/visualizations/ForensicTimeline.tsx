/**
 * Forensic Timeline Component
 * Interactive visualization of forensic events over time
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Activity,
  AlertTriangle,
  FileText,
  Terminal,
  Network,
  Cpu,
  Fingerprint,
  Shield,
  X,
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'process' | 'file' | 'network' | 'registry' | 'alert' | 'analysis';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  details?: Record<string, string>;
  mitreTechniques?: string[];
}

interface ForensicTimelineProps {
  events?: TimelineEvent[];
  title?: string;
  maxHeight?: string;
}

const severityColors = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    dot: 'bg-red-500',
  },
  high: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    dot: 'bg-blue-500',
  },
};

const typeIcons = {
  process: Cpu,
  file: FileText,
  network: Network,
  registry: Fingerprint,
  alert: AlertTriangle,
  analysis: Activity,
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatDuration = (start: Date, end: Date) => {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

export function ForensicTimeline({
  events = [],
  title = 'Forensic Timeline',
  maxHeight = '600px',
}: ForensicTimelineProps) {
  const { isDark } = useTheme();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mockEvents: TimelineEvent[] = events.length > 0 ? events : [
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000),
      type: 'process',
      severity: 'info',
      title: 'Process Started',
      description: 'threat_file_1.exe spawned by explorer.exe',
      details: { PID: '4892', PPID: '3544', Path: 'C:\\Windows\\System32' },
      mitreTechniques: ['T1059'],
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 280000),
      type: 'network',
      severity: 'medium',
      title: 'Network Connection',
      description: 'Outbound connection to 192.168.1.100 on port 4444',
      details: { Destination: '192.168.1.100', Port: '4444', Protocol: 'TCP' },
      mitreTechniques: ['T1071'],
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 250000),
      type: 'file',
      severity: 'high',
      title: 'File Modification',
      description: 'Mass file encryption detected in C:\\Users',
      details: { Files: '247', Extensions: '.locked', Directory: 'C:\\Users\\' },
      mitreTechniques: ['T1486'],
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 220000),
      type: 'registry',
      severity: 'high',
      title: 'Persistence Attempt',
      description: 'Registry modification for auto-start',
      details: { Key: 'HKLM\\Software\\Microsoft\\Windows\\Run', Value: 'update' },
      mitreTechniques: ['T1547.001'],
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 180000),
      type: 'alert',
      severity: 'critical',
      title: 'Ransomware Behavior Detected',
      description: 'Automated classification based on behavioral analysis',
      details: { Confidence: '94%', Classification: 'ransomware-like' },
      mitreTechniques: ['T1486', 'T1489'],
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 150000),
      type: 'analysis',
      severity: 'info',
      title: 'AI Analysis Complete',
      description: 'Behavioral analysis and risk assessment completed',
      details: { RiskScore: '87', Techniques: '12', Tactics: '5' },
    },
  ];

  const filteredEvents = mockEvents.filter((event) => {
    if (filter !== 'all' && event.type !== filter) return false;
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const startTime = filteredEvents[0]?.timestamp || new Date();

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
          <Clock className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
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

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'pl-9 pr-3 py-1.5 text-sm rounded-lg w-40',
                'bg-transparent border outline-none',
                isDark
                  ? 'border-slate-600 focus:border-blue-500 text-slate-300 placeholder:text-slate-500'
                  : 'border-slate-200 focus:border-blue-500 text-slate-700 placeholder:text-slate-400'
              )}
            />
          </div>

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
            <option value="process">Process</option>
            <option value="file">File</option>
            <option value="network">Network</option>
            <option value="registry">Registry</option>
            <option value="alert">Alert</option>
            <option value="analysis">Analysis</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        <div className="p-5">
          <div className="relative">
            {/* Vertical Line */}
            <div className={cn(
              'absolute left-[19px] top-4 bottom-4 w-0.5',
              isDark ? 'bg-slate-700' : 'bg-slate-200'
            )} />

            {/* Events */}
            <div className="space-y-4">
              <AnimatePresence>
                {filteredEvents.map((event, index) => {
                  const colors = severityColors[event.severity];
                  const Icon = typeIcons[event.type];
                  const isExpanded = expandedEvent === event.id;
                  const duration = formatDuration(startTime, event.timestamp);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-10"
                    >
                      {/* Dot */}
                      <div className={cn(
                        'absolute left-3 top-4 w-4 h-4 rounded-full border-2 z-10',
                        colors.dot,
                        isDark ? 'border-slate-800' : 'border-white'
                      )} />

                      {/* Card */}
                      <div
                        onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                        className={cn(
                          'group rounded-xl border cursor-pointer',
                          'transition-all duration-200',
                          colors.bg,
                          colors.border,
                          isExpanded ? 'shadow-lg' : 'hover:shadow-md'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'mt-0.5 p-1.5 rounded-lg',
                                isDark ? 'bg-slate-800' : 'bg-white'
                              )}>
                                <Icon className={cn('w-4 h-4', colors.text)} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    'text-xs font-mono',
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                  )}>
                                    {duration}
                                  </span>
                                  <span className={cn(
                                    'text-xs',
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                  )}>
                                    {formatTime(event.timestamp)}
                                  </span>
                                </div>
                                <p className={cn(
                                  'text-sm font-medium mt-0.5',
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
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                                colors.bg,
                                colors.text
                              )}>
                                {event.severity}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className={cn(
                                  'w-4 h-4 transition-transform',
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                )} />
                              ) : (
                                <ChevronRight className={cn(
                                  'w-4 h-4 transition-transform',
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                )} />
                              )}
                            </div>
                          </div>

                          {/* MITRE Techniques */}
                          {event.mitreTechniques && event.mitreTechniques.length > 0 && (
                            <div className="flex items-center gap-2 mt-3">
                              <Shield className={cn('w-3 h-3', isDark ? 'text-slate-500' : 'text-slate-400')} />
                              <div className="flex gap-1">
                                {event.mitreTechniques.map((tech) => (
                                  <span
                                    key={tech}
                                    className={cn(
                                      'px-1.5 py-0.5 text-xs font-mono rounded',
                                      isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                                    )}
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && event.details && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className={cn(
                                  'mt-4 pt-4 border-t space-y-2',
                                  isDark ? 'border-slate-700' : 'border-slate-200'
                                )}>
                                  {Object.entries(event.details).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-xs">
                                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                                        {key}
                                      </span>
                                      <span className={cn(
                                        'font-mono',
                                        isDark ? 'text-slate-300' : 'text-slate-600'
                                      )}>
                                        {value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForensicTimeline;