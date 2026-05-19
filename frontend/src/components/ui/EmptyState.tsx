/**
 * Premium Empty State
 * Elegant empty state components with animations
 */

import { motion } from 'framer-motion';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';
import {
  Search,
  Folder,
  FileText,
  AlertTriangle,
  Inbox,
  Database,
  Shield,
  Activity,
  Users,
  Settings,
  BarChart3,
  Bell,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'folder' | 'file' | 'alert' | 'inbox' | 'database' | 'shield' | 'activity' | 'users' | 'settings' | 'chart' | 'bell';
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap = {
  search: Search,
  folder: Folder,
  file: FileText,
  alert: AlertTriangle,
  inbox: Inbox,
  database: Database,
  shield: Shield,
  activity: Activity,
  users: Users,
  settings: Settings,
  chart: BarChart3,
  bell: Bell,
};

const sizeConfig = {
  sm: { icon: 32, padding: 'p-6' },
  md: { icon: 48, padding: 'p-8' },
  lg: { icon: 64, padding: 'p-12' },
};

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const { isDark } = useTheme();
  const Icon = iconMap[icon];
  const { icon: iconSize, padding } = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        padding
      )}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'mb-4 rounded-2xl flex items-center justify-center',
          isDark
            ? 'bg-slate-800/50'
            : 'bg-slate-100'
        )}
        style={{ width: iconSize * 1.5, height: iconSize * 1.5 }}
      >
        <Icon
          className={cn(
            'transition-colors',
            isDark ? 'text-slate-600' : 'text-slate-400'
          )}
          style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          'font-semibold mb-2',
          isDark ? 'text-slate-300' : 'text-slate-600'
        )}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-sm max-w-sm mb-4',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}
        >
          {description}
        </motion.p>
      )}

      {/* Action */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

export function EmptyStateWithIllustration({
  variant = 'default',
}: {
  variant?: 'default' | 'no-data' | 'no-results' | 'no-access' | 'offline';
}) {
  const { isDark } = useTheme();

  const variants = {
    default: {
      icon: 'inbox',
      title: 'No data available',
      description: 'Data will appear here once it\'s available.',
    },
    'no-data': {
      icon: 'folder',
      title: 'No items found',
      description: 'There are no items to display at this time.',
    },
    'no-results': {
      icon: 'search',
      title: 'No results found',
      description: 'Try adjusting your search or filters to find what you\'re looking for.',
    },
    'no-access': {
      icon: 'shield',
      title: 'Access restricted',
      description: 'You don\'t have permission to view this content.',
    },
    offline: {
      icon: 'activity',
      title: 'Connection lost',
      description: 'Unable to connect to the server. Please check your connection.',
    },
  };

  const config = variants[variant];

  return (
    <div className={cn(
      'flex items-center justify-center min-h-[300px]',
      isDark ? 'bg-slate-800/30' : 'bg-slate-50'
    )}>
      <EmptyState
        icon={config.icon as EmptyStateProps['icon']}
        title={config.title}
        description={config.description}
        size="md"
      />
    </div>
  );
}

export default EmptyState;