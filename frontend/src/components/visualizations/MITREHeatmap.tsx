/**
 * MITRE ATT&CK Heatmap Component
 * Enterprise-grade visualization of attack techniques
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface TechniqueData {
  id: string;
  name: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
}

interface TacticData {
  id: string;
  name: string;
  techniques: TechniqueData[];
}

interface MITREHeatmapProps {
  data?: TacticData[];
  title?: string;
}

const severityColors = {
  critical: { bg: 'bg-red-600', text: 'text-red-600', ring: 'ring-red-500/30' },
  high: { bg: 'bg-orange-500', text: 'text-orange-500', ring: 'ring-orange-500/30' },
  medium: { bg: 'bg-amber-500', text: 'text-amber-500', ring: 'ring-amber-500/30' },
  low: { bg: 'bg-emerald-500', text: 'text-emerald-500', ring: 'ring-emerald-500/30' },
};

const mockTactics: TacticData[] = [
  {
    id: 'TA0001',
    name: 'Initial Access',
    techniques: [
      { id: 'T1566', name: 'Phishing', count: 5, severity: 'high' },
      { id: 'T1190', name: 'Exploit Public App', count: 2, severity: 'medium' },
      { id: 'T1133', name: 'External Remote Services', count: 1, severity: 'low' },
    ],
  },
  {
    id: 'TA0002',
    name: 'Execution',
    techniques: [
      { id: 'T1059', name: 'Command & Script', count: 12, severity: 'critical' },
      { id: 'T1204', name: 'User Execution', count: 8, severity: 'high' },
      { id: 'T1203', name: 'Exploitation for Execution', count: 3, severity: 'medium' },
    ],
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    techniques: [
      { id: 'T1547', name: 'Boot or Logon Autostart', count: 7, severity: 'high' },
      { id: 'T1053', name: 'Scheduled Task', count: 4, severity: 'medium' },
      { id: 'T1136', name: 'Create Account', count: 2, severity: 'medium' },
    ],
  },
  {
    id: 'TA0004',
    name: 'Privilege Escalation',
    techniques: [
      { id: 'T1068', name: 'Exploitation for Priv Esc', count: 6, severity: 'critical' },
      { id: 'T1548', name: 'Abuse Elevation Control', count: 3, severity: 'high' },
      { id: 'T1134', name: 'Access Token Manipulation', count: 1, severity: 'medium' },
    ],
  },
  {
    id: 'TA0005',
    name: 'Defense Evasion',
    techniques: [
      { id: 'T1070', name: 'Indicator Removal', count: 9, severity: 'high' },
      { id: 'T1036', name: 'Masquerading', count: 5, severity: 'medium' },
      { id: 'T1027', name: 'Obfuscated Files', count: 4, severity: 'medium' },
    ],
  },
  {
    id: 'TA0006',
    name: 'Credential Access',
    techniques: [
      { id: 'T1003', name: 'OS Credential Dumping', count: 8, severity: 'critical' },
      { id: 'T1555', name: 'Credentials from Stores', count: 4, severity: 'high' },
      { id: 'T1056', name: 'Input Capture', count: 2, severity: 'medium' },
    ],
  },
  {
    id: 'TA0007',
    name: 'Discovery',
    techniques: [
      { id: 'T1087', name: 'Account Discovery', count: 6, severity: 'medium' },
      { id: 'T1083', name: 'File Discovery', count: 5, severity: 'medium' },
      { id: 'T1046', name: 'Network Service Discovery', count: 3, severity: 'low' },
    ],
  },
  {
    id: 'TA0008',
    name: 'Lateral Movement',
    techniques: [
      { id: 'T1021', name: 'Remote Services', count: 4, severity: 'high' },
      { id: 'T1570', name: 'Lateral Tool Transfer', count: 2, severity: 'medium' },
    ],
  },
  {
    id: 'TA0009',
    name: 'Collection',
    techniques: [
      { id: 'T1560', name: 'Archive Collected Data', count: 5, severity: 'medium' },
      { id: 'T1119', name: 'Automated Collection', count: 3, severity: 'low' },
    ],
  },
  {
    id: 'TA0011',
    name: 'Command & Control',
    techniques: [
      { id: 'T1071', name: 'Application Layer Protocol', count: 7, severity: 'high' },
      { id: 'T1132', name: 'Data Encoding', count: 4, severity: 'medium' },
    ],
  },
  {
    id: 'TA0010',
    name: 'Exfiltration',
    techniques: [
      { id: 'T1041', name: 'Exfiltration Over C2', count: 3, severity: 'critical' },
      { id: 'T1567', name: 'Exfiltration Over Web Service', count: 2, severity: 'high' },
    ],
  },
  {
    id: 'TA0040',
    name: 'Impact',
    techniques: [
      { id: 'T1486', name: 'Data Encrypted for Impact', count: 15, severity: 'critical' },
      { id: 'T1489', name: 'Service Stop', count: 4, severity: 'high' },
      { id: 'T1529', name: 'System Shutdown', count: 1, severity: 'medium' },
    ],
  },
];

export function MITREHeatmap({ data, title = 'MITRE ATT&CK Heatmap' }: MITREHeatmapProps) {
  const { isDark } = useTheme();
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);
  const [hoveredTechnique, setHoveredTechnique] = useState<string | null>(null);

  const tactics = data || mockTactics;
  const maxCount = Math.max(...tactics.flatMap((t) => t.techniques.map((tech) => tech.count)));

  const getIntensity = (count: number) => {
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'opacity-100';
    if (ratio >= 0.6) return 'opacity-80';
    if (ratio >= 0.4) return 'opacity-60';
    if (ratio >= 0.2) return 'opacity-40';
    return 'opacity-20';
  };

  const getSeverityColor = (severity: keyof typeof severityColors) => {
    return severityColors[severity];
  };

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
          <Shield className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
          <h3 className={cn(
            'text-base font-semibold',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}>
              Intensity:
            </span>
            <div className="flex gap-0.5">
              {[1, 0.6, 0.3].map((opacity, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-4 h-4 rounded',
                    `bg-red-500/${opacity * 100}`
                  )}
                />
              ))}
            </div>
          </div>

          {/* Severity Legend */}
          <div className="flex items-center gap-3">
            {Object.entries(severityColors).map(([severity, colors]) => (
              <div key={severity} className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', colors.bg)} />
                <span className={cn(
                  'text-xs capitalize',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  {severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tactics.map((tactic) => {
            const isExpanded = expandedTactic === tactic.id;
            const totalTechniques = tactic.techniques.reduce((sum, t) => sum + t.count, 0);

            return (
              <motion.div
                key={tactic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-xl border overflow-hidden',
                  isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                )}
              >
                {/* Tactic Header */}
                <div
                  onClick={() => setExpandedTactic(isExpanded ? null : tactic.id)}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 cursor-pointer',
                    'transition-colors',
                    isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs font-mono font-bold',
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    )}>
                      {tactic.id}
                    </span>
                    <span className={cn(
                      'text-sm font-semibold',
                      isDark ? 'text-slate-200' : 'text-slate-700'
                    )}>
                      {tactic.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                    )}>
                      {tactic.techniques.length} techniques
                    </span>
                    {isExpanded ? (
                      <ChevronDown className={cn(
                        'w-4 h-4',
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      )} />
                    ) : (
                      <ChevronRight className={cn(
                        'w-4 h-4',
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      )} />
                    )}
                  </div>
                </div>

                {/* Techniques Preview (always visible) */}
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tactic.techniques.map((tech) => {
                      const colors = getSeverityColor(tech.severity);
                      return (
                        <div
                          key={tech.id}
                          onMouseEnter={() => setHoveredTechnique(tech.id)}
                          onMouseLeave={() => setHoveredTechnique(null)}
                          className={cn(
                            'relative px-2 py-1 rounded text-xs font-mono cursor-help',
                            'transition-all duration-150',
                            colors.bg,
                            'text-white',
                            getIntensity(tech.count)
                          )}
                        >
                          {tech.id}
                          {hoveredTechnique === tech.id && (
                            <div className={cn(
                              'absolute z-10 left-0 top-full mt-2 p-3 rounded-lg shadow-xl w-48',
                              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
                            )}>
                              <p className={cn(
                                'text-sm font-semibold',
                                isDark ? 'text-slate-200' : 'text-slate-700'
                              )}>
                                {tech.name}
                              </p>
                              <p className={cn(
                                'text-xs mt-1',
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              )}>
                                Count: {tech.count}
                              </p>
                              <span className={cn(
                                'inline-block mt-2 text-xs font-medium capitalize',
                                colors.text
                              )}>
                                {tech.severity} severity
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className={cn(
                      'border-t px-4 py-3 space-y-2',
                      isDark ? 'border-slate-700/50' : 'border-slate-200'
                    )}
                  >
                    {tactic.techniques.map((tech) => {
                      const colors = getSeverityColor(tech.severity);
                      return (
                        <div
                          key={tech.id}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg',
                            isDark ? 'bg-slate-700/30' : 'bg-slate-100'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'text-xs font-mono font-bold px-1.5 py-0.5 rounded',
                              isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                            )}>
                              {tech.id}
                            </span>
                            <span className={cn(
                              'text-sm',
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            )}>
                              {tech.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-20 h-2 rounded-full overflow-hidden',
                              isDark ? 'bg-slate-700' : 'bg-slate-200'
                            )}>
                              <div
                                className={cn('h-full rounded-full', colors.bg)}
                                style={{ width: `${(tech.count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className={cn(
                              'text-xs font-medium w-6 text-right',
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            )}>
                              {tech.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MITREHeatmap;