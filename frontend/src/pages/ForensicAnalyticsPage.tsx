/**
 * Forensic Analytics Page
 * Advanced behavioral intelligence and investigation correlation
 */

import { ForensicAnalyticsDashboard } from '../components/blockchain/ForensicAnalyticsDashboard';

export const ForensicAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            Forensic Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Behavioral intelligence, anomaly detection, and investigation correlation
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <ForensicAnalyticsDashboard />
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-cyan-400 mb-2">
            About Forensic Analytics
          </h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <strong className="text-slate-300">Behavioral Patterns:</strong> Pre-defined suspicious behavior signatures for detection</li>
            <li>• <strong className="text-slate-300">Anomaly Detection:</strong> Identify unusual forensic activity based on behavioral baselines</li>
            <li>• <strong className="text-slate-300">Investigation Correlation:</strong> Find relationships between investigations through shared IOCs, evidence, and patterns</li>
            <li>• <strong className="text-slate-300">MITRE ATT&CK:</strong> Educational classification of suspicious behaviors using defensive mapping</li>
            <li>• <strong className="text-slate-300">Threat Scoring:</strong> Explainable risk calculation based on multiple forensic factors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForensicAnalyticsPage;