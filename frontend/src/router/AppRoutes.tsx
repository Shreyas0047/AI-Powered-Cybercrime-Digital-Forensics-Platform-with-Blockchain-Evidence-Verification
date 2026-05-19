import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import EnhancedDashboardPage from '../pages/EnhancedDashboardPage';
import InvestigationsPage from '../pages/InvestigationsPage';
import InvestigationDetailPage from '../pages/InvestigationDetailPage';
import AlertsPage from '../pages/AlertsPage';
import EvidenceExplorerPage from '../pages/EvidenceExplorerPage';
import SandboxDashboardPage from '../pages/SandboxDashboardPage';
import LiveTelemetryPage from '../pages/LiveTelemetryPage';
import SystemHealthPage from '../pages/SystemHealthPage';
import BlockchainOperationsPage from '../pages/BlockchainOperationsPage';
import ThreatIntelligencePage from '../pages/ThreatIntelligencePage';
import ForensicAnalyticsPage from '../pages/ForensicAnalyticsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import LogsPage from '../pages/LogsPage';
import EvidenceArtifactsPage from '../pages/EvidenceArtifactsPage';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Wrapper (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Placeholder components for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        <p className="text-slate-500 mt-2">This page is coming soon...</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <EnhancedDashboardPage />,
      },
      {
        path: 'investigations',
        element: <InvestigationsPage />,
      },
      {
        path: 'investigations/:id',
        element: <InvestigationDetailPage />,
      },
      {
        path: 'evidence',
        element: <EvidenceExplorerPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
      },
      {
        path: 'sandbox',
        element: <SandboxDashboardPage />,
      },
      {
        path: 'ai-analysis',
        element: <PlaceholderPage title="AI Analysis" />,
      },
      {
        path: 'telemetry',
        element: <LiveTelemetryPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'audit',
        element: <LogsPage />,
      },
      {
        path: 'evidence-artifacts',
        element: <EvidenceArtifactsPage />,
      },
      {
        path: 'health',
        element: <SystemHealthPage />,
      },
      {
        path: 'blockchain-operations',
        element: <BlockchainOperationsPage />,
      },
      {
        path: 'threat-intelligence',
        element: <ThreatIntelligencePage />,
      },
      {
        path: 'forensic-analytics',
        element: <ForensicAnalyticsPage />,
      },
      {
        path: '',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;