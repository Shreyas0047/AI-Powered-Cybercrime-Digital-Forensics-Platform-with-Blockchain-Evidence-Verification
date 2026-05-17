/**
 * Enterprise Sidebar Navigation
 * Modern SOC-style sidebar with improved UX and organization
 */

import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Folder,
  Bell,
  Activity,
  Brain,
  Settings,
  Users,
  Shield,
  History,
  Layers,
  Terminal,
  Heart,
  Link,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../design-system';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
  badge?: string | number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'sandbox_operator', 'auditor'],
  },
  {
    icon: Search,
    label: 'Investigations',
    path: '/investigations',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'auditor'],
  },
  {
    icon: Folder,
    label: 'Evidence',
    path: '/evidence',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'sandbox_operator', 'auditor'],
  },
  {
    icon: Bell,
    label: 'Alerts',
    path: '/alerts',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer'],
  },
  {
    icon: Terminal,
    label: 'Sandbox',
    path: '/sandbox',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'sandbox_operator'],
  },
  {
    icon: Brain,
    label: 'AI Analysis',
    path: '/ai-analysis',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer'],
  },
  {
    icon: Activity,
    label: 'Telemetry',
    path: '/telemetry',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'sandbox_operator'],
  },
  {
    icon: Layers,
    label: 'Reports',
    path: '/reports',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer', 'auditor'],
  },
  {
    icon: Heart,
    label: 'System Health',
    path: '/health',
    roles: ['super_admin', 'admin'],
  },
  {
    icon: Link,
    label: 'Blockchain Ops',
    path: '/blockchain-operations',
    roles: ['super_admin', 'admin', 'forensic_analyst'],
  },
  {
    icon: AlertTriangle,
    label: 'Threat Intel',
    path: '/threat-intelligence',
    roles: ['super_admin', 'admin', 'forensic_analyst', 'security_reviewer'],
  },
  {
    icon: BarChart3,
    label: 'Forensic Analytics',
    path: '/forensic-analytics',
    roles: ['super_admin', 'admin', 'forensic_analyst'],
  },
  {
    icon: Users,
    label: 'Users',
    path: '/users',
    roles: ['super_admin', 'admin'],
  },
  {
    icon: Settings,
    label: 'Settings',
    path: '/settings',
    roles: ['super_admin', 'admin'],
  },
  {
    icon: History,
    label: 'Audit Log',
    path: '/audit',
    roles: ['super_admin', 'admin', 'auditor'],
  },
];

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user } = useAuthStore();
  const userRole = user?.role || 'auditor';
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed left-0 top-0 h-screen',
        'bg-white dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-700/50',
        'flex flex-col z-50',
        'transition-colors duration-200'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-700/50">
        <motion.div
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center flex-shrink-0"
          whileHover={{ scale: 1.05 }}
        >
          <Shield className="w-5 h-5 text-white" />
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="ml-3 overflow-hidden"
            >
              <h1 className="text-base font-bold bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent whitespace-nowrap">
                ForensicsAI
              </h1>
              <p className="text-[10px] text-slate-400 whitespace-nowrap">Cyber Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-150',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-50 to-violet-50 dark:from-cyan-900/20 dark:to-violet-900/20 text-cyan-700 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      )}
                    />
                  </motion.div>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 truncate whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  {isActive && isCollapsed && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 absolute left-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Collapse Toggle & Version */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700/50">
        {isCollapsed ? (
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">Version 2.0.0</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Enterprise Edition</p>
            </div>
            <button
              onClick={handleToggle}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Collapse</span>
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;