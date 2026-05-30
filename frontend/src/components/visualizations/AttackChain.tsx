/**
 * Attack Chain Visualization
 * Enterprise-grade attack progression visualization
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  ChevronDown,
  ChevronRight,
  Shield,
  Activity,
  Skull,
  FileText,
  Network,
  Terminal,
  Fingerprint,
  HardDrive,
  Lock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface ChainStage {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'completed' | 'in-progress' | 'detected' | 'blocked' | 'pending';
  timestamp?: string;
  events: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
}

interface AttackChainProps {
  stages?: ChainStage[];
  title?: string;
}

const statusConfig = {
  completed: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  'in-progress': {
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500 animate-pulse',
  },
  detected: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  blocked: {
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
  pending: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

const iconMap: Record<string, typeof Shield> = {
  Shield,
  Terminal,
  Fingerprint,
  ArrowRight,
  Lock,
  Search,
  Network,
  HardDrive,
  FileText,
  Activity,
  Skull,
};

export function AttackChain({ stages = [], title = 'Attack Chain' }: AttackChainProps) {
  const { isDark } = useTheme();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const completedStages = stages.filter((s) => s.status === 'completed' || s.status === 'detected' || s.status === 'blocked').length;
  const progressPercent = (completedStages / stages.length) * 100;

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-4 border-b',
        isDark ? 'border-slate-700/50' : 'border-slate-200'
      )}>
        <div className="flex items-center gap-3">
          <Target className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
          <h3 className={cn(
            'text-base font-semibold',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            {title}
          </h3>
          <span className={cn(
            'px-2 py-0.5 text-xs rounded-full',
            isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
          )}>
            {stages.length} stages
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-sm',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            {completedStages}/{stages.length} completed
          </span>
          <div className={cn(
            'w-32 h-2 rounded-full overflow-hidden',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Chain Visualization */}
      <div className="p-5">
        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="w-12 h-12 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-500">No attack chain data available</p>
            <p className="text-xs text-slate-400 mt-1">Data will appear after sandbox session analysis</p>
          </div>
        ) : (
        <div className="relative">
          {/* Vertical Line */}
          <div className={cn(
            'absolute left-6 top-8 bottom-8 w-0.5',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )} />

          {/* Stages */}
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const config = statusConfig[stage.status];
              const Icon = iconMap[(stage.icon as { name?: string })?.name || ''] || Activity;
              const isExpanded = expandedStage === stage.id;
              const isPending = stage.status === 'pending';

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-16"
                >
                  {/* Stage Node */}
                  <div
                    onClick={() => !isPending && setExpandedStage(isExpanded ? null : stage.id)}
                    className={cn(
                      'group relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer',
                      'transition-all duration-200',
                      isPending
                        ? isDark
                          ? 'bg-slate-800/30 border-slate-700/50 opacity-50'
                          : 'bg-slate-50 border-slate-100 opacity-60'
                        : `${config.bg} ${config.border} hover:shadow-lg`
                    )}
                  >
                    {/* Connection Dot */}
                    <div className={cn(
                      'absolute left-[-2rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10',
                      isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                    )}>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        isPending ? 'bg-slate-400' : config.dot
                      )} />
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                      isPending
                        ? isDark ? 'bg-slate-700' : 'bg-slate-200'
                        : config.bg
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        isPending
                          ? isDark ? 'text-slate-500' : 'text-slate-400'
                          : config.color
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-mono',
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        )}>
                          Stage {index + 1}
                        </span>
                        <h4 className={cn(
                          'text-sm font-semibold',
                          isDark ? 'text-slate-200' : 'text-slate-700'
                        )}>
                          {stage.name}
                        </h4>
                        {!isPending && (
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                            config.bg,
                            config.color
                          )}>
                            {stage.status.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                      {!isPending && stage.description && (
                        <p className={cn(
                          'text-xs mt-1',
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          {stage.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      {stage.events > 0 && (
                        <div className={cn(
                          'text-center',
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          <p className="text-lg font-bold">{stage.events}</p>
                          <p className="text-xs">events</p>
                        </div>
                      )}
                      {!isPending && (
                        isExpanded ? (
                          <ChevronDown className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
                        ) : (
                          <ChevronRight className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
                        )
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && stage.timestamp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={cn(
                          'mt-2 ml-4 p-4 rounded-xl',
                          isDark ? 'bg-slate-800/50' : 'bg-slate-50'
                        )}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                              Timestamp
                            </p>
                            <p className={cn(
                              'text-sm font-mono',
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            )}>
                              {stage.timestamp}
                            </p>
                          </div>
                          <div>
                            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                              Events Detected
                            </p>
                            <p className={cn(
                              'text-sm font-bold',
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            )}>
                              {stage.events}
                            </p>
                          </div>
                          {stage.severity && (
                            <div className="col-span-2">
                              <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                Risk Assessment
                              </p>
                              <span className={cn(
                                'inline-block mt-1 px-2 py-1 text-xs font-medium rounded capitalize',
                                stage.severity === 'critical' && 'bg-red-500/20 text-red-500',
                                stage.severity === 'high' && 'bg-orange-500/20 text-orange-500',
                                stage.severity === 'medium' && 'bg-amber-500/20 text-amber-500',
                                stage.severity === 'low' && 'bg-emerald-500/20 text-emerald-500'
                              )}>
                                {stage.severity}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default AttackChain;
