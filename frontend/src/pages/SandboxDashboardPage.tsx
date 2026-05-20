import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  RotateCcw,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Server,
  Eye,
  Terminal,
  Loader2,
  FileText,
  Network,
  HardDrive,
  Cpu,
  Zap,
  Settings,
  Shield,
  Bug,
  Hash,
  Clock,
  Layers,
  Pause,
  PlayCircle,
  Search,
  Download,
  Copy,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { useSandboxStore } from '../stores/sandboxStore';
import { cn } from '../design-system';

const simulatorInfo: Record<string, { name: string; color: string; description: string; icon: React.ReactNode }> = {
  'ransomware-simulator': { name: 'Ransomware Simulator', color: 'bg-red-100 text-red-700', description: 'Simulates file encryption and ransom behavior', icon: <HardDrive className="w-5 h-5" /> },
  'spyware-simulator': { name: 'Spyware Simulator', color: 'bg-orange-100 text-orange-700', description: 'Simulates surveillance and data exfiltration', icon: <Eye className="w-5 h-5" /> },
  'trojan-simulator': { name: 'Trojan Simulator', color: 'bg-purple-100 text-purple-700', description: 'Simulates trojan backdoor and persistence', icon: <Terminal className="w-5 h-5" /> },
  'botnet-simulator': { name: 'Botnet Simulator', color: 'bg-blue-100 text-blue-700', description: 'Simulates C2 communication and bot behavior', icon: <Network className="w-5 h-5" /> },
  'credential-stealer': { name: 'Credential Stealer', color: 'bg-amber-100 text-amber-700', description: 'Simulates credential harvesting behavior', icon: <Cpu className="w-5 h-5" /> },
};

type TabType = 'sessions' | 'monitoring' | 'telemetry' | 'logs';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function SandboxDashboardPage() {
  const {
    sessions,
    stats,
    health,
    monitoringStatus,
    executionStatus,
    simulators,
    activeSession,
    telemetryEvents,
    logs,
    fetchSessions,
    fetchStats,
    fetchSimulators,
    fetchHealth,
    fetchMonitoringStatus,
    fetchExecutionStatus,
    fetchLogs,
    startSession,
    stopSession,
    resetVm,
    startRuntime,
    connectTelemetry,
    disconnectTelemetry,
    isLoading,
    isExecuting,
    clearTelemetry,
    clearLogs,
  } = useSandboxStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [simulatorFilter, setSimulatorFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<(typeof sessions)[0] | null>(null);
  const [selectedSimulator, setSelectedSimulator] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [logFilter, setLogFilter] = useState('');
  const [logsPaused, setLogsPaused] = useState(false);

  useEffect(() => {
    fetchSessions({ page: 1, limit: 50 });
    fetchStats();
    fetchSimulators();
    fetchHealth();
    fetchMonitoringStatus();
    fetchExecutionStatus();
    connectTelemetry();

    const interval = setInterval(() => {
      fetchHealth();
      fetchMonitoringStatus();
      fetchExecutionStatus();
      if (!logsPaused && activeTab === 'logs') {
        fetchLogs(200);
      }
    }, 5000);

    return () => {
      disconnectTelemetry();
      clearInterval(interval);
    };
  }, [fetchSessions, fetchStats, fetchSimulators, fetchHealth, fetchMonitoringStatus, fetchExecutionStatus, connectTelemetry, disconnectTelemetry]);

  useEffect(() => {
    if (activeSession && activeSession.state !== 'completed' && activeSession.state !== 'failed') {
      setSessionStartTime(new Date());
    }
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!selectedSimulator) return;
    clearTelemetry();
    const result = await startSession(selectedSimulator);
    if (result.success) {
      fetchSessions({ page: 1, limit: 50 });
      fetchStats();
      fetchExecutionStatus();
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    const result = await stopSession(activeSession.session_id);
    if (result.success) {
      setSessionStartTime(null);
      fetchSessions({ page: 1, limit: 50 });
      fetchStats();
    }
  };

  const handleResetVm = async () => {
    await resetVm();
    fetchHealth();
    fetchMonitoringStatus();
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesSimulator = simulatorFilter === 'all' || session.simulator === simulatorFilter;
    return matchesStatus && matchesSimulator;
  });

  const formatSessionDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatElapsedTime = (startTime: Date) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const runningCount = stats?.byStatus?.running || 0;
  const completedCount = stats?.byStatus?.completed || 0;
  const failedCount = (stats?.byStatus?.failed || 0) + (stats?.byStatus?.timeout || 0);

  const isSessionRunning = activeSession && !['completed', 'failed'].includes(activeSession.state);

  const processCount = monitoringStatus?.process_count || 0;
  const fileCount = monitoringStatus?.file_operations_count || 0;
  const registryCount = monitoringStatus?.registry_operations_count || 0;
  const networkCount = monitoringStatus?.network_operations_count || 0;
  const totalEvents = monitoringStatus?.total_events || 0;
  const behaviorAlerts = monitoringStatus?.behavior_alerts?.length || 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <PageHeader
        title="Sandbox Dashboard"
        subtitle="Enterprise malware analysis and forensic investigation platform"
        actions={
          <div className="flex items-center gap-2">
            {!health ? (
              <Button variant="outline" size="sm" onClick={() => startRuntime()} disabled={isLoading}>
                <Zap className="w-4 h-4" />
                Start Runtime
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Runtime Online</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleResetVm} disabled={isLoading || isExecuting || !health}>
              <RotateCcw className="w-4 h-4" />
              Reset VM
            </Button>
            <Button
              size="sm"
              onClick={handleStartSession}
              disabled={!selectedSimulator || isExecuting || isSessionRunning || !health}
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              New Session
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <Select
          value={selectedSimulator}
          onChange={(val) => setSelectedSimulator(val)}
          options={[
            { value: '', label: 'Select Threat Simulator...' },
            ...(simulators.length > 0
              ? simulators.map((s) => ({ value: s.id, label: s.display_name }))
              : Object.entries(simulatorInfo).map(([id, info]) => ({ value: id, label: info.name }))),
          ]}
          className="w-64"
        />
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-cyan-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">VM:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {health?.vm_status?.state || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Events:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{totalEvents}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Alerts:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{behaviorAlerts}</span>
          </div>
        </div>
      </div>

      {isSessionRunning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-between text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div>
              <p className="font-semibold">Session Active: {activeSession?.session_id.slice(0, 12)}</p>
              <p className="text-sm text-blue-100 capitalize">{activeSession?.state.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{sessionStartTime && formatElapsedTime(sessionStartTime)}</p>
              <p className="text-xs text-blue-100">Elapsed</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleStopSession} className="bg-white/20 hover:bg-white/30 border-0">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(['sessions', 'monitoring', 'telemetry', 'logs'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'sessions' && ` (${sessions.length})`}
            {tab === 'monitoring' && totalEvents > 0 && ` (${totalEvents})`}
            {tab === 'telemetry' && telemetryEvents.length > 0 && ` (${telemetryEvents.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-4">
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'running', label: 'Running' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'timeout', label: 'Timeout' },
                ]}
                className="w-36"
              />
              <Select
                value={simulatorFilter}
                onChange={(val) => setSimulatorFilter(val)}
                options={[
                  { value: 'all', label: 'All Simulators' },
                  ...Object.entries(simulatorInfo).map(([id, info]) => ({ value: id, label: info.name })),
                ]}
                className="w-48"
              />
            </div>

            <Card>
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading sessions...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No sessions found. Start a new session to begin analysis.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
                  {filteredSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      onClick={() => setSelectedSession(session)}
                      className={cn(
                        'px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                        selectedSession?.id === session.id && 'bg-cyan-50/50 dark:bg-cyan-900/10'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            session.status === 'running' && 'bg-cyan-100 dark:bg-cyan-900/20',
                            session.status === 'completed' && 'bg-emerald-100 dark:bg-emerald-900/20',
                            session.status === 'failed' && 'bg-red-100 dark:bg-red-900/20',
                            session.status === 'timeout' && 'bg-amber-100 dark:bg-amber-900/20'
                          )}
                        >
                          {session.status === 'running' && <Play className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                          {session.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                          {session.status === 'failed' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                          {session.status === 'timeout' && <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {simulatorInfo[session.simulator]?.name || session.simulator}
                            </p>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              {session.sessionId?.slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                            <span>{session.vmName}</span>
                            <span>•</span>
                            <span>{formatSessionDuration(session.duration)}</span>
                            <span>•</span>
                            <span>{session.eventsCollected || 0} events</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.suspiciousScore && (
                            <SeverityBadge
                              severity={
                                session.suspiciousScore > 80 ? 'critical' : session.suspiciousScore > 60 ? 'high' : 'medium'
                              }
                              size="sm"
                            />
                          )}
                          <StatusBadge status={session.status} size="sm" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div>
            {selectedSession ? (
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Session Details</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          simulatorInfo[selectedSession.simulator]?.color || 'bg-slate-100 dark:bg-slate-700'
                        )}
                      >
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {simulatorInfo[selectedSession.simulator]?.name || selectedSession.simulator}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {selectedSession.sessionId?.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {simulatorInfo[selectedSession.simulator]?.description}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Status</span>
                      <StatusBadge status={selectedSession.status} size="sm" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">VM</span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedSession.vmName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Duration</span>
                      <span className="text-slate-700 dark:text-slate-300">{formatSessionDuration(selectedSession.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Events</span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedSession.eventsCollected || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Evidence</span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedSession.evidenceFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Started</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedSession.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg mt-4">
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">Error</p>
                      <p className="text-xs text-red-600 dark:text-red-500">{selectedSession.error}</p>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Server className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select a session to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <PageGrid columns={4}>
          <DashboardCard>
            <DashboardStat
              label="Process Events"
              value={processCount}
              icon={<Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
              delta="Live monitoring"
            />
          </DashboardCard>
          <DashboardCard>
            <DashboardStat
              label="File Operations"
              value={fileCount}
              icon={<FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
              delta="File system activity"
            />
          </DashboardCard>
          <DashboardCard>
            <DashboardStat
              label="Registry Changes"
              value={registryCount}
              icon={<Hash className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              delta="Registry modifications"
            />
          </DashboardCard>
          <DashboardCard>
            <DashboardStat
              label="Network Events"
              value={networkCount}
              icon={<Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              delta="Network activity"
            />
          </DashboardCard>
        </PageGrid>
      )}

      {activeTab === 'monitoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                Event Categories
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(monitoringStatus?.events_by_category || {}).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No events captured yet</p>
              ) : (
                Object.entries(monitoringStatus?.events_by_category || {}).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{category.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count as number}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Events by Severity
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(monitoringStatus?.events_by_severity || {}).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No severity data yet</p>
              ) : (
                Object.entries(monitoringStatus?.events_by_severity || {}).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm capitalize px-2 py-0.5 rounded',
                      severity === 'critical' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      severity === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      severity === 'medium' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                      severity === 'low' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                      severity === 'info' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    )}>{severity}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count as number}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {monitoringStatus?.suspicious_activities && monitoringStatus.suspicious_activities.length > 0 && (
            <Card className="lg:col-span-2">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  Suspicious Activities Detected
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {(monitoringStatus.suspicious_activities as Array<{indicator?: string; description?: string; severity?: string}>).map((activity, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-4">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2',
                      activity.severity === 'critical' && 'bg-red-500',
                      activity.severity === 'high' && 'bg-orange-500',
                      activity.severity === 'medium' && 'bg-amber-500',
                      activity.severity === 'low' && 'bg-emerald-500',
                    )} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.indicator || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.description || ''}</p>
                    </div>
                    {activity.severity && (
                      <SeverityBadge severity={activity.severity as 'critical' | 'high' | 'medium' | 'low'} size="sm" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'telemetry' && (
        <Card className="h-[500px] flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Live Telemetry Stream
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {telemetryEvents.length} events captured
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={clearTelemetry}>
              Clear
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
            <AnimatePresence>
              {telemetryEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Terminal className="w-12 h-12 mb-2 opacity-50" />
                  <p>Waiting for telemetry events...</p>
                  <p className="text-xs mt-1">Start a session to capture live telemetry</p>
                </div>
              ) : (
                telemetryEvents.map((event, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-3 rounded-lg border',
                      event.event_type === 'session_update' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                      event.event_type === 'forensic_event' && 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs',
                        event.category === 'session' && 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
                        event.category !== 'session' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300'
                      )}>
                        {event.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{event.event_type}</p>
                    <pre className="mt-1 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {activeTab === 'logs' && (
        <Card className="h-[500px] flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Live Runtime Logs
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {logs.length} log entries
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogsPaused(!logsPaused)}
                >
                  {logsPaused ? <PlayCircle className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {logsPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(200)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const logText = logs.map(l => `[${l.level}] ${l.timestamp}: ${l.message}`).join('\n');
                    navigator.clipboard.writeText(logText);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <Select
                value="all"
                onChange={() => {}}
                options={[
                  { value: 'all', label: 'All Levels' },
                  { value: 'INFO', label: 'Info' },
                  { value: 'WARNING', label: 'Warning' },
                  { value: 'ERROR', label: 'Error' },
                ]}
                className="w-36"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-slate-900 dark:bg-slate-950">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Terminal className="w-12 h-12 mb-2 opacity-50" />
                <p>No logs available</p>
                <p className="text-xs mt-1">Logs will appear here when runtime is active</p>
              </div>
            ) : (
              logs
                .filter(log => !logFilter || log.message.toLowerCase().includes(logFilter.toLowerCase()))
                .map((log, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'py-1 px-2 border-l-2',
                      log.level === 'ERROR' && 'border-red-500 text-red-400 bg-red-900/10',
                      log.level === 'WARNING' && 'border-amber-500 text-amber-400 bg-amber-900/10',
                      log.level === 'INFO' && 'border-cyan-500 text-cyan-400 bg-cyan-900/10',
                      log.level === 'DEBUG' && 'border-slate-500 text-slate-400 bg-slate-800/50',
                      !['ERROR', 'WARNING', 'INFO', 'DEBUG'].includes(log.level) && 'border-slate-500 text-slate-300'
                    )}
                  >
                    <span className="text-slate-500 mr-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={cn(
                      'mr-2 px-1 rounded text-[10px]',
                      log.level === 'ERROR' && 'bg-red-500/20 text-red-400',
                      log.level === 'WARNING' && 'bg-amber-500/20 text-amber-400',
                      log.level === 'INFO' && 'bg-cyan-500/20 text-cyan-400',
                      log.level === 'DEBUG' && 'bg-slate-500/20 text-slate-400',
                    )}>
                      {log.level}
                    </span>
                    {log.message}
                  </div>
                ))
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <DashboardCard>
          <DashboardStat
            label="Total Sessions"
            value={stats?.total || sessions.length}
            icon={<Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Completed"
            value={completedCount}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Running"
            value={runningCount}
            icon={<Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Failed/Timeout"
            value={failedCount}
            icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>
      </div>
    </motion.div>
  );
}

export default SandboxDashboardPage;