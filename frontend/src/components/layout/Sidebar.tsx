/**
 * Enterprise Sidebar Navigation
 * Refined SOC-style sidebar with premium UX and organization
 */

import { NavLink, useLocation } from 'react-router-dom';
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
  Link2,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../design-system';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../providers/ThemeProvider';

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
  description?: string;
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Operations overview',
  },
  {
    icon: Search,
    label: 'Investigations',
    path: '/investigations',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Case management',
  },
  {
    icon: Folder,
    label: 'Evidence',
    path: '/evidence',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Evidence repository',
  },
  {
    icon: Bell,
    label: 'Alerts',
    path: '/alerts',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Active alerts',
  },
  {
    icon: Terminal,
    label: 'Sandbox',
    path: '/sandbox',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'VM execution',
  },
  {
    icon: Brain,
    label: 'AI Analysis',
    path: '/ai-analysis',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Threat classification',
  },
  {
    icon: Activity,
    label: 'Telemetry',
    path: '/telemetry',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Live events',
  },
  {
    icon: Layers,
    label: 'Reports',
    path: '/reports',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'Forensic reports',
  },
  {
    icon: Heart,
    label: 'System Health',
    path: '/health',
    roles: ['admin', 'super_admin'],
    description: 'Platform status',
  },
  {
    icon: Link2,
    label: 'Blockchain Ops',
    path: '/blockchain-operations',
    roles: ['admin', 'super_admin'],
    description: 'Chain verification',
  },
  {
    icon: AlertTriangle,
    label: 'Threat Intel',
    path: '/threat-intelligence',
    roles: ['admin', 'super_admin', 'analyst', 'forensic_analyst'],
    description: 'IOC management',
  },
  {
    icon: BarChart3,
    label: 'Forensic Analytics',
    path: '/forensic-analytics',
    roles: ['admin', 'super_admin'],
    description: 'Behavioral analysis',
  },
  {
    icon: Users,
    label: 'User Management',
    path: '/users',
    roles: ['admin', 'super_admin'],
    description: 'User management',
    adminOnly: true,
  },
  {
    icon: Settings,
    label: 'Settings',
    path: '/settings',
    roles: ['admin', 'super_admin'],
    description: 'Configuration',
    adminOnly: true,
  },
  {
    icon: History,
    label: 'Audit Log',
    path: '/audit',
    roles: ['admin', 'super_admin'],
    description: 'Activity audit',
    adminOnly: true,
  },
];

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  })
};

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const location = useLocation();
  const userRole = user?.role || 'auditor';
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 72 : 260,
        boxShadow: isCollapsed
          ? '0 0 0 1px rgba(0,0,0,0.05)'
          : '0 0 0 1px rgba(0,0,0,0.05)'
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed left-0 top-0 h-screen z-50',
        'flex flex-col',
        isDark
          ? 'bg-[#0f172a] border-r border-slate-800/50'
          : 'bg-white border-r border-slate-200'
      )}
    >
      {/* Logo Area */}
      <div className={cn(
        'h-16 flex items-center',
        isCollapsed ? 'justify-center px-0' : 'px-4 gap-3',
        'border-b',
        isDark ? 'border-slate-800/50' : 'border-slate-100'
      )}>
        <motion.div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br from-blue-500 to-violet-600'
          )}
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Shield className="w-5 h-5 text-white" />
        </motion.div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <h1 className={cn(
                'text-lg font-bold whitespace-nowrap',
                isDark ? 'text-slate-100' : 'text-slate-900'
              )}>
                <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
                  ForensicsAI
                </span>
              </h1>
              <p className={cn(
                'text-[10px] tracking-wider whitespace-nowrap',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                CYBERSECURITY PLATFORM
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {filteredItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  isActive
                    ? isDark
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-blue-50 text-blue-700'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {({ isActive }) => (
                <>
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full',
                        'bg-gradient-to-b from-blue-500 to-violet-500'
                      )}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10"
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-colors duration-200',
                        isActive
                          ? 'text-blue-500'
                          : isDark
                            ? 'text-slate-500 group-hover:text-slate-300'
                            : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                  </motion.div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 min-w-0"
                      >
                        <span className={cn(
                          'block text-sm font-medium truncate whitespace-nowrap',
                          isActive
                            ? isDark ? 'text-blue-400' : 'text-blue-700'
                            : ''
                        )}>
                          {item.label}
                        </span>
                        <span className={cn(
                          'block text-[10px] truncate whitespace-nowrap',
                          isDark ? 'text-slate-600' : 'text-slate-400'
                        )}>
                          {item.description}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Badge */}
                  {item.badge && !isCollapsed && (
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      isDark
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-rose-100 text-rose-700'
                    )}>
                      {item.badge}
                    </span>
                  )}

                  {/* Active Dot (collapsed state) */}
                  {isActive && isCollapsed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'absolute left-1/2 bottom-0 w-1 h-1 rounded-full bg-blue-500',
                        '-translate-x-1/2 translate-y-1'
                      )}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn(
        'p-3 border-t',
        isDark ? 'border-slate-800/50' : 'border-slate-100'
      )}>
        {isCollapsed ? (
          <button
            onClick={handleToggle}
            className={cn(
              'w-full flex items-center justify-center p-2 rounded-lg',
              'transition-all duration-200',
              isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="space-y-3">
            {/* System Status */}
            <div className={cn(
              'px-3 py-3 rounded-lg',
              isDark ? 'bg-slate-800/50' : 'bg-slate-50'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Circle
                  className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse"
                />
                <span className={cn(
                  'text-xs font-medium',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  System Operational
                </span>
              </div>
              <div className={cn(
                'text-[10px]',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                v2.0.0 • Enterprise Edition
              </div>
            </div>

            {/* Collapse Button */}
            <button
              onClick={handleToggle}
              className={cn(
                'w-full flex items-center justify-center gap-2 p-2 rounded-lg',
                'transition-all duration-200',
                isDark
                  ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;