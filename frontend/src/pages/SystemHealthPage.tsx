import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Brain,
  Shield,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { cn } from '../design-system';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  responseTime?: number;
  lastCheck: string;
  details?: string;
}

interface SystemMetrics {
  uptime: string;
  cpu: number;
  memory: number;
  storage: number;
  activeConnections: number;
}

const emptyServices: ServiceStatus[] = [];

const defaultMetrics: SystemMetrics = {
  uptime: '0d 0h 0m',
  cpu: 0,
  memory: 0,
  storage: 0,
  activeConnections: 0,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function SystemHealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>(emptyServices);
  const [metrics] = useState<SystemMetrics>(defaultMetrics);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refreshStatus = () => {
    setLastRefresh(new Date());
    setServices([]);
  };

  const healthyCount = 0;
  const degradedCount = 0;
  const offlineCount = 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <PageHeader
          title="System Health"
          subtitle="Platform diagnostics and monitoring"
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
              <Button variant="outline" size="sm" onClick={refreshStatus}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Overview Stats */}
      <PageGrid columns={4}>
        <DashboardCard>
          <DashboardStat
            label="Healthy Services"
            value={healthyCount}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Degraded"
            value={degradedCount}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Offline"
            value={offlineCount}
            icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Active Connections"
            value={metrics.activeConnections}
            icon={<Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* System Metrics */}
      <motion.div variants={item}>
        <DashboardCard>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(metrics.cpu / 100) * 226} 226`} className="text-cyan-500" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.cpu}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">CPU</p>
            </div>
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(metrics.memory / 100) * 226} 226`} className="text-violet-500" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.memory}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Memory</p>
            </div>
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(metrics.storage / 100) * 226} 226`} className="text-amber-500" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{metrics.storage}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Storage</p>
            </div>
            <div className="text-center col-span-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.uptime}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System Uptime</p>
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Service Status */}
      <motion.div variants={item}>
        <DashboardCard>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Service Status</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {services.map((service) => (
              <div
                key={service.name}
                className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      service.status === 'healthy' && 'bg-emerald-500',
                      service.status === 'degraded' && 'bg-amber-500',
                      service.status === 'offline' && 'bg-red-500'
                    )} />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{service.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{service.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {service.responseTime && (
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Response</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{service.responseTime}ms</p>
                      </div>
                    )}
                    <StatusBadge status={service.status} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </motion.div>

      {/* Platform Components */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Backend API</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Express + TypeScript</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Port</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">3001</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Endpoints</span>
              <span className="text-slate-700 dark:text-slate-300">50+</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">JWT Auth</span>
              <StatusBadge status="active" size="sm" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">AI Engine</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">FastAPI + Python</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <StatusBadge status="active" size="sm" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Analysis</span>
              <span className="text-slate-700 dark:text-slate-300">Telemetry + Reports</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Models</span>
              <span className="text-slate-700 dark:text-slate-300">4 Loaded</span>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sandbox Agent</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PyQt6 Desktop</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Simulators</span>
              <span className="text-slate-700 dark:text-slate-300">5 Active</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">VM Integration</span>
              <StatusBadge status="active" size="sm" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Telemetry</span>
              <span className="text-slate-700 dark:text-slate-300">12 Types</span>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Version Info */}
      <motion.div variants={item}>
        <DashboardCard className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">ForensicsAI Platform</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Cybercrime Digital Forensics Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">Version 3.7.0</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Phase 3.6 - Complete</p>
            </div>
          </div>
        </DashboardCard>
      </motion.div>
    </motion.div>
  );
}

export default SystemHealthPage;