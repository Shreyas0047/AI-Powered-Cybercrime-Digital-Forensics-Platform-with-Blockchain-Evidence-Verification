/**
 * Forensic Analytics Dashboard
 * Enterprise analytics with behavioral intelligence and investigation correlation
 */

import { useEffect, useState } from 'react';
import api from '../../services/api';

interface BehavioralPattern {
  patternId: string;
  category: string;
  name: string;
  description: string;
  severity: string;
  mitreTactics: string[];
}

interface Anomaly {
  anomalyId: string;
  severity: string;
  title: string;
  description: string;
  confidence: number;
  indicators: string[];
  threatScore: number;
  status: string;
}

interface InvestigationCluster {
  clusterId: string;
  label: string;
  investigationIds: string[];
  sharedIndicators: string[];
  strength: number;
}

interface CorrelationInsight {
  insightId: string;
  type: string;
  title: string;
  description: string;
  investigations: string[];
  confidence: number;
  severity: string;
  recommendations: string[];
}

interface DashboardData {
  summary: {
    totalClusters: number;
    highSeverityInsights: number;
    totalPatterns: number;
    criticalPatterns: number;
  };
  clusters: InvestigationCluster[];
  insights: CorrelationInsight[];
  patterns: BehavioralPattern[];
}

export const ForensicAnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'clusters' | 'anomalies'>('overview');

  useEffect(() => {
    fetchDashboardData();
    fetchAnomalies();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ metrics: DashboardData }>('/analytics/dashboard');
      if (response.success && response.data) {
        setDashboardData(response.data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const response = await api.get<{ patterns: BehavioralPattern[] }>('/analytics/patterns');
      if (response.success && response.data) {
        // Generate sample anomalies based on patterns
        const patterns = response.data.patterns || [];
        const sampleAnomalies: Anomaly[] = patterns.slice(0, 5).map((p: BehavioralPattern) => ({
          anomalyId: `AN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: p.severity,
          title: p.name,
          description: p.description,
          confidence: 75,
          indicators: p.mitreTactics,
          threatScore: p.severity === 'high' ? 80 : p.severity === 'medium' ? 50 : 30,
          status: 'new',
        }));
        setAnomalies(sampleAnomalies);
      }
    } catch (error) {
      console.error('Failed to fetch anomalies:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      process_execution: '⚙️',
      registry_activity: '🔑',
      filesystem_behavior: '📁',
      network_activity: '🌐',
      persistence_mechanism: '🔄',
      privilege_escalation: '⬆️',
      lateral_movement: '➡️',
      data_exfiltration: '📤',
      command_execution: '💻',
    };
    return icons[category] || '🔸';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Forensic Analytics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Behavioral intelligence and investigation correlation
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardData && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-700">
                {dashboardData.summary.totalClusters}
              </div>
              <div className="text-sm text-blue-600 mt-1">Investigation Clusters</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-700">
                {dashboardData.summary.highSeverityInsights}
              </div>
              <div className="text-sm text-red-600 mt-1">High Severity Insights</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-700">
                {dashboardData.summary.totalPatterns}
              </div>
              <div className="text-sm text-purple-600 mt-1">Behavioral Patterns</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-700">
                {dashboardData.summary.criticalPatterns}
              </div>
              <div className="text-sm text-orange-600 mt-1">Critical Patterns</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'patterns'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Behavioral Patterns
        </button>
        <button
          onClick={() => setActiveTab('clusters')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'clusters'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Investigation Clusters
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === 'anomalies'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Anomalies
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* High Severity Insights */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">High Priority Insights</h3>
              <div className="space-y-2">
                {dashboardData.insights
                  .filter(i => i.severity === 'critical' || i.severity === 'high')
                  .slice(0, 5)
                  .map((insight) => (
                    <div
                      key={insight.insightId}
                      className={`p-3 rounded-lg border ${getSeverityColor(insight.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-sm mt-1 opacity-80">{insight.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs opacity-75">
                              {insight.investigations.length} linked investigations
                            </span>
                            <span className="text-xs opacity-75">•</span>
                            <span className="text-xs opacity-75">
                              {insight.confidence}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {dashboardData.insights.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No high severity insights at this time
                  </div>
                )}
              </div>
            </div>

            {/* MITRE ATT&CK Tactics */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">MITRE ATT&CK Tactics Coverage</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['reconnaissance', 'execution', 'persistence', 'privilege_escalation',
                  'defense_evasion', 'credential_access', 'discovery', 'lateral_movement'].map((tactic) => (
                  <div key={tactic} className="bg-gray-50 rounded-lg p-2 text-center">
                    <span className="text-sm text-gray-700 capitalize">{tactic.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patterns' && dashboardData && (
          <div className="space-y-3">
            {dashboardData.patterns.map((pattern) => (
              <div
                key={pattern.patternId}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getCategoryIcon(pattern.category)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{pattern.name}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(pattern.severity)}`}>
                          {pattern.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {pattern.mitreTactics.map((tactic) => (
                          <span key={tactic} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                            {tactic.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'clusters' && dashboardData && (
          <div className="space-y-4">
            {dashboardData.clusters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">🔗 Investigation Clusters</p>
                <p className="text-sm">Clusters will appear when related investigations share evidence or IOCs</p>
              </div>
            ) : (
              dashboardData.clusters.map((cluster) => (
                <div key={cluster.clusterId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{cluster.label}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {cluster.investigationIds.length} linked investigations
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cluster.sharedIndicators.slice(0, 3).map((indicator, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-mono">
                            {indicator.substring(0, 16)}...
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{cluster.strength}%</div>
                      <div className="text-xs text-gray-500">Correlation Strength</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.anomalyId}
                className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{anomaly.title}</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-white/50">
                        {anomaly.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Threat Score:</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              anomaly.threatScore >= 70 ? 'bg-red-500' :
                              anomaly.threatScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${anomaly.threatScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{anomaly.threatScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicAnalyticsDashboard;