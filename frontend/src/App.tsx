import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

/**
 * Auth Initialization Component
 * Handles authentication check on app startup
 * Shows loading screen while verifying authentication
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Perform initial auth check
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsReady(true);
        setInitialCheckDone(true);
      }
    };

    initAuth();
  }, [checkAuth]);

  // Redirect based on auth state after initialization
  useEffect(() => {
    if (!initialCheckDone) return;

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    if (!isAuthenticated && !isAuthPage) {
      // Not authenticated and not on login page - redirect to login
      navigate('/login', { replace: true });
    } else if (isAuthenticated && isAuthPage) {
      // Authenticated and on login page - redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, initialCheckDone, navigate, location.pathname]);

  if (!isReady) {
    return (
      <LoadingScreen />
    );
  }

  return <>{children}</>;
}

/**
 * Loading Screen Component
 * Displays a loading spinner while the app initializes
 */
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#22d3ee'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#fff' }}>ForensicsAI</h1>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #0891b2',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginTop: '20px'
      }} />
      <p style={{ marginTop: '20px', color: '#94a3b8' }}>Loading platform...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export { AuthInitializer, LoadingScreen };