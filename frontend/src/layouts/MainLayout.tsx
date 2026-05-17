/**
 * Enterprise Application Shell
 * Modern SOC-style layout with improved navigation and workspace
 */

import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useTheme } from '../providers/ThemeProvider';
import { cn } from '../design-system';

export function MainLayout() {
  const { isDark } = useTheme();

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-200',
      isDark ? 'bg-slate-900' : 'bg-slate-50'
    )}>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Sticky Header */}
        <Header />

        {/* Page Content with Smooth Transitions */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;