/**
 * Threat Radar Chart
 * Radar/spider chart for threat profile visualization
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';
import { Shield } from 'lucide-react';

interface RadarPoint {
  axis: string;
  value: number;
  label?: string;
}

interface ThreatRadarProps {
  data?: RadarPoint[];
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

const defaultData: RadarPoint[] = [
  { axis: 'Execution', value: 85, label: 'T1059' },
  { axis: 'Persistence', value: 72, label: 'T1547' },
  { axis: 'Priv Esc', value: 68, label: 'T1068' },
  { axis: 'Defense Evasion', value: 55, label: 'T1070' },
  { axis: 'Credential Access', value: 78, label: 'T1003' },
  { axis: 'Discovery', value: 45, label: 'T1087' },
  { axis: 'Lateral Movement', value: 32, label: 'T1021' },
  { axis: 'Collection', value: 60, label: 'T1560' },
];

export function ThreatRadar({
  data = defaultData,
  title = 'Threat Profile',
  size = 'md',
}: ThreatRadarProps) {
  const { isDark } = useDark();

  const sizeConfig = {
    sm: { size: 160, labelSize: 8, valueSize: 10 },
    md: { size: 220, labelSize: 10, valueSize: 12 },
    lg: { size: 300, labelSize: 12, valueSize: 14 },
  };

  const { size: chartSize, labelSize, valueSize } = sizeConfig[size];
  const center = chartSize / 2;
  const maxRadius = chartSize / 2 - 30;

  const points = useMemo(() => {
    const angleStep = (2 * Math.PI) / data.length;
    return data.map((point, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const radius = (point.value / 100) * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        ...point,
      };
    });
  }, [data, center, maxRadius]);

  const gridLevels = [20, 40, 60, 80, 100];

  const getValueColor = (value: number) => {
    if (value >= 80) return '#ef4444';
    if (value >= 60) return '#f97316';
    if (value >= 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className={cn(
      'rounded-2xl border p-5',
      isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Shield className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
        <h3 className={cn(
          'text-base font-semibold',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          {title}
        </h3>
      </div>

      {/* Chart */}
      <div className="relative flex justify-center">
        <svg width={chartSize} height={chartSize} className="overflow-visible">
          {/* Grid Circles */}
          {gridLevels.map((level) => (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={(level / 100) * maxRadius}
              fill="none"
              stroke={isDark ? '#334155' : '#e2e8f0'}
              strokeWidth={1}
              strokeDasharray={level === 100 ? 'none' : '4,4'}
              opacity={0.5}
            />
          ))}

          {/* Axis Lines */}
          {points.map((point, index) => (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke={isDark ? '#475569' : '#cbd5e1'}
              strokeWidth={1}
              opacity={0.5}
            />
          ))}

          {/* Filled Polygon */}
          <motion.polygon
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="url(#radarGradient)"
            opacity={0.3}
            className="transition-all duration-300 hover:opacity-50"
          />

          {/* Data Points */}
          {points.map((point, index) => (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={6}
              fill={getValueColor(point.value)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="cursor-pointer hover:r-8 transition-all"
            />
          ))}

          {/* Axis Labels */}
          {points.map((point, index) => {
            const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
            const labelRadius = maxRadius + 20;
            const labelX = center + labelRadius * Math.cos(angle);
            const labelY = center + labelRadius * Math.sin(angle);

            return (
              <g key={index}>
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontSize={labelSize}
                >
                  {point.axis}
                </text>
              </g>
            );
          })}

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Legend */}
      <div className={cn(
        'flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t',
        isDark ? 'border-slate-700/50' : 'border-slate-200'
      )}>
        {[
          { range: '80-100', label: 'Critical', color: '#ef4444' },
          { range: '60-79', label: 'High', color: '#f97316' },
          { range: '40-59', label: 'Medium', color: '#eab308' },
          { range: '0-39', label: 'Low', color: '#22c55e' },
        ].map((item) => (
          <div key={item.range} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className={cn(
              'text-xs',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}>
              {item.label} ({item.range})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useDark() {
  const isDark = true;
  return { isDark };
}

export default ThreatRadar;