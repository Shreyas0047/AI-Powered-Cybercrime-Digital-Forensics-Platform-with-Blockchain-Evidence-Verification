/**
 * Anomaly Detection Layer
 * Lightweight anomaly detection without heavy ML
 */

import {
  NormalizedEvent,
  ExtractedFeatures,
  Anomaly,
  AnomalyType,
  AnomalyDetectionResult,
  BaselineMetrics
} from './threat_models';

export class AnomalyDetectionLayer {
  detectAnomalies(
    events: NormalizedEvent[],
    features: ExtractedFeatures
  ): AnomalyDetectionResult {
    const anomalies: Anomaly[] = [];

    const baseline = this.calculateBaselineMetrics(events, features);

    anomalies.push(...this.detectBurstAnomalies(events));
    anomalies.push(...this.detectThresholdAnomalies(features));
    anomalies.push(...this.detectProcessDeviation(events, baseline));
    anomalies.push(...this.detectNetworkSpikes(features));
    anomalies.push(...this.detectExecutionFrequencyAnomalies(events, baseline));
    anomalies.push(...this.detectFileOperationAnomalies(features));

    const overallScore = this.calculateAnomalyScore(anomalies, features);

    return {
      anomalies,
      baseline_metrics: baseline,
      overall_anomaly_score: overallScore
    };
  }

  private calculateBaselineMetrics(events: NormalizedEvent[], features: ExtractedFeatures): BaselineMetrics {
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const duration = features.executionDuration || 1;
    const minutes = duration / 60000 || 1;

    const processRates = this.calculateProcessSpawnRates(sortedEvents);
    const avgProcessRate = processRates.length > 0
      ? processRates.reduce((a, b) => a + b, 0) / processRates.length
      : 0;

    const variance = processRates.length > 1
      ? Math.sqrt(processRates.map(r => Math.pow(r - avgProcessRate, 2)).reduce((a, b) => a + b, 0) / processRates.length)
      : 0;

    return {
      avg_process_spawn_rate: avgProcessRate,
      avg_file_ops_per_minute: features.fileModificationCount / minutes,
      avg_network_connections: features.networkConnectionCount / minutes,
      avg_registry_mods: features.registryModificationCount / minutes,
      execution_variance: variance
    };
  }

  private calculateProcessSpawnRates(events: NormalizedEvent[]): number[] {
    const rates: number[] = [];
    const processEvents = events.filter(e => e.normalizedType === 'process_start' as any);

    if (processEvents.length < 2) return rates;

    const timeSlots = 5;
    const slotSize = Math.floor(processEvents.length / timeSlots);

    for (let i = 0; i < timeSlots; i++) {
      const start = i * slotSize;
      const end = start + slotSize;
      const slotEvents = processEvents.slice(start, end);

      if (slotEvents.length > 1) {
        const timeDiff = new Date(slotEvents[end - 1].timestamp).getTime() -
          new Date(slotEvents[start].timestamp).getTime();
        if (timeDiff > 0) {
          rates.push((slotEvents.length / timeDiff) * 1000);
        }
      }
    }

    return rates;
  }

  private detectBurstAnomalies(events: NormalizedEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (sortedEvents.length < 10) return anomalies;

    const windowMs = 5000;
    const threshold = 10;
    let burstCount = 0;

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff = new Date(sortedEvents[i].timestamp).getTime() -
        new Date(sortedEvents[i - 1].timestamp).getTime();

      if (timeDiff < windowMs) {
        burstCount++;
      } else {
        if (burstCount >= threshold) {
          anomalies.push({
            id: `anomaly-burst-${i}`,
            type: AnomalyType.BURST_DETECTION,
            severity: 'high',
            description: `Event burst detected: ${burstCount} events in ${windowMs}ms window`,
            timestamp: new Date(sortedEvents[i - 1].timestamp),
            deviation: burstCount - threshold,
            baseline: threshold,
            actual_value: burstCount,
            category: 'event_frequency',
            evidence: [`${burstCount} events within ${windowMs}ms`]
          });
        }
        burstCount = 0;
      }
    }

    return anomalies;
  }

  private detectThresholdAnomalies(features: ExtractedFeatures): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const thresholds = {
      fileModificationCount: { warn: 30, crit: 50 },
      networkConnectionCount: { warn: 10, crit: 20 },
      spawnedProcesses: { warn: 10, crit: 20 },
      powershellExecutions: { warn: 5, crit: 10 }
    };

    for (const [field, limits] of Object.entries(thresholds)) {
      const value = (features as any)[field] as number;
      if (value >= limits.crit) {
        anomalies.push({
          id: `anomaly-threshold-${field}`,
          type: AnomalyType.THRESHOLD_EXCEEDED,
          severity: 'critical',
          description: `${field} exceeded critical threshold`,
          timestamp: new Date(),
          deviation: value - limits.crit,
          baseline: limits.crit,
          actual_value: value,
          category: 'threshold',
          evidence: [`${field}: ${value} (critical: ${limits.crit})`]
        });
      } else if (value >= limits.warn) {
        anomalies.push({
          id: `anomaly-threshold-${field}`,
          type: AnomalyType.THRESHOLD_EXCEEDED,
          severity: 'medium',
          description: `${field} exceeded warning threshold`,
          timestamp: new Date(),
          deviation: value - limits.warn,
          baseline: limits.warn,
          actual_value: value,
          category: 'threshold',
          evidence: [`${field}: ${value} (warning: ${limits.warn})`]
        });
      }
    }

    return anomalies;
  }

  private detectProcessDeviation(events: NormalizedEvent[], baseline: BaselineMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const processRates = this.calculateProcessSpawnRates(events);
    if (processRates.length === 0) return anomalies;

    const maxRate = Math.max(...processRates);
    const avgRate = baseline.avg_process_spawn_rate;

    if (maxRate > avgRate * 3 && avgRate > 0) {
      anomalies.push({
        id: 'anomaly-process-deviation',
        type: AnomalyType.PROCESS_DEVIATION,
        severity: 'medium',
        description: 'Process spawn rate significantly above baseline',
        timestamp: new Date(),
        deviation: maxRate - avgRate,
        baseline: avgRate,
        actual_value: maxRate,
        category: 'process_behavior',
        evidence: [
          `Max rate: ${maxRate.toFixed(2)}/ms`,
          `Baseline: ${avgRate.toFixed(2)}/ms`,
          `Deviation: ${((maxRate / avgRate - 1) * 100).toFixed(1)}%`
        ]
      });
    }

    return anomalies;
  }

  private detectNetworkSpikes(features: ExtractedFeatures): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (features.outboundConnectionCount > 15) {
      anomalies.push({
        id: 'anomaly-network-spike',
        type: AnomalyType.NETWORK_SPIKE,
        severity: 'high',
        description: 'Excessive outbound network connections detected',
        timestamp: new Date(),
        deviation: features.outboundConnectionCount - 10,
        baseline: 10,
        actual_value: features.outboundConnectionCount,
        category: 'network_activity',
        evidence: [
          `${features.outboundConnectionCount} outbound connections`,
          `${features.uniqueDestinationIPs.length} unique destinations`
        ]
      });
    }

    return anomalies;
  }

  private detectExecutionFrequencyAnomalies(events: NormalizedEvent[], baseline: BaselineMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const suspiciousProcesses = ['powershell', 'cmd', 'rundll32', 'mshta', 'certutil'];
    const suspiciousCount = events.filter(e => {
      const name = (e.metadata.processName || '').toLowerCase();
      return suspiciousProcesses.some(s => name.includes(s));
    }).length;

    if (suspiciousCount > 5) {
      anomalies.push({
        id: 'anomaly-execution-frequency',
        type: AnomalyType.EXECUTION_FREQUENCY,
        severity: 'medium',
        description: 'High frequency of suspicious process executions',
        timestamp: new Date(),
        deviation: suspiciousCount - 5,
        baseline: 5,
        actual_value: suspiciousCount,
        category: 'execution_pattern',
        evidence: [`${suspiciousCount} suspicious process executions`]
      });
    }

    return anomalies;
  }

  private detectFileOperationAnomalies(features: ExtractedFeatures): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (features.fileCreateCount > 40) {
      anomalies.push({
        id: 'anomaly-file-ops',
        type: AnomalyType.FILE_OPERATION_ANOMALY,
        severity: 'high',
        description: 'Abnormally high file creation rate',
        timestamp: new Date(),
        deviation: features.fileCreateCount - 30,
        baseline: 30,
        actual_value: features.fileCreateCount,
        category: 'file_activity',
        evidence: [
          `${features.fileCreateCount} files created`,
          `${features.fileModificationCount} files modified`,
          `${features.fileDeleteCount} files deleted`
        ]
      });
    }

    return anomalies;
  }

  private calculateAnomalyScore(anomalies: Anomaly[], features: ExtractedFeatures): number {
    let score = 0;

    const severityScores: Record<string, number> = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5
    };

    for (const anomaly of anomalies) {
      score += severityScores[anomaly.severity] || 10;
    }

    if (features.suspiciousBehaviorCount > 5) score += 15;

    return Math.min(100, score);
  }
}

export const anomalyDetectionLayer = new AnomalyDetectionLayer();
export default anomalyDetectionLayer;