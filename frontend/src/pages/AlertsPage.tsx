import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { formatRelativeTime, cn } from '../utils/helpers';

const mockAlerts = [
  { id: '1', alertId: 'ALT-2024-5A3B-001', title: 'Suspicious PowerShell Execution', description: 'Encoded PowerShell command detected in process', type: 'security', severity: 'critical', status: 'new', source: 'sandbox', detectedAt: '2024-01-16T14:30:00Z', investigationId: '1' },
  { id: '2', alertId: 'ALT-2024-5A3B-002', title: 'Unusual Network Behavior', description: 'Multiple connections to suspicious IP addresses', type: 'network', severity: 'high', status: 'acknowledged', source: 'siem', detectedAt: '2024-01-16T13:45:00Z', investigationId: '1' },
  { id: '3', alertId: 'ALT-2024-5A2C-001', title: 'Failed Login Attempts', description: 'Multiple failed login attempts from external IP', type: 'security', severity: 'medium', status: 'in_progress', source: 'endpoint', detectedAt: '2024-01-16T12:00:00Z', investigationId: '2' },
  { id: '4', alertId: 'ALT-2024-5A2C-002', title: 'Registry Modification Detected', description: 'Suspicious registry keys added for persistence', type: 'endpoint', severity: 'high', status: 'new', source: 'sandbox', detectedAt: '2024-01-16T11:30:00Z', investigationId: '2' },
  { id: '5', alertId: 'ALT-2024-5A1D-001', title: 'File Download Activity', description: 'Large file download from untrusted source', type: 'network', severity: 'low', status: 'resolved', source: 'firewall', detectedAt: '2024-01-15T16:20:00Z', investigationId: '3' },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAlerts = mockAlerts.filter(alert => {
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  // Stats
  const criticalCount = mockAlerts.filter(a => a.severity === 'critical' && a.status === 'new').length;
  const highCount = mockAlerts.filter(a => a.severity === 'high' && a.status === 'new').length;
  const totalActive = mockAlerts.filter(a => a.status !== 'resolved' && a.status !== 'closed').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Alert Center"
        subtitle="Monitor and respond to security alerts"
      />

      {/* Stats */}
      <PageGrid columns={3}>
        <DashboardCard>
          <DashboardStat
            label="Critical Alerts"
            value={criticalCount}
            icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="High Priority"
            value={highCount}
            icon={<Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Active Alerts"
            value={totalActive}
            icon={<Bell className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search alerts..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select
              value={severityFilter}
              onChange={(val) => setSeverityFilter(val)}
              options={[
                { value: 'all', label: 'All Severity' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'new', label: 'New' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <Card>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  alert.severity === 'critical' && 'bg-red-100 dark:bg-red-900/20',
                  alert.severity === 'high' && 'bg-orange-100 dark:bg-orange-900/20',
                  alert.severity === 'medium' && 'bg-amber-100 dark:bg-amber-900/20',
                  alert.severity === 'low' && 'bg-emerald-100 dark:bg-emerald-900/20'
                )}>
                  <AlertTriangle className={cn(
                    'w-5 h-5',
                    alert.severity === 'critical' && 'text-red-600 dark:text-red-400',
                    alert.severity === 'high' && 'text-orange-600 dark:text-orange-400',
                    alert.severity === 'medium' && 'text-amber-600 dark:text-amber-400',
                    alert.severity === 'low' && 'text-emerald-600 dark:text-emerald-400'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{alert.title}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{alert.alertId}</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(alert.detectedAt)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{alert.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={alert.severity as any} size="sm" />
                  <StatusBadge status={alert.status} size="sm" />
                  <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export default AlertsPage;