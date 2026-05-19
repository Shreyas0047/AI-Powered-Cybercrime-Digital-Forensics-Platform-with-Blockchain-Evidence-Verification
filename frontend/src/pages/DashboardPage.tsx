/**
 * Enterprise SOC Dashboard
 * Professional command center with real-time threat intelligence
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Folder,
  AlertTriangle,
  Activity,
  CheckCircle,
  Brain,
  BarChart3,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  FileSearch,
  Network,
  Cpu,
  HardDrive,
  Terminal,
  ChevronRight,
  Circle,
  Flame,
  Skull,
  Bug,
  Eye,
  Fingerprint,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInvestigationStore } from '../stores/investigationStore';
import { useAlertStore } from '../stores/alertStore';
import { useEvidenceStore } from '../stores/evidenceStore';
import { useSandboxStore } from '../stores/sandboxStore';
import { formatRelativeTime, cn } from '../utils/helpers';
import { useTheme } from '../providers/ThemeProvider';
import { PageHeader } from '../layouts/PageContainer';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; type: 'increase' | 'decrease' };
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

function StatCard({ label, value, change, icon, severity = 'none' }: StatCardProps) {
  const { isDark } = useTheme();
  const severityColors: Record<string, string> = {
    critical: 'from-red-500 to-orange-500',
    high: 'from-orange-500 to-amber-500',
    medium: 'from-amber-500 to-yellow-500',
    low: 'from-emerald-500 to-teal-500',
    none: 'from-blue-500 to-violet-500',
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-5',
        'transition-all duration-300',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg'
      )}
    >
      {/* Background Glow */}
      <div className={cn(
        'absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl',
        `bg-gradient-to-br ${severityColors[severity]}`
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            `bg-gradient-to-br ${severityColors[severity]}`
          )}>
            {icon}
          </div>
          {change && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              change.type === 'increase' ? 'text-emerald-500' : 'text-red-500'
            )}>
              {change.type === 'increase' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(change.value)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={cn(
            'text-3xl font-bold tracking-tight',
            isDark ? 'text-slate-100' : 'text-slate-900'
          )}>
            {value}
          </p>
          <p className={cn(
            'text-sm',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ThreatDistributionCard() {
  const { isDark } = useTheme();
  const threats = [
    { name: 'Ransomware', count: 12, percentage: 28, color: 'bg-red-500' },
    { name: 'Spyware', count: 8, percentage: 19, color: 'bg-orange-500' },
    { name: 'Trojan', count: 10, percentage: 23, color: 'bg-amber-500' },
    { name: 'Botnet', count: 6, percentage: 14, color: 'bg-yellow-500' },
    { name: 'Credential Theft', count: 7, percentage: 16, color: 'bg-emerald-500' },
  ];

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          Threat Distribution
        </h3>
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
        )}>
          Last 30 days
        </span>
      </div>

      <div className="space-y-3">
        {threats.map((threat) => (
          <div key={threat.name} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn(
                'text-sm',
                isDark ? 'text-slate-300' : 'text-slate-600'
              )}>
                {threat.name}
              </span>
              <span className={cn(
                'text-sm font-medium',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                {threat.count} ({threat.percentage}%)
              </span>
            </div>
            <div className={cn(
              'h-2 rounded-full overflow-hidden',
              isDark ? 'bg-slate-700' : 'bg-slate-100'
            )}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${threat.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', threat.color)}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MITRETacticCard() {
  const { isDark } = useTheme();
  const tactics = [
    { name: 'Execution', techniques: 15, severity: 'high' },
    { name: 'Persistence', techniques: 12, severity: 'high' },
    { name: 'Privilege Escalation', techniques: 8, severity: 'medium' },
    { name: 'Defense Evasion', techniques: 11, severity: 'medium' },
    { name: 'Discovery', techniques: 9, severity: 'low' },
    { name: 'Lateral Movement', techniques: 6, severity: 'critical' },
    { name: 'Collection', techniques: 7, severity: 'medium' },
    { name: 'Exfiltration', techniques: 4, severity: 'critical' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      case 'low': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          MITRE ATT&CK Tactics
        </h3>
        <div className="flex items-center gap-2">
          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span className={cn(
            'text-xs',
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          )}>
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tactics.map((tactic) => (
          <div
            key={tactic.name}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg',
              'transition-colors',
              isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
            )}
          >
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-slate-300' : 'text-slate-600'
            )}>
              {tactic.name}
            </span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              getSeverityColor(tactic.severity)
            )}>
              {tactic.techniques}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AlertsPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { alerts, fetchAlerts } = useAlertStore();

  useEffect(() => {
    fetchAlerts({ page: 1, limit: 5 });
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Skull className="w-4 h-4" />;
      case 'high':
        return <Flame className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          Active Alerts
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/alerts')}
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {(alerts.length > 0 ? alerts : [
          { id: '1', title: 'Suspicious PowerShell Execution', severity: 'critical', detectedAt: new Date().toISOString(), status: 'new' },
          { id: '2', title: 'Unusual Network Behavior Detected', severity: 'high', detectedAt: new Date(Date.now() - 1800000).toISOString(), status: 'investigating' },
          { id: '3', title: 'Multiple Failed Login Attempts', severity: 'medium', detectedAt: new Date(Date.now() - 3600000).toISOString(), status: 'acknowledged' },
          { id: '4', title: 'Suspicious File Modification Pattern', severity: 'high', detectedAt: new Date(Date.now() - 7200000).toISOString(), status: 'new' },
        ]).slice(0, 4).map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl cursor-pointer',
              'transition-all duration-200',
              isDark
                ? 'hover:bg-slate-700/50'
                : 'hover:bg-slate-50'
            )}
          >
            <div className={cn(
              'mt-0.5 p-1.5 rounded-lg',
              getSeverityColors(alert.severity)
            )}>
              {getSeverityIcon(alert.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-slate-200' : 'text-slate-700'
              )}>
                {alert.title}
              </p>
              <p className={cn(
                'text-xs mt-1',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                {formatRelativeTime(alert.detectedAt)}
              </p>
            </div>
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              alert.status === 'new'
                ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
            )}>
              {alert.status}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function InvestigationsPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { investigations, fetchInvestigations } = useInvestigationStore();

  useEffect(() => {
    fetchInvestigations({ page: 1, limit: 5 });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'analyzing': return 'bg-blue-500';
      case 'pending': return 'bg-amber-500';
      case 'closed': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          Active Investigations
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/investigations')}
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {(investigations.length > 0 ? investigations : [
          { id: '1', caseNumber: 'INV-2024-5A3B', title: 'Ransomware Incident Analysis', status: 'active', priority: 'critical', updatedAt: new Date().toISOString() },
          { id: '2', caseNumber: 'INV-2024-5A2C', title: 'Phishing Campaign Investigation', status: 'analyzing', priority: 'high', updatedAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', caseNumber: 'INV-2024-5A1D', title: 'Data Breach Assessment', status: 'pending', priority: 'medium', updatedAt: new Date(Date.now() - 7200000).toISOString() },
        ]).slice(0, 4).map((inv) => (
          <div
            key={inv.id}
            onClick={() => navigate(`/investigations/${inv.id}`)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer',
              'transition-all duration-200',
              isDark
                ? 'hover:bg-slate-700/50'
                : 'hover:bg-slate-50'
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full',
              getStatusColor(inv.status)
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-xs font-mono',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                {inv.caseNumber}
              </p>
              <p className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-slate-200' : 'text-slate-700'
              )}>
                {inv.title}
              </p>
            </div>
            <span className={cn(
              'text-xs font-medium uppercase',
              getPriorityColor(inv.priority)
            )}>
              {inv.priority}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ActivityFeed() {
  const { isDark } = useTheme();

  const activities = [
    { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: 'Evidence verified: malware_sample_001.exe', time: '2m ago' },
    { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', text: 'Sandbox session completed', time: '15m ago' },
    { icon: Folder, color: 'text-violet-500', bg: 'bg-violet-500/10', text: 'New evidence uploaded', time: '30m ago' },
    { icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10', text: 'Investigation created', time: '45m ago' },
    { icon: Brain, color: 'text-cyan-500', bg: 'bg-cyan-500/10', text: 'AI analysis completed', time: '1h ago' },
  ];

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          Recent Activity
        </h3>
        <button className={cn(
          'p-1.5 rounded-lg transition-colors',
          isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
        )}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3',
              'animate-fade-in'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              activity.bg
            )}>
              <activity.icon className={cn('w-4 h-4', activity.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm truncate',
                isDark ? 'text-slate-300' : 'text-slate-600'
              )}>
                {activity.text}
              </p>
            </div>
            <span className={cn(
              'text-xs flex-shrink-0',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}>
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AIEngineCard() {
  const { isDark } = useTheme();

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-2xl border p-5',
        'bg-gradient-to-br from-blue-500/10 to-violet-500/10',
        isDark ? 'border-slate-700/50' : 'border-slate-200'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className={cn(
            'text-base font-semibold',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            AI Analysis Engine
          </h3>
          <p className={cn(
            'text-xs',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            Last 24 hours
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span className={cn(
              'text-xs font-medium',
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            )}>
              Online
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={cn(
          'text-center p-3 rounded-xl',
          isDark ? 'bg-slate-800/50' : 'bg-white'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            isDark ? 'text-blue-400' : 'text-blue-600'
          )}>
            127
          </p>
          <p className={cn(
            'text-xs mt-1',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            Analyses
          </p>
        </div>
        <div className={cn(
          'text-center p-3 rounded-xl',
          isDark ? 'bg-slate-800/50' : 'bg-white'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            isDark ? 'text-violet-400' : 'text-violet-600'
          )}>
            94%
          </p>
          <p className={cn(
            'text-xs mt-1',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            Accuracy
          </p>
        </div>
        <div className={cn(
          'text-center p-3 rounded-xl',
          isDark ? 'bg-slate-800/50' : 'bg-white'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          )}>
            2.3s
          </p>
          <p className={cn(
            'text-xs mt-1',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            Avg Response
          </p>
        </div>
      </div>

      <div className={cn(
        'mt-4 p-3 rounded-xl',
        isDark ? 'bg-blue-500/10' : 'bg-blue-50'
      )}>
        <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
          <span className={cn('font-medium', isDark ? 'text-blue-400' : 'text-blue-600')}>
            Latest Insight:
          </span>{' '}
          Detected potential ransomware behavior pattern in sandbox session.
        </p>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <PageHeader
        title="Operations Command Center"
        subtitle="Real-time threat intelligence and forensic analysis overview"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-500">System Operational</span>
            </div>
            <Button
              variant="solid"
              size="sm"
              onClick={() => navigate('/reports')}
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/investigations?new=true')}
            >
              <Search className="w-4 h-4" />
              New Investigation
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Investigations"
          value={23}
          change={{ value: 12, type: 'increase' }}
          icon={<Search className="w-5 h-5 text-white" />}
          trend="up"
        />
        <StatCard
          label="Critical Alerts"
          value={8}
          change={{ value: 3, type: 'decrease' }}
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          severity="critical"
          trend="down"
        />
        <StatCard
          label="Total Evidence"
          value={458}
          change={{ value: 28, type: 'increase' }}
          icon={<Folder className="w-5 h-5 text-white" />}
          trend="up"
        />
        <StatCard
          label="Sandbox Sessions"
          value={12}
          change={{ value: 5, type: 'increase' }}
          icon={<Terminal className="w-5 h-5 text-white" />}
          trend="up"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Investigations & AI */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Analysis Engine */}
          <AIEngineCard />

          {/* Active Investigations */}
          <InvestigationsPanel />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <AlertsPanel />

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>

      {/* Bottom Row - Threat Distribution & MITRE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ThreatDistributionCard />
        <MITRETacticCard />
      </div>
    </motion.div>
  );
}

export default DashboardPage;