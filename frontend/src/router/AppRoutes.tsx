import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { UserRole } from '../types';
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
import UsersPage from '../pages/UsersPage';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Role-based Route Wrapper
function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
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
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin']}>
            <SystemHealthPage />
          </RoleRoute>
        ),
      },
      {
        path: 'blockchain-operations',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin', 'forensic_analyst']}>
            <BlockchainOperationsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'threat-intelligence',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin', 'analyst', 'forensic_analyst']}>
            <ThreatIntelligencePage />
          </RoleRoute>
        ),
      },
      {
        path: 'forensic-analytics',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin']}>
            <ForensicAnalyticsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin']}>
            <UsersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin']}>
            <SettingsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <RoleRoute allowedRoles={['admin', 'super_admin']}>
            <LogsPage />
          </RoleRoute>
        ),
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
        path: 'users',
        element: <UsersPage />,
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