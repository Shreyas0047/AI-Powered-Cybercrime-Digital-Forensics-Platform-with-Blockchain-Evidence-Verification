/**
 * Threat Intelligence Dashboard
 * Enterprise SOC-style threat intelligence visualization
 */

import { useEffect, useState } from 'react';
import api from '../../services/api';

interface IOC {
  iocId: string;
  type: string;
  value: string;
  severity: string;
  status: string;
  category: string;
  threatScore: number;
  createdAt: string;
}

interface ThreatStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  recentActivity: IOC[];
}

export const ThreatIntelligenceDashboard: React.FC = () => {
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [recentIocs, setRecentIocs] = useState<IOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'iocs' | 'correlations'>('overview');

  useEffect(() => {
    fetchThreatIntelligence();
  }, []);

  const fetchThreatIntelligence = async () => {
    try {
      setLoading(true);
      const [statsRes, iocsRes] = await Promise.all([
        api.get<{ stats: ThreatStats }>('/threat/stats'),
        api.get<{ iocs: IOC[] }>('/threat/iocs?limit=10'),
      ]);

      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
      if (iocsRes.success && iocsRes.data?.iocs) {
        setRecentIocs(iocsRes.data.iocs);
      }
    } catch (error) {
      console.error('Failed to fetch threat intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
    return colors[severity] || 'bg-slate-600/30 text-slate-300 border-slate-500';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ip_address: '🌐',
      domain: '🔗',
      url: '📎',
      file_hash: '📄',
      process_name: '⚙️',
      registry_key: '🔑',
      file_path: '📁',
      command_line: '💻',
      email: '📧',
      mutex: '🔒',
      behavioral: '🔍',
    };
    return icons[type] || '🔸';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-md border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Threat Intelligence
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              IOC management, correlations, and threat analytics
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('iocs')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'iocs'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          IOCs
        </button>
        <button
          onClick={() => setActiveTab('correlations')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'correlations'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Correlations
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-cyan-400">{stats.total}</div>
                  <div className="text-sm text-cyan-300 mt-1">Total IOCs</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-400">{stats.bySeverity?.critical || 0}</div>
                  <div className="text-sm text-red-300 mt-1">Critical</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-orange-400">{stats.bySeverity?.high || 0}</div>
                  <div className="text-sm text-orange-300 mt-1">High</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-400">{stats.bySeverity?.medium || 0}</div>
                  <div className="text-sm text-yellow-300 mt-1">Medium</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-400">{stats.bySeverity?.low || 0}</div>
                  <div className="text-sm text-green-300 mt-1">Low</div>
                </div>
              </div>
            )}

            {/* IOC Distribution */}
            {stats && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">IOC Distribution by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(stats.byType || {}).slice(0, 8).map(([type, count]) => (
                    <div key={type} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(type)}</span>
                        <span className="text-sm text-slate-400 capitalize">{type.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="font-medium text-slate-200">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Recent IOC Activity</h3>
              <div className="space-y-2">
                {recentIocs.slice(0, 5).map((ioc) => (
                  <div
                    key={ioc.iocId}
                    className={`p-3 rounded-lg border ${getSeverityColor(ioc.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getTypeIcon(ioc.type)}</span>
                        <span className="font-mono text-sm text-slate-200">{ioc.value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-700/50">
                          {ioc.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(ioc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'iocs' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search IOCs..."
                className="flex-1 border border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200"
              />
              <select className="border border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200">
                <option value="">All Types</option>
                <option value="ip_address">IP Address</option>
                <option value="domain">Domain</option>
                <option value="file_hash">File Hash</option>
                <option value="process_name">Process</option>
              </select>
              <select className="border border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200">
                <option value="">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">IOC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {recentIocs.map((ioc) => (
                    <tr key={ioc.iocId} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-sm text-slate-200">{ioc.value}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 capitalize">{ioc.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(ioc.severity)}`}>
                          {ioc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{ioc.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                ioc.threatScore >= 70 ? 'bg-red-500' :
                                ioc.threatScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${ioc.threatScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-300">{ioc.threatScore}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'correlations' && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-2">Threat Relationship Graph</p>
            <p className="text-sm">Visualize correlations between IOCs, evidence, and investigations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatIntelligenceDashboard;