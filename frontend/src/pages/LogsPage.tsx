import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  Info,
  Bug,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { cn } from '../design-system';
import { useLogsStore } from '../stores/logsStore';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const levelColors: Record<string, string> = {
  debug: 'text-slate-500 dark:text-slate-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  critical: 'text-purple-600 dark:text-purple-400 font-bold',
};

const levelBgColors: Record<string, string> = {
  debug: 'bg-slate-50 dark:bg-slate-800/30',
  info: 'bg-blue-50/30 dark:bg-blue-900/10',
  warning: 'bg-amber-50/30 dark:bg-amber-900/10',
  error: 'bg-red-50/30 dark:bg-red-900/10',
  critical: 'bg-purple-50/30 dark:bg-purple-900/10',
};

const levelIcons: Record<string, typeof Info> = {
  debug: Bug,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: ShieldAlert,
};

const categoryColors: Record<string, string> = {
  app: 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  monitoring: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
  simulator: 'bg-blue-100 dark:bg-cyan-900/20 text-blue-600 dark:text-blue-400',
  execution: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  forensics: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  vm: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  sandbox: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
  system: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
};

export function LogsPage() {
  const {
    logs, isLoading, error, filters, autoRefresh, stats,
    fetchLogs, fetchStats, setFilters, toggleAutoRefresh, clearLogs, downloadLogs,
  } = useLogsStore();

  const [search, setSearch] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.search) {
        setFilters({ search });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs({ page: 1 });
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshInterval]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleLevelFilter = (level: string) => {
    setFilters({ level });
    fetchLogs({ level, page: 1 });
  };

  const handleCategoryFilter = (category: string) => {
    setFilters({ category });
    fetchLogs({ category, page: 1 });
  };

  const totalLines = stats?.totalLines || 0;
  const errorCount = stats?.byLevel?.error || 0;
  const warningCount = stats?.byLevel?.warning || 0;
  const criticalCount = stats?.byLevel?.critical || 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="System Logs"
        subtitle="Monitor forensic platform logs and events"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => { fetchLogs(); fetchStats(); }}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={downloadLogs} disabled={logs.length === 0}>
              Export
            </Button>
          </div>
        }
      />

      <PageGrid columns={4}>
        <DashboardCard>
          <DashboardStat
            label="Total Lines"
            value={totalLines}
            icon={<Terminal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Errors"
            value={errorCount}
            icon={<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Warnings"
            value={warningCount}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Critical"
            value={criticalCount}
            icon={<ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          />
        </DashboardCard>
      </PageGrid>

      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select
              value={filters.level}
              onChange={(val) => handleLevelFilter(val)}
              options={[
                { value: '', label: 'All Levels' },
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
            <Select
              value={filters.category}
              onChange={(val) => handleCategoryFilter(val)}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'app', label: 'App' },
                { value: 'monitoring', label: 'Monitoring' },
                { value: 'simulator', label: 'Simulator' },
                { value: 'execution', label: 'Execution' },
                { value: 'forensics', label: 'Forensics' },
                { value: 'vm', label: 'VM' },
                { value: 'sandbox', label: 'Sandbox' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />}
              onClick={toggleAutoRefresh}
            >
              {autoRefresh ? 'Live' : 'Auto-refresh'}
            </Button>
            {autoRefresh && (
              <Select
                value={String(autoRefreshInterval)}
                onChange={(val) => setAutoRefreshInterval(Number(val))}
                options={[
                  { value: '3', label: '3s' },
                  { value: '5', label: '5s' },
                  { value: '10', label: '10s' },
                  { value: '30', label: '30s' },
                ]}
              />
            )}
            <Button variant="ghost" size="sm" onClick={clearLogs} title="Clear logs from view">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="bg-slate-900 dark:bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden">
          <div className="px-4 py-2 bg-slate-800 dark:bg-slate-900 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300">Live Log Stream</span>
              {autoRefresh && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            <span className="text-slate-500">{logs.length} entries</span>
          </div>

          <div className="max-h-[500px] overflow-y-auto p-0">
            {isLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : error && logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-red-400 mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchLogs()}>Retry</Button>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Terminal className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-500">No logs found. Run simulations to generate logs.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {logs.map((log) => {
                  const Icon = levelIcons[log.level] || Info;
                  const isExpanded = expandedLog === log.id;
                  return (
                    <div key={log.id} className={cn('px-4 py-1.5 hover:bg-slate-800/50 cursor-pointer transition-colors', levelBgColors[log.level])}>
                      <div className="flex items-start gap-2" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                        <span className={cn('flex-shrink-0 mt-0.5', levelColors[log.level])}>
                          <Icon className="w-3 h-3" />
                        </span>
                        <span className="flex-shrink-0 text-slate-500 w-36">{log.timestamp}</span>
                        <span className={cn('flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium uppercase', categoryColors[log.category])}>
                          {log.category}
                        </span>
                        <span className="flex-shrink-0 w-12 text-center text-slate-400">{log.level.toUpperCase()}</span>
                        <span className="flex-1 text-slate-300 break-all">{log.message}</span>
                      </div>
                      {isExpanded && log.details && (
                        <div className="mt-2 ml-6 p-2 bg-slate-900 rounded border border-slate-700 text-slate-400 text-xs">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </Card>

      {stats && (
        <Card>
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-3">Level Distribution</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stats.byLevel || {}).map(([level, count]) => {
                const Icon = levelIcons[level] || Info;
                return (
                  <button key={level} onClick={() => handleLevelFilter(level)}
                    className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      filters.level === level
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}>
                    <Icon className="w-3 h-3" />
                    {level}: <span className="font-bold">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

export default LogsPage;

