import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  Brain,
  MessageSquare,
  Upload,
  TrendingUp,
  Shield,
  Eye,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { DashboardCard } from '../components/enterprise/DashboardGrid';
import { useTimelineStore, mockTelemetryEvents, mockAnalystNotes } from '../stores/timelineStore';
import { formatRelativeTime, cn } from '../utils/helpers';

// Mock investigation data for demonstration
const mockInvestigation = {
  id: '1',
  caseNumber: 'INV-2024-5A3B',
  title: 'Ransomware Incident Analysis - Finance Server',
  description: 'Comprehensive analysis of ransomware attack on company finance servers. Initial compromise through phishing email leading to lateral movement and encryption of critical financial data.',
  status: 'analyzing' as const,
  priority: 'critical' as const,
  category: 'ransomware',
  phase: 'containment' as const,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-16T14:20:00Z',
  createdBy: { id: '1', name: 'John Smith', email: 'john@company.com', role: 'forensic_analyst' as const, createdAt: '' },
  leadAnalyst: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'forensic_analyst' as const, createdAt: '' },
  assignedAnalysts: [
    { userId: '2', role: 'lead' as const, assignedAt: '2024-01-15T10:30:00Z', user: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'forensic_analyst' as const, createdAt: '' } },
    { userId: '3', role: 'contributor' as const, assignedAt: '2024-01-15T14:00:00Z', user: { id: '3', name: 'Mike Chen', email: 'mike@company.com', role: 'forensic_analyst' as const, createdAt: '' } },
  ],
  evidenceCount: 12,
  alertCount: 3,
  tags: ['ransomware', 'phishing', 'lateral-movement', 'finance', 'critical'],
};

const mockAIAnalysis = {
  threatType: 'Ransomware - LockBit Variant',
  confidence: 92,
  severityScore: 95,
  severityLevel: 'critical',
  keyFindings: [
    'Encoded PowerShell execution detected - likely initial compromise vector',
    'Registry persistence mechanism identified - Run key modification',
    'Network beaconing pattern consistent with C2 communication',
    'File encryption behavior with .encrypted extension pattern',
    'Lateral movement indicators via SMB enumeration',
  ],
  behavioralSummary: 'The analyzed sample exhibits classic ransomware behavior including file encryption, persistence mechanisms, and command-and-control communication. The execution pattern suggests automated ransomware delivery with manual lateral movement.',
  recommendations: [
    'Immediate isolation of affected systems from network',
    'Block communication with 192.168.1.100 (known C2)',
    'Reset compromised credentials for affected users',
    'Implement endpoint detection on remaining finance servers',
    'Review email gateway for phishing campaign indicators',
  ],
};

const mockEvidence = [
  { id: '1', name: 'suspicious_email.eml', type: 'email', size: 24576, status: 'verified', collectedAt: '2024-01-15T11:00:00Z' },
  { id: '2', name: 'malware_sample.exe', type: 'malware_sample', size: 153600, status: 'analyzing', collectedAt: '2024-01-15T12:30:00Z' },
  { id: '3', name: 'network_capture.pcap', type: 'network_capture', size: 5242880, status: 'ready', collectedAt: '2024-01-15T14:00:00Z' },
  { id: '4', name: 'memory_dump.raw', type: 'memory_dump', size: 8192000, status: 'ready', collectedAt: '2024-01-15T15:30:00Z' },
];

const mockAlerts = [
  { id: '1', title: 'Suspicious PowerShell Execution', severity: 'critical', status: 'in_progress', detectedAt: '2024-01-16T14:30:00Z' },
  { id: '2', title: 'Network Connection to Suspicious IP', severity: 'high', status: 'acknowledged', detectedAt: '2024-01-16T14:35:00Z' },
  { id: '3', title: 'Registry Modification for Persistence', severity: 'high', status: 'new', detectedAt: '2024-01-16T14:40:00Z' },
];

const mockTimeline = [
  { timestamp: '2024-01-15T10:30:00Z', action: 'Investigation created', user: 'John Smith', details: 'Initial case opened' },
  { timestamp: '2024-01-15T11:00:00Z', action: 'Evidence collected', user: 'John Smith', details: 'Suspicious email extracted from mailbox' },
  { timestamp: '2024-01-15T12:30:00Z', action: 'Malware sample obtained', user: 'Sarah Johnson', details: 'Binary retrieved from endpoint' },
  { timestamp: '2024-01-15T14:00:00Z', action: 'Network capture initiated', user: 'Mike Chen', details: 'PCAP started on affected server' },
  { timestamp: '2024-01-16T09:00:00Z', action: 'Status updated', user: 'Sarah Johnson', details: 'Investigation moved to analyzing phase' },
  { timestamp: '2024-01-16T14:30:00Z', action: 'AI analysis completed', user: 'System', details: 'Automated threat classification completed' },
];

type TabType = 'overview' | 'evidence' | 'timeline' | 'analysis' | 'notes';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function InvestigationDetailPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [_showNoteModal, setShowNoteModal] = useState(false);

  const { setEvents } = useTimelineStore();

  useEffect(() => {
    setEvents(mockTelemetryEvents);
  }, [setEvents]);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Eye },
    { id: 'evidence' as const, label: 'Evidence', icon: FileText },
    { id: 'timeline' as const, label: 'Timeline', icon: Clock },
    { id: 'analysis' as const, label: 'AI Analysis', icon: Brain },
    { id: 'notes' as const, label: 'Notes', icon: MessageSquare },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/investigations')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{mockInvestigation.caseNumber}</p>
            <SeverityBadge severity={mockInvestigation.priority as any} size="sm" />
            <StatusBadge status={mockInvestigation.status} size="sm" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{mockInvestigation.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Shield className="w-4 h-4" />
            Escalate
          </Button>
          <Button size="sm">
            <Upload className="w-4 h-4" />
            Add Evidence
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={item}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <DashboardCard>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Investigation Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-slate-700 dark:text-slate-300">{mockInvestigation.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Category</p>
                      <span className="text-slate-700 dark:text-slate-300 capitalize">{mockInvestigation.category}</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Phase</p>
                      <span className="text-slate-700 dark:text-slate-300 capitalize">{mockInvestigation.phase?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mockInvestigation.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </DashboardCard>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <DashboardCard>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockInvestigation.evidenceCount}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Evidence</p>
                    </div>
                  </div>
                </DashboardCard>
                <DashboardCard>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockInvestigation.alertCount}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Alerts</p>
                    </div>
                  </div>
                </DashboardCard>
                <DashboardCard>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">8</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Events</p>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <DashboardCard>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Team</h3>
                <div className="space-y-3">
                  {mockInvestigation.assignedAnalysts.map((analyst) => (
                    <div key={analyst.userId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
                        {analyst.user?.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{analyst.user?.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{analyst.role}</p>
                      </div>
                      {analyst.role === 'lead' && (
                        <StatusBadge status="active" size="sm" />
                      )}
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Linked Alerts</h3>
                <div className="space-y-3">
                  {mockAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        alert.severity === 'critical' && 'bg-red-100 dark:bg-red-900/20',
                        alert.severity === 'high' && 'bg-orange-100 dark:bg-orange-900/20',
                        alert.severity === 'medium' && 'bg-amber-100 dark:bg-amber-900/20'
                      )}>
                        <AlertTriangle className={cn(
                          'w-4 h-4',
                          alert.severity === 'critical' && 'text-red-600 dark:text-red-400',
                          alert.severity === 'high' && 'text-orange-600 dark:text-orange-400',
                          alert.severity === 'medium' && 'text-amber-600 dark:text-amber-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{alert.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(alert.detectedAt)}</p>
                      </div>
                      <SeverityBadge severity={alert.severity as any} size="sm" />
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Timeline</h3>
                <div className="space-y-3">
                  {mockTimeline.slice(0, 5).map((entry, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                        {index < mockTimeline.length - 1 && <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{entry.action}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{entry.user}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatRelativeTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Evidence Items</h2>
              <Button size="sm">
                <Upload className="w-4 h-4" />
                Upload Evidence
              </Button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {mockEvidence.map((evidence) => (
                <div key={evidence.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{evidence.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{evidence.type.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{(evidence.size / 1024).toFixed(1)} KB</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(evidence.collectedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {evidence.status === 'verified' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      <StatusBadge status={evidence.status} size="sm" />
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        {activeTab === 'timeline' && (
          <DashboardCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Forensic Timeline</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Filter</Button>
                <Button variant="outline" size="sm">Export</Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {mockTelemetryEvents.map((event, index) => {
                const eventColors: Record<string, { bg: string; border: string }> = {
                  process: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
                  file: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
                  registry: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
                  network: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
                  module: { bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' },
                  behavior: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
                  anomaly: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
                };
                const colors = eventColors[event.type] || eventColors.process;
                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-3 h-3 rounded-full border-2',
                        event.type === 'process' && 'border-blue-500 dark:border-blue-400',
                        event.type === 'file' && 'border-orange-500 dark:border-orange-400',
                        event.type === 'registry' && 'border-purple-500 dark:border-purple-400',
                        event.type === 'network' && 'border-red-500 dark:border-red-400',
                        event.type === 'module' && 'border-slate-500 dark:border-slate-400',
                        event.type === 'behavior' && 'border-amber-500 dark:border-amber-400',
                        event.type === 'anomaly' && 'border-rose-500 dark:border-rose-400'
                      )} />
                      {index < mockTelemetryEvents.length - 1 && <div className="w-px h-16 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>
                    <div className={cn('flex-1 p-4 rounded-xl border', colors.bg, colors.border)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{event.type}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(event.timestamp)}</span>
                        </div>
                        {event.suspiciousScore && (
                          <SeverityBadge severity={event.suspiciousScore > 80 ? 'critical' : event.suspiciousScore > 60 ? 'high' : 'medium'} size="sm" />
                        )}
                      </div>
                      <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <DashboardCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Threat Analysis</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Automated forensic intelligence</p>
                </div>
                <div className="ml-auto">
                  <SeverityBadge severity="critical" size="sm" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Threat Type</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{mockAIAnalysis.threatType}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Severity Score</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{mockAIAnalysis.severityScore}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Severity Level</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">{mockAIAnalysis.severityLevel}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Key Findings</h3>
                  <ul className="space-y-2">
                    {mockAIAnalysis.keyFindings.map((finding, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Behavioral Summary</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                    {mockAIAnalysis.behavioralSummary}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Recommended Actions</h3>
                  <div className="space-y-2">
                    {mockAIAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Analyst Notes</h2>
              <Button onClick={() => setShowNoteModal(true)}>
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            </div>

            <div className="space-y-4">
              {mockAnalystNotes.map((note) => {
                const noteTypeStyles: Record<string, string> = {
                  observation: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
                  finding: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50',
                  conclusion: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
                  remediation: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
                  escalation: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
                };
                const style = noteTypeStyles[note.type] || noteTypeStyles.observation;

                return (
                  <motion.div
                    key={note.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className={cn('p-4 rounded-xl border', style)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{note.type.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{note.createdByName}</span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{note.content}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default InvestigationDetailPage;