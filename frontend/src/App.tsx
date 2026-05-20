import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/AppRoutes';
import { useAuthStore } from './stores/authStore';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check authentication on app load - wrap in try/catch to prevent blank page
    const initAuth = async () => {
      try {
        if (!isAuthenticated) {
          await checkAuth();
        }
      } catch (error) {
        console.warn('Auth check failed, using cached state');
      }
    };
    initAuth();
  }, [checkAuth, isAuthenticated]);

  return <RouterProvider router={router} />;
}

export default App;