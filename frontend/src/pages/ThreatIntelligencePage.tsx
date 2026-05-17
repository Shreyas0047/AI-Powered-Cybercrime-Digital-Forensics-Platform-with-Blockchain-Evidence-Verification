/**
 * Threat Intelligence Page
 * Enterprise SOC-style threat intelligence dashboard
 */

import React from 'react';
import { ThreatIntelligenceDashboard } from '../components/blockchain/ThreatIntelligenceDashboard';

export const ThreatIntelligencePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Threat Intelligence
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            IOC management, threat correlation, and investigation enrichment
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <ThreatIntelligenceDashboard />
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            About Threat Intelligence
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>IOCs (Indicators of Compromise):</strong> Track suspicious IPs, domains, hashes, and behavioral patterns</li>
            <li>• <strong>Threat Correlation:</strong> Link related evidence, IOCs, and investigations to identify attack patterns</li>
            <li>• <strong>Investigation Enrichment:</strong> Automatically enrich investigations with threat intelligence</li>
            <li>• <strong>Threat Analytics:</strong> Visualize IOC trends, severity distributions, and threat heatmaps</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThreatIntelligencePage;