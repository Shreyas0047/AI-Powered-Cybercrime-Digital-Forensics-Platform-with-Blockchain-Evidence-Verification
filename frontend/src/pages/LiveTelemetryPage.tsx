import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  AlertTriangle,
  Zap,
  Clock,
  Filter,
  Cpu,
  HardDrive,
  Network,
  FileText,
  Shield,
  Pause,
  Play as PlayIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { useRealtimeStore } from '../stores/realtimeStore';
import { formatRelativeTime, cn } from '../utils/helpers';

const eventTypeColors: Record<string, string> = {
  process: 'bg-blue-500',
  file: 'bg-orange-500',
  registry: 'bg-purple-500',
  network: 'bg-red-500',
  module: 'bg-slate-500',
  behavior: 'bg-amber-500',
  anomaly: 'bg-rose-500',
};

const eventTypeIcons: Record<string, typeof Activity> = {
  process: Cpu,
  file: FileText,
  registry: HardDrive,
  network: Network,
  module: Shield,
  behavior: Activity,
  anomaly: AlertTriangle,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function LiveTelemetryPage() {
  const { isConnected } = useRealtimeStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const [events, setEvents] = useState<Array<{
    id: string;
    timestamp: string;
    type: string;
    source: string;
    details: Record<string, unknown>;
    suspiciousScore?: number;
  }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    const matchesSource = sourceFilter === 'all' || event.source === sourceFilter;
    return matchesType && matchesSource;
  });

  const stats = {
    totalEvents: events.length,
    highScoreEvents: events.filter((e) => e.suspiciousScore && e.suspiciousScore > 70).length,
    activeSources: new Set(events.map((e) => e.source)).size,
    criticalEvents: events.filter((e) => e.suspiciousScore && e.suspiciousScore > 90).length,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Live Telemetry Stream"
        subtitle="Real-time forensic event monitoring"
        actions={
          <>
            <StatusBadge status={isConnected ? 'active' : 'closed'} size="sm" />
            <Button variant={autoScroll ? 'outline' : 'solid'} size="sm" onClick={() => setAutoScroll(!autoScroll)}>
              {autoScroll ? <Pause className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              {autoScroll ? 'Pause Stream' : 'Resume Stream'}
            </Button>
          </>
        }
      />

      {/* Stats */}
      <PageGrid columns={4}>
        <DashboardCard>
          <DashboardStat
            label="Total Events"
            value={stats.totalEvents}
            icon={<Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="High Score"
            value={stats.highScoreEvents}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Critical"
            value={stats.criticalEvents}
            icon={<Zap className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Active Sources"
            value={stats.activeSources}
            icon={<Server className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Filters:</span>
          </div>
          <Select
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'all', label: 'All Event Types' },
              { value: 'process', label: 'Process' },
              { value: 'file', label: 'File' },
              { value: 'registry', label: 'Registry' },
              { value: 'network', label: 'Network' },
              { value: 'module', label: 'Module' },
              { value: 'behavior', label: 'Behavior' },
              { value: 'anomaly', label: 'Anomaly' },
            ]}
          />
          <Select
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val)}
            options={[
              { value: 'all', label: 'All Sources' },
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'endpoint', label: 'Endpoint' },
              { value: 'network', label: 'Network' },
              { value: 'ai', label: 'AI' },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Auto-refresh: 1.5s</span>
          </div>
        </div>
      </Card>

      {/* Telemetry Stream */}
      <Card>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Event Stream</h2>
          <StatusBadge status="active" size="sm" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[600px] overflow-y-auto">
          {filteredEvents.map((event, index) => {
            const Icon = eventTypeIcons[event.type] || Activity;
            const colorClass = eventTypeColors[event.type] || 'bg-slate-500';

            return (
              <motion.div
                key={event.id}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-3 h-3 rounded-full', colorClass, index === 0 && 'animate-pulse')} />
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{event.type}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{event.source}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(event.timestamp)}</span>
                    </div>
                    <pre className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono truncate">
                      {JSON.stringify(event.details)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.suspiciousScore && (
                      <SeverityBadge
                        severity={
                          event.suspiciousScore > 90
                            ? 'critical'
                            : event.suspiciousScore > 70
                            ? 'high'
                            : event.suspiciousScore > 50
                            ? 'medium'
                            : 'low'
                        }
                        size="sm"
                      />
                    )}
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">New</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

export default LiveTelemetryPage;