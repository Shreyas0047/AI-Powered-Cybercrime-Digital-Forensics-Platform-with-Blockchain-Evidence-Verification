import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Folder,
  File,
  Database,
  Network,
  Image,
  FileCode,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PageHeader, PageGrid } from '../layouts/PageContainer';
import { DashboardCard, DashboardStat } from '../components/enterprise/DashboardGrid';
import { formatRelativeTime, formatFileSize, cn } from '../utils/helpers';

const mockEvidence = [
  { id: '1', evidenceId: 'EV-2024-5A3B-001', name: 'suspicious_email.eml', type: 'email', size: 24576, status: 'verified', investigation: 'INV-2024-5A3B', collectedAt: '2024-01-15T11:00:00Z', collectedBy: 'John Smith', verified: true, tags: ['phishing', 'initial-compromise'] },
  { id: '2', evidenceId: 'EV-2024-5A3B-002', name: 'malware_sample.exe', type: 'malware_sample', size: 153600, status: 'analyzing', investigation: 'INV-2024-5A3B', collectedAt: '2024-01-15T12:30:00Z', collectedBy: 'Sarah Johnson', verified: false, tags: ['ransomware', 'binary'] },
  { id: '3', evidenceId: 'EV-2024-5A3B-003', name: 'network_capture.pcap', type: 'network_capture', size: 5242880, status: 'ready', investigation: 'INV-2024-5A3B', collectedAt: '2024-01-15T14:00:00Z', collectedBy: 'Mike Chen', verified: true, tags: ['network', 'c2-traffic'] },
  { id: '4', evidenceId: 'EV-2024-5A3B-004', name: 'memory_dump.raw', type: 'memory_dump', size: 8192000, status: 'ready', investigation: 'INV-2024-5A3B', collectedAt: '2024-01-15T15:30:00Z', collectedBy: 'John Smith', verified: true, tags: ['memory', 'volatile'] },
  { id: '5', evidenceId: 'EV-2024-5A2C-001', name: 'phishing_landing.html', type: 'file', size: 15360, status: 'verified', investigation: 'INV-2024-5A2C', collectedAt: '2024-01-14T09:00:00Z', collectedBy: 'Sarah Johnson', verified: true, tags: ['phishing', 'web'] },
  { id: '6', evidenceId: 'EV-2024-5A2C-002', name: 'event_logs.xml', type: 'log', size: 2097152, status: 'ready', investigation: 'INV-2024-5A2C', collectedAt: '2024-01-14T10:30:00Z', collectedBy: 'Mike Chen', verified: true, tags: ['windows', 'security'] },
  { id: '7', evidenceId: 'EV-2024-5A1D-001', name: 'screenshot_desktop.png', type: 'screenshot', size: 1048576, status: 'ready', investigation: 'INV-2024-5A1D', collectedAt: '2024-01-13T14:00:00Z', collectedBy: 'John Smith', verified: true, tags: ['visual', 'evidence'] },
  { id: '8', evidenceId: 'EV-2024-5A1D-002', name: 'registry_export.reg', type: 'registry_dump', size: 524288, status: 'analyzing', investigation: 'INV-2024-5A1D', collectedAt: '2024-01-13T15:30:00Z', collectedBy: 'Sarah Johnson', verified: false, tags: ['registry', 'persistence'] },
];

const typeIcons: Record<string, typeof File> = {
  email: FileText,
  malware_sample: FileCode,
  network_capture: Network,
  memory_dump: Database,
  file: File,
  log: FileText,
  screenshot: Image,
  registry_dump: FileCode,
  package: Folder,
  report: FileText,
};

const typeColors: Record<string, string> = {
  email: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  malware_sample: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  network_capture: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  memory_dump: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  file: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  log: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
  screenshot: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  registry_dump: 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function EvidenceExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvidence, setSelectedEvidence] = useState<typeof mockEvidence[0] | null>(null);

  const filteredEvidence = mockEvidence.filter((evidence) => {
    const matchesSearch = evidence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evidence.evidenceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || evidence.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || evidence.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalSize = mockEvidence.reduce((acc, e) => acc + e.size, 0);
  const verifiedCount = mockEvidence.filter(e => e.verified).length;
  const analyzingCount = mockEvidence.filter(e => e.status === 'analyzing').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Evidence Explorer"
        subtitle="Browse and manage forensic evidence"
        actions={
          <Button size="sm">
            <Upload className="w-4 h-4" />
            Upload Evidence
          </Button>
        }
      />

      {/* Stats */}
      <PageGrid columns={4}>
        <DashboardCard>
          <DashboardStat
            label="Total Evidence"
            value={mockEvidence.length}
            icon={<FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Verified"
            value={verifiedCount}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Analyzing"
            value={analyzingCount}
            icon={<Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          />
        </DashboardCard>
        <DashboardCard>
          <DashboardStat
            label="Total Size"
            value={formatFileSize(totalSize)}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          />
        </DashboardCard>
      </PageGrid>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'email', label: 'Email' },
                { value: 'malware_sample', label: 'Malware Sample' },
                { value: 'network_capture', label: 'Network Capture' },
                { value: 'memory_dump', label: 'Memory Dump' },
                { value: 'log', label: 'Log' },
                { value: 'screenshot', label: 'Screenshot' },
                { value: 'registry_dump', label: 'Registry Dump' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'ready', label: 'Ready' },
                { value: 'analyzing', label: 'Analyzing' },
                { value: 'verified', label: 'Verified' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredEvidence.map((evidence) => {
                const Icon = typeIcons[evidence.type] || File;
                const colorClass = typeColors[evidence.type] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';

                return (
                  <motion.div
                    key={evidence.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    onClick={() => setSelectedEvidence(evidence)}
                    className={cn(
                      'px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                      selectedEvidence?.id === evidence.id && 'bg-cyan-50/50 dark:bg-cyan-900/10'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{evidence.name}</p>
                          {evidence.verified && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{evidence.evidenceId}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{evidence.type.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatFileSize(evidence.size)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={evidence.status} size="sm" />
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedEvidence ? (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Evidence Details</h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', typeColors[selectedEvidence.type] || 'bg-slate-100')}>
                    {(() => {
                      const Icon = typeIcons[selectedEvidence.type] || File;
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{selectedEvidence.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{selectedEvidence.evidenceId}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Type</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{selectedEvidence.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Size</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{formatFileSize(selectedEvidence.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                    <StatusBadge status={selectedEvidence.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Investigation</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">{selectedEvidence.investigation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Collected By</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedEvidence.collectedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Collected</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{formatRelativeTime(selectedEvidence.collectedAt)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvidence.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button variant="danger" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Select an evidence item to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default EvidenceExplorerPage;