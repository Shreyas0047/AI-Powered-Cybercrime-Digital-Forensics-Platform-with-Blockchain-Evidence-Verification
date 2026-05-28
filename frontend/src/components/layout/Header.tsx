/**
 * Enterprise Header
 * Professional SOC-style header with breadcrumbs and global actions
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Command,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';
import ConnectionStatus from './ConnectionStatus';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ElementType;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  currentPage?: string;
}

export function Header({ breadcrumbs = [], currentPage = '' }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notifications = [
    { id: 1, type: 'critical', message: 'Critical severity alert detected', time: '2 min ago' },
    { id: 2, type: 'success', message: 'Analysis completed for INV-2024-5A3B', time: '15 min ago' },
    { id: 3, type: 'info', message: 'New evidence uploaded to INV-2024-5A2C', time: '1 hour ago' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Command Palette / Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                'w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden',
                isDark
                  ? 'bg-slate-900 border-slate-700'
                  : 'bg-white border-slate-200'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search investigations, evidence, alerts, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'flex-1 bg-transparent text-sm outline-none',
                    isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                  )}
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className={cn(
                    'p-1 rounded-lg',
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  )}
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className={cn('p-2', isDark ? 'bg-slate-800/50' : 'bg-slate-50')}>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Command className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">Quick actions</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[
                  { title: 'New Investigation', description: 'Create a new case', icon: Search, action: () => { setShowSearch(false); navigate('/investigations?new=true'); }},
                  { title: 'Upload Evidence', description: 'Add files to repository', icon: Bell, action: () => { setShowSearch(false); navigate('/evidence?upload=true'); }},
                  { title: 'View Alerts', description: 'Check active alerts', icon: AlertTriangle, action: () => { setShowSearch(false); navigate('/alerts'); }},
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left',
                      'hover:bg-slate-50 dark:hover:bg-slate-800',
                      'transition-colors duration-150'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      isDark ? 'bg-slate-800' : 'bg-slate-100'
                    )}>
                      <item.icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-700')}>
                        {item.title}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={cn(
        'h-16 flex items-center justify-between px-6 sticky top-0 z-40 border-b',
        isDark
          ? 'bg-[#0f172a]/90 backdrop-blur-xl border-slate-800/50'
          : 'bg-white/90 backdrop-blur-xl border-slate-200/60'
      )}>
        {/* Left side - Breadcrumbs */}
        <div className="flex items-center gap-2">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {item.path ? (
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-medium',
                      'transition-colors duration-150',
                      isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn(
                    'flex items-center gap-1.5 px-2 py-1',
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  )}>
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>

          {/* Page Title Divider */}
          {currentPage && (
            <span className="text-slate-300 dark:text-slate-700">|</span>
          )}

          {/* Current Page */}
          {currentPage && (
            <h1 className={cn(
              'text-lg font-semibold',
              isDark ? 'text-slate-100' : 'text-slate-800'
            )}>
              {currentPage}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSearch(true)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
              'transition-all duration-200',
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search...</span>
            <kbd className={cn(
              'hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
              isDark ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-400 border'
            )}>
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </motion.button>

          {/* Connection Status */}
          <ConnectionStatus />

          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                'relative p-2 rounded-xl transition-colors',
                isDark
                  ? 'hover:bg-slate-800 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl overflow-hidden',
                    isDark
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-white border-slate-200'
                  )}
                >
                  <div className={cn(
                    'px-4 py-3 border-b',
                    isDark ? 'border-slate-700' : 'border-slate-100'
                  )}>
                    <h3 className={cn('font-semibold', isDark ? 'text-slate-100' : 'text-slate-800')}>
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'px-4 py-3 cursor-pointer border-b',
                          isDark
                            ? 'hover:bg-slate-800/50 border-slate-800'
                            : 'hover:bg-slate-50 border-slate-50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1">
                            <p className={cn('text-sm', isDark ? 'text-slate-200' : 'text-slate-700')}>
                              {notification.message}
                            </p>
                            <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={cn(
                    'px-4 py-3 border-t',
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'
                  )}>
                    <button className={cn(
                      'text-sm font-medium',
                      isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                    )}>
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-xl',
                'transition-colors',
                isDark
                  ? 'hover:bg-slate-800'
                  : 'hover:bg-slate-100'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br from-amber-400 to-amber-600'
              )}>
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-slate-200' : 'text-slate-700'
                )}>
                  {user?.name || 'User'}
                </p>
                <p className={cn(
                  'text-xs capitalize',
                  isDark ? 'text-slate-500' : 'text-slate-400'
                )}>
                  {user?.role?.replace('_', ' ') || 'Analyst'}
                </p>
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                isDark ? 'text-slate-500' : 'text-slate-400',
                showUserMenu && 'rotate-180'
              )} />
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute right-0 mt-2 w-48 rounded-xl border shadow-xl overflow-hidden',
                    isDark
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-white border-slate-200'
                  )}
                >
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm',
                        'transition-colors',
                        isDark
                          ? 'text-slate-200 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm',
                        'transition-colors',
                        isDark
                          ? 'text-slate-200 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className={cn('my-1 border-t', isDark ? 'border-slate-700' : 'border-slate-100')} />
                    <button
                      onClick={handleLogout}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm',
                        'transition-colors',
                        isDark
                          ? 'text-red-400 hover:bg-red-900/20'
                          : 'text-red-600 hover:bg-red-50'
                      )}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
