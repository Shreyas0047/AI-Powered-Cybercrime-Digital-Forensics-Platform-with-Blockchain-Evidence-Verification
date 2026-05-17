import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Folder,
  AlertTriangle,
  Activity,
  CheckCircle,
  Brain,
  BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SeverityBadge } from '../components/ui/Badge';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardGrid, DashboardCard, DashboardStat, DashboardList } from '../components/enterprise/DashboardGrid';
import { useInvestigationStore } from '../stores/investigationStore';
import { useAlertStore } from '../stores/alertStore';
import { formatRelativeTime, cn } from '../utils/helpers';

// Mock data for demonstration
const mockStats = {
  totalInvestigations: 127,
  activeInvestigations: 23,
  criticalPriority: 5,
  highPriority: 12,
  totalEvidence: 458,
  unverifiedEvidence: 34,
  totalAlerts: 89,
  criticalAlerts: 8,
  openAlerts: 15,
  sandboxSessionsToday: 12,
  avgResolutionTime: 4.2,
};

const mockRecentInvestigations = [
  { id: '1', caseNumber: 'INV-2024-5A3B', title: 'Ransomware Incident Analysis', status: 'active', priority: 'critical', updatedAt: new Date().toISOString() },
  { id: '2', caseNumber: 'INV-2024-5A2C', title: 'Phishing Campaign Investigation', status: 'analyzing', priority: 'high', updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', caseNumber: 'INV-2024-5A1D', title: 'Data Breach Assessment', status: 'pending', priority: 'medium', updatedAt: new Date(Date.now() - 7200000).toISOString() },
];

const mockAlerts = [
  { id: '1', title: 'Suspicious PowerShell Execution', severity: 'critical', detectedAt: new Date().toISOString() },
  { id: '2', title: 'Unusual Network Behavior Detected', severity: 'high', detectedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '3', title: 'Multiple Failed Login Attempts', severity: 'medium', detectedAt: new Date(Date.now() - 3600000).toISOString() },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

export function DashboardPage() {
  const { fetchInvestigations } = useInvestigationStore();
  const { fetchAlerts } = useAlertStore();

  useEffect(() => {
    fetchInvestigations({ page: 1, limit: 5 });
    fetchAlerts({ page: 1, limit: 5 });
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time threat intelligence and investigation overview"
        actions={
          <>
            <Button variant="solid" size="sm">
              <BarChart3 className="w-4 h-4" />
              Reports
            </Button>
            <Button size="sm">
              <Search className="w-4 h-4" />
              New Investigation
            </Button>
          </>
        }
      />

      {/* Stats Grid */}
      <PageGrid columns={4}>
        <DashboardCard>
          <DashboardStat
            label="Active Investigations"
            value={mockStats.activeInvestigations}
            change={{ value: 12, type: 'increase' }}
            icon={<Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>

        <DashboardCard>
          <DashboardStat
            label="Critical Alerts"
            value={mockStats.criticalAlerts}
            change={{ value: 3, type: 'decrease' }}
            icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>

        <DashboardCard>
          <DashboardStat
            label="Total Evidence"
            value={mockStats.totalEvidence}
            change={{ value: 28, type: 'increase' }}
            icon={<Folder className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          />
        </DashboardCard>

        <DashboardCard>
          <DashboardStat
            label="Sandbox Sessions"
            value={mockStats.sandboxSessionsToday}
            change={{ value: 5, type: 'increase' }}
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Main Content Grid */}
      <DashboardGrid className="lg:grid-cols-3">
        {/* Left Column - Investigations & AI */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Investigations */}
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Investigations</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Latest investigation cases</p>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <DashboardList
              items={mockRecentInvestigations.map((inv) => ({
                id: inv.id,
                title: inv.title,
                subtitle: inv.caseNumber,
                status: 'default' as const,
                meta: (
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={inv.priority as any} size="sm" />
                  </div>
                ),
              }))}
            />
          </DashboardCard>

          {/* AI Analysis Card */}
          <DashboardCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Analysis Engine</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last 24 hours</p>
              </div>
              <div className="ml-auto">
                <SeverityBadge severity="low" size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">127</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Analyses</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">94%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accuracy</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">2.3s</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Response</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800/50">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Latest Insight:</span> Detected potential ransomware behavior pattern in sandbox session.
              </p>
            </div>
          </DashboardCard>
        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Alerts</h2>
              <SeverityBadge severity="critical" size="sm" />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-1 p-1.5 rounded-lg',
                      alert.severity === 'critical' && 'bg-red-50 dark:bg-red-900/20',
                      alert.severity === 'high' && 'bg-orange-50 dark:bg-orange-900/20',
                      alert.severity === 'medium' && 'bg-amber-50 dark:bg-amber-900/20'
                    )}>
                      <AlertTriangle className={cn(
                        'w-4 h-4',
                        alert.severity === 'critical' && 'text-red-600 dark:text-red-400',
                        alert.severity === 'high' && 'text-orange-600 dark:text-orange-400',
                        alert.severity === 'medium' && 'text-amber-600 dark:text-amber-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.title}</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(alert.detectedAt)}</span>
                    </div>
                    <SeverityBadge severity={alert.severity as any} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Activity Timeline */}
          <DashboardCard>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'Evidence verified: malware_sample_001.exe', time: '2m ago' },
                { icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'Sandbox session completed', time: '15m ago' },
                { icon: Folder, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'New evidence uploaded', time: '30m ago' },
                { icon: Search, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'Investigation created', time: '45m ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', activity.bg)}>
                    <activity.icon className={cn('w-4 h-4', activity.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{activity.text}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </DashboardGrid>
    </motion.div>
  );
}

export default DashboardPage;