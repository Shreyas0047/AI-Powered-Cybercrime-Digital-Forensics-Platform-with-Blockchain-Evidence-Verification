/**
 * Enterprise Dashboard Page
 * Modernized SOC-style dashboard with cohesive design system
 */

import { motion } from 'framer-motion';
import {
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  CheckCircle,
  Activity,
  Bell,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SeverityBadge, CountBadge } from '../components/ui/Badge';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardGrid, DashboardCard, DashboardHeader, DashboardStat, DashboardList } from '../components/enterprise/DashboardGrid';
import { cn, formatDate } from '../design-system';

// Mock data
const mockStats = {
  activeInvestigations: 23,
  criticalAlerts: 8,
  totalEvidence: 458,
  sandboxSessions: 12,
};

const mockInvestigations = [
  { id: '1', caseNumber: 'INV-2024-5A3B', title: 'Ransomware Incident Analysis', status: 'analyzing', priority: 'critical', updatedAt: new Date().toISOString() },
  { id: '2', caseNumber: 'INV-2024-5A2C', title: 'Phishing Campaign Investigation', status: 'active', priority: 'high', updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', caseNumber: 'INV-2024-5A1D', title: 'Data Breach Assessment', status: 'pending', priority: 'medium', updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', caseNumber: 'INV-2024-5A0E', title: 'Malware Detection Analysis', status: 'resolved', priority: 'low', updatedAt: new Date(Date.now() - 10800000).toISOString() },
];

const mockAlerts = [
  { id: '1', title: 'Suspicious PowerShell Execution', severity: 'critical', status: 'new', detectedAt: new Date().toISOString(), source: 'sandbox' },
  { id: '2', title: 'Unusual Network Behavior Detected', severity: 'high', status: 'acknowledged', detectedAt: new Date(Date.now() - 1800000).toISOString(), source: 'siem' },
  { id: '3', title: 'Multiple Failed Login Attempts', severity: 'medium', status: 'in_progress', detectedAt: new Date(Date.now() - 3600000).toISOString(), source: 'endpoint' },
  { id: '4', title: 'Registry Modification Detected', severity: 'high', status: 'new', detectedAt: new Date(Date.now() - 5400000).toISOString(), source: 'sandbox' },
];

const mockActivity = [
  { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'Investigation INV-2024-5A3B resolved', time: '2 min ago' },
  { icon: FileText, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'New evidence uploaded to INV-2024-5A2C', time: '15 min ago' },
  { icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'Sandbox session completed', time: '30 min ago' },
  { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'New critical alert generated', time: '45 min ago' },
];

const severityDistribution = [
  { severity: 'critical', count: 8 },
  { severity: 'high', count: 23 },
  { severity: 'medium', count: 45 },
  { severity: 'low', count: 67 },
  { severity: 'info', count: 34 },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

export function EnhancedDashboardPage() {
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
            icon={<FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          />
        </DashboardCard>

        <DashboardCard>
          <DashboardStat
            label="Sandbox Sessions"
            value={mockStats.sandboxSessions}
            change={{ value: 5, type: 'increase' }}
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Main Content Grid */}
      <DashboardGrid className="lg:grid-cols-3">
        {/* Left Column - Investigations & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Investigations */}
          <DashboardCard>
            <DashboardHeader
              title="Active Investigations"
              subtitle="Latest investigation cases"
              action={<Button variant="ghost" size="sm">View All</Button>}
            />
            <DashboardList
              items={mockInvestigations.map((inv) => ({
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

          {/* Distribution Cards */}
          <PageGrid columns={2}>
            <Card>
              <Card.Header title="Alert Severity Distribution" />
              <Card.Content>
                <div className="space-y-3">
                  {severityDistribution.map((item) => (
                    <div key={item.severity} className="flex items-center gap-3">
                      <SeverityBadge severity={item.severity as any} size="sm" />
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            item.severity === 'critical' && 'bg-red-500',
                            item.severity === 'high' && 'bg-orange-500',
                            item.severity === 'medium' && 'bg-amber-500',
                            item.severity === 'low' && 'bg-emerald-500',
                            item.severity === 'info' && 'bg-sky-500'
                          )}
                          style={{ width: `${(item.count / 177) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header title="AI Analysis Engine" />
              <Card.Content>
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
              </Card.Content>
            </Card>
          </PageGrid>
        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <DashboardCard>
            <DashboardHeader
              title="Active Alerts"
              action={<CountBadge count={mockStats.criticalAlerts} variant="danger" />}
            />
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{alert.source}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(alert.detectedAt, 'relative')}</span>
                      </div>
                    </div>
                    <SeverityBadge severity={alert.severity as any} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Activity Timeline */}
          <DashboardCard>
            <DashboardHeader title="Recent Activity" />
            <div className="p-5 space-y-4">
              {mockActivity.map((activity, index) => (
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

export default EnhancedDashboardPage;