import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { useSandboxStore } from '../stores/sandboxStore';
import { cn } from '../design-system';

const simulatorInfo: Record<string, { name: string; color: string; description: string }> = {
  'ransomware-simulator': { name: 'Ransomware Simulator', color: 'bg-red-100 text-red-700', description: 'Simulates file encryption and ransom behavior' },
  'spyware-simulator': { name: 'Spyware Simulator', color: 'bg-orange-100 text-orange-700', description: 'Simulates surveillance and data exfiltration' },
  'trojan-simulator': { name: 'Trojan Simulator', color: 'bg-purple-100 text-purple-700', description: 'Simulates trojan backdoor and persistence' },
  'botnet-simulator': { name: 'Botnet Simulator', color: 'bg-blue-100 text-blue-700', description: 'Simulates C2 communication and bot behavior' },
  'credential-stealer': { name: 'Credential Stealer', color: 'bg-amber-100 text-amber-700', description: 'Simulates credential harvesting behavior' },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function SandboxDashboardPage() {
  const { sessions, stats, fetchSessions, fetchStats, isLoading } = useSandboxStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [simulatorFilter, setSimulatorFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<(typeof sessions)[0] | null>(null);

  useEffect(() => {
    fetchSessions({ page: 1, limit: 50 });
    fetchStats();
  }, [fetchSessions, fetchStats]);

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

  const runningCount = stats?.byStatus?.running || 0;
  const completedCount = stats?.byStatus?.completed || 0;
  const failedCount = (stats?.byStatus?.failed || 0) + (stats?.byStatus?.timeout || 0);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Sandbox Dashboard"
        subtitle="Monitor and manage sandbox execution sessions"
        actions={
          <>
            <Button variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
              Reset VMs
            </Button>
            <Button size="sm">
              <Play className="w-4 h-4" />
              New Session
            </Button>
          </>
        }
      />

      {/* Stats */}
      <PageGrid columns={4}>
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
        <DashboardCard>
          <DashboardStat
            label="Avg Duration"
            value={stats?.avgDuration ? `${Math.floor(stats.avgDuration / 60)}m` : '0m'}
            icon={<Timer className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
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
            />
            <Select
              value={simulatorFilter}
              onChange={(val) => setSimulatorFilter(val)}
              options={[
                { value: 'all', label: 'All Simulators' },
                { value: 'ransomware-simulator', label: 'Ransomware Simulator' },
                { value: 'spyware-simulator', label: 'Spyware Simulator' },
                { value: 'trojan-simulator', label: 'Trojan Simulator' },
                { value: 'botnet-simulator', label: 'Botnet Simulator' },
                { value: 'credential-stealer', label: 'Credential Stealer' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No sessions found</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredSessions.map((session) => {
                  return (
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
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          session.status === 'running' && 'bg-cyan-100 dark:bg-cyan-900/20',
                          session.status === 'completed' && 'bg-emerald-100 dark:bg-emerald-900/20',
                          session.status === 'failed' && 'bg-red-100 dark:bg-red-900/20',
                          session.status === 'timeout' && 'bg-amber-100 dark:bg-amber-900/20'
                        )}>
                          {session.status === 'running' && <Play className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                          {session.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                          {session.status === 'failed' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                          {session.status === 'timeout' && <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">{simulatorInfo[session.simulator]?.name || session.simulator}</p>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{session.sessionId}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-400 dark:text-slate-500">{session.vmName}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{formatSessionDuration(session.duration)}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{session.eventsCollected || 0} events</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.suspiciousScore && (
                            <SeverityBadge severity={session.suspiciousScore > 80 ? 'critical' : session.suspiciousScore > 60 ? 'high' : 'medium'} size="sm" />
                          )}
                          <StatusBadge status={session.status} size="sm" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedSession ? (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Session Details</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', simulatorInfo[selectedSession.simulator]?.color || 'bg-slate-100 dark:bg-slate-700')}>
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{simulatorInfo[selectedSession.simulator]?.name || selectedSession.simulator}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{selectedSession.sessionId}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{simulatorInfo[selectedSession.simulator]?.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                    <StatusBadge status={selectedSession.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">VM</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedSession.vmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Duration</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{formatSessionDuration(selectedSession.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Events</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedSession.eventsCollected || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Evidence</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedSession.evidenceFiles || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Started</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                {selectedSession.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg mt-4">
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">Error</p>
                    <p className="text-xs text-red-600 dark:text-red-500">{selectedSession.error}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4" />
                    View Report
                  </Button>
                  {selectedSession.status === 'running' ? (
                    <Button variant="danger" size="sm">
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1">
                      <RotateCcw className="w-4 h-4" />
                      Re-run
                    </Button>
                  )}
                </div>
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
    </motion.div>
  );
}

export default SandboxDashboardPage;