import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/AppRoutes';
import { useAuthStore } from './stores/authStore';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check authentication on app load
    if (!isAuthenticated) {
      checkAuth();
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;