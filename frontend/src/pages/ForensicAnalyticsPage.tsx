/**
 * Forensic Analytics Page
 * Advanced behavioral intelligence and investigation correlation
 */

import { ForensicAnalyticsDashboard } from '../components/blockchain/ForensicAnalyticsDashboard';

export const ForensicAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Forensic Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Behavioral intelligence, anomaly detection, and investigation correlation
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <ForensicAnalyticsDashboard />
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-2">
            About Forensic Analytics
          </h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• <strong>Behavioral Patterns:</strong> Pre-defined suspicious behavior signatures for detection</li>
            <li>• <strong>Anomaly Detection:</strong> Identify unusual forensic activity based on behavioral baselines</li>
            <li>• <strong>Investigation Correlation:</strong> Find relationships between investigations through shared IOCs, evidence, and patterns</li>
            <li>• <strong>MITRE ATT&CK:</strong> Educational classification of suspicious behaviors using defensive mapping</li>
            <li>• <strong>Threat Scoring:</strong> Explainable risk calculation based on multiple forensic factors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForensicAnalyticsPage;