/**
 * Chain of Custody Service
 * Immutable evidence tracking and custody chain management
 */

import { ChainOfCustody, EvidenceLineage, VerificationHistory, TamperInvestigation, VerificationReport, IntegrityStatus, CustodyEventType } from '../models/custody.model';
import { Evidence } from '../models';
import { evidenceHashingService } from '../blockchain';
import { BlockchainVerification } from '../blockchain/models/blockchain.model';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface CustodyEventInput {
  evidenceId: string;
  eventType: CustodyEventType;
  performedBy: string;
  performedByName: string;
  details: string;
  investigationId?: string;
  transactionHash?: string;
  blockNumber?: number;
  integrityStatus?: IntegrityStatus;
  metadata?: Record<string, any>;
}

export interface ChainVisualization {
  evidenceId: string;
  chainId: string;
  events: Array<{
    timestamp: Date;
    eventType: string;
    details: string;
    performedBy: string;
    integrityStatus?: string;
  }>;
  integrityStatus: string;
  blockchainVerified: boolean;
}

export class ChainOfCustodyService {
  /**
   * Initialize chain of custody for new evidence
   */
  async initializeChain(evidenceId: string, userId: string, userName: string): Promise<any> {
    const chainId = `COC-${uuidv4().substring(0, 8).toUpperCase()}`;
    const genesisHash = this.generateHash(`${evidenceId}:${chainId}:genesis:${Date.now()}`);

    const chain = await ChainOfCustody.create({
      evidenceId,
      chainId,
      currentHolder: userId,
      currentHolderName: userName,
      custodyStatus: 'active',
      integrityStatus: IntegrityStatus.PENDING_VERIFICATION,
      events: [],
      chainHash: genesisHash,
      genesisHash,
    });

    // Add genesis event
    await this.addEvent({
      evidenceId,
      eventType: CustodyEventType.EVIDENCE_CREATED,
      performedBy: userId,
      performedByName: userName,
      details: 'Evidence chain of custody initialized',
    });

    // Create lineage record
    await EvidenceLineage.create({
      evidenceId,
      lineageType: 'original',
    });

    return chain;
  }

  /**
   * Add custody event
   */
  async addEvent(input: CustodyEventInput): Promise<any> {
    const { evidenceId, eventType, performedBy, performedByName, details, investigationId, transactionHash, blockNumber, integrityStatus, metadata } = input;

    // Get existing chain
    let chain = await ChainOfCustody.findOne({ evidenceId });

    if (!chain) {
      // Initialize if not exists
      chain = await this.initializeChain(evidenceId, performedBy, performedByName);
    }

    // Get previous event hash
    const previousHash = chain.chainHash;

    // Create event
    const eventHash = this.generateHash(
      `${evidenceId}:${eventType}:${performedBy}:${Date.now()}:${previousHash}`
    );

    const event = {
      eventId: uuidv4(),
      evidenceId,
      eventType,
      timestamp: new Date(),
      performedBy,
      performedByName,
      details,
      investigationId,
      transactionHash,
      blockNumber,
      integrityStatus,
      previousEventHash: previousHash,
      currentEventHash: eventHash,
      metadata,
    };

    // Update chain
    chain.events.push(event);
    chain.eventCount = chain.events.length;
    chain.lastEventAt = new Date();
    chain.chainHash = eventHash;

    // Update custody holder if transferred
    if (eventType === CustodyEventType.CUSTODY_TRANSFERRED) {
      chain.currentHolder = performedBy as any;
      chain.currentHolderName = performedByName;
    }

    // Update integrity status if provided
    if (integrityStatus) {
      chain.integrityStatus = integrityStatus;
      chain.lastIntegrityCheck = new Date();
    }

    // Update blockchain info if synced
    if (transactionHash && blockNumber) {
      chain.blockchainVerified = true;
      chain.blockchainTxHash = transactionHash;
      chain.blockchainBlockNumber = blockNumber;
    }

    await chain.save();

    // Add verification to history
    if (eventType === CustodyEventType.VERIFICATION_COMPLETED || eventType === CustodyEventType.VERIFICATION_FAILED) {
      await this.recordVerification({
        evidenceId,
        verificationType: 'integrity',
        status: eventType === CustodyEventType.VERIFICATION_COMPLETED ? 'success' : 'failed',
        performedBy,
        performedByName,
        details,
      });
    }

    return chain;
  }

  /**
   * Record verification event
   */
  async recordVerification(input: {
    evidenceId: string;
    verificationType: string;
    status: string;
    performedBy?: string;
    performedByName?: string;
    expectedHash?: string;
    actualHash?: string;
    transactionHash?: string;
    blockNumber?: number;
    verificationTime?: number;
    details?: string;
  }): Promise<any> {
    const verification = await VerificationHistory.create({
      verificationId: uuidv4(),
      evidenceId: input.evidenceId,
      verificationType: input.verificationType,
      timestamp: new Date(),
      performedBy: input.performedBy,
      performedByName: input.performedByName,
      status: input.status,
      expectedHash: input.expectedHash,
      actualHash: input.actualHash,
      hashMatch: input.expectedHash && input.actualHash
        ? input.expectedHash === input.actualHash
        : undefined,
      transactionHash: input.transactionHash,
      blockNumber: input.blockNumber,
      verificationTime: input.verificationTime,
      details: input.details,
    });

    return verification;
  }

  /**
   * Get chain of custody visualization
   */
  async getChainVisualization(evidenceId: string): Promise<ChainVisualization | null> {
    const chain = await ChainOfCustody.findOne({ evidenceId });

    if (!chain) return null;

    return {
      evidenceId: String(chain.evidenceId),
      chainId: chain.chainId,
      events: chain.events.map(e => ({
        timestamp: e.timestamp,
        eventType: e.eventType,
        details: e.details,
        performedBy: e.performedByName,
        integrityStatus: e.integrityStatus,
      })),
      integrityStatus: chain.integrityStatus,
      blockchainVerified: chain.blockchainVerified,
    };
  }

  /**
   * Get full custody timeline
   */
  async getCustodyTimeline(evidenceId: string): Promise<any> {
    const chain = await ChainOfCustody.findOne({ evidenceId })
      .populate('currentHolder', 'username email')
      .populate('events.performedBy', 'username email');

    return chain;
  }

  /**
   * Link evidence to investigation
   */
  async linkToInvestigation(evidenceId: string, investigationId: string, userId: string, userName: string): Promise<void> {
    await this.addEvent({
      evidenceId,
      eventType: CustodyEventType.INVESTIGATION_LINKED,
      performedBy: userId,
      performedByName: userName,
      details: `Evidence linked to investigation ${investigationId}`,
      investigationId,
      integrityStatus: IntegrityStatus.SYNCING,
    });
  }

  /**
   * Transfer custody
   */
  async transferCustody(evidenceId: string, newHolderId: string, newHolderName: string, transferrerId: string, transferrerName: string): Promise<void> {
    await this.addEvent({
      evidenceId,
      eventType: CustodyEventType.CUSTODY_TRANSFERRED,
      performedBy: transferrerId,
      performedByName: transferrerName,
      details: `Custody transferred to ${newHolderName}`,
      integrityStatus: IntegrityStatus.PENDING_VERIFICATION,
    });

    const chain = await ChainOfCustody.findOne({ evidenceId });
    if (chain) {
      chain.currentHolder = newHolderId as any;
      chain.currentHolderName = newHolderName;
      await chain.save();
    }
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(evidenceId: string, limit: number = 100): Promise<any[]> {
    return await VerificationHistory.find({ evidenceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Create tamper investigation
   */
  async createTamperInvestigation(evidenceId: string, expectedHash: string, actualHash: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<any> {
    const investigation = await TamperInvestigation.create({
      investigationId: uuidv4(),
      evidenceId,
      severity,
      expectedHash,
      actualHash,
      status: 'open',
      driftAnalysis: {
        firstDetectedAt: new Date(),
        lastConfirmedAt: new Date(),
        driftCount: 1,
      },
    });

    await this.addEvent({
      evidenceId,
      eventType: CustodyEventType.TAMPER_DETECTED,
      performedBy: 'system',
      performedByName: 'System',
      details: `Tamper suspected: hash mismatch detected`,
      integrityStatus: IntegrityStatus.TAMPER_SUSPECTED,
    });

    return investigation;
  }

  /**
   * Update tamper investigation
   */
  async updateTamperInvestigation(investigationId: string, updates: Record<string, any>): Promise<void> {
    const investigation = await TamperInvestigation.findOne({ investigationId });

    if (!investigation) {
      throw new Error('Tamper investigation not found');
    }

    Object.assign(investigation, updates);
    await investigation.save();
  }

  /**
   * Add event to tamper investigation
   */
  async addTamperInvestigationEvent(investigationId: string, action: string, performedBy: string, notes?: string): Promise<void> {
    const investigation = await TamperInvestigation.findOne({ investigationId });

    if (!investigation) {
      throw new Error('Tamper investigation not found');
    }

    investigation.events.push({
      timestamp: new Date(),
      action,
      performedBy,
      notes,
    });

    investigation.driftAnalysis.driftCount++;
    investigation.driftAnalysis.lastConfirmedAt = new Date();

    await investigation.save();
  }

  /**
   * Get open tamper investigations
   */
  async getOpenTamperInvestigations(): Promise<any[]> {
    return await TamperInvestigation.find({
      status: { $in: ['open', 'investigating'] },
    })
      .sort({ detectedAt: -1 })
      .lean();
  }

  /**
   * Generate verification report
   */
  async generateVerificationReport(
    investigationId: string,
    evidenceIds: string[],
    reportType: string,
    userId: string,
    userName: string
  ): Promise<any> {
    const reportId = `RPT-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Gather evidence details
    const evidenceDetails = [];
    let verifiedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let tamperCount = 0;

    for (const evidenceId of evidenceIds) {
      const evidence = await Evidence.findById(evidenceId);
      const chain = await ChainOfCustody.findOne({ evidenceId });
      const verification = await BlockchainVerification.findOne({ evidenceId });

      if (evidence) {
        let integrityStatus = 'unknown';
        if (chain) integrityStatus = chain.integrityStatus;
        else if (verification) integrityStatus = verification.status;

        if (integrityStatus === 'verified' || integrityStatus === 'intact') verifiedCount++;
        else if (integrityStatus === 'failed' || integrityStatus === 'modified') failedCount++;
        else if (integrityStatus === 'tamper_suspected' || integrityStatus === 'integrity_mismatch') tamperCount++;
        else pendingCount++;

        evidenceDetails.push({
          evidenceId: evidence._id.toString(),
          fileName: evidence.metadata?.fileName || evidence.name,
          sha256Hash: verification?.fingerprint || 'N/A',
          integrityStatus,
          blockchainVerified: chain?.blockchainVerified || false,
          lastVerifiedAt: verification?.verifiedAt || null,
        });
      }
    }

    // Gather custody timelines
    const custodyTimeline = [];
    for (const evidenceId of evidenceIds) {
      const chain = await this.getChainVisualization(evidenceId);
      if (chain) {
        custodyTimeline.push({
          evidenceId,
          events: chain.events,
        });
      }
    }

    // Generate report content
    const report = await VerificationReport.create({
      reportId,
      investigationId,
      evidenceIds,
      reportType,
      generatedAt: new Date(),
      generatedBy: userId,
      generatedByName: userName,
      summary: {
        totalEvidence: evidenceIds.length,
        verifiedEvidence: verifiedCount,
        failedEvidence: failedCount,
        pendingEvidence: pendingCount,
        tamperDetected: tamperCount,
      },
      content: {
        evidenceDetails,
        custodyTimeline,
        tamperAlerts: [],
        blockchainReferences: [],
      },
      reportHash: this.generateHash(JSON.stringify({ reportId, evidenceIds, timestamp: Date.now() })),
    });

    return report;
  }

  /**
   * Export report
   */
  async exportReport(reportId: string, exportFormat: string, userId: string): Promise<any> {
    const report = await VerificationReport.findOne({ reportId });

    if (!report) {
      throw new Error('Report not found');
    }

    report.exportedAt = new Date();
    report.exportedBy = userId;
    report.exportFormat = exportFormat;
    await report.save();

    return report;
  }

  /**
   * Get evidence lineage graph
   */
  async getEvidenceLineageGraph(investigationId: string): Promise<{
    nodes: Array<{ id: string; type: string; label: string; metadata: any }>;
    edges: Array<{ source: string; target: string; relationship: string }>;
  }> {
    // Get all evidence for investigation
    const evidenceItems = await Evidence.find({ investigationId }).lean();
    const nodes = [];
    const edges = [];

    for (const evidence of evidenceItems) {
      const lineage = await EvidenceLineage.findOne({ evidenceId: evidence._id }).lean();

      nodes.push({
        id: evidence._id.toString(),
        type: lineage?.lineageType || 'original',
        label: evidence.name || evidence._id.toString(),
        metadata: {
          createdAt: evidence.createdAt,
          integrityStatus: lineage?.lineageType,
        },
      });

      if (lineage?.parentEvidenceId) {
        edges.push({
          source: lineage.parentEvidenceId.toString(),
          target: evidence._id.toString(),
          relationship: 'derived_from',
        });
      }

      if (lineage?.childEvidenceIds) {
        for (const childId of lineage.childEvidenceIds) {
          edges.push({
            source: evidence._id.toString(),
            target: childId.toString(),
            relationship: 'produces',
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Get integrity statistics
   */
  async getIntegrityStatistics(): Promise<{
    totalEvidence: number;
    verified: number;
    pending: number;
    failed: number;
    tamperSuspected: number;
    blockchainOnChain: number;
  }> {
    const [total, verified, pending, failed, tamper, onChain] = await Promise.all([
      ChainOfCustody.countDocuments(),
      ChainOfCustody.countDocuments({ integrityStatus: IntegrityStatus.VERIFIED }),
      ChainOfCustody.countDocuments({ integrityStatus: IntegrityStatus.PENDING_VERIFICATION }),
      ChainOfCustody.countDocuments({ integrityStatus: IntegrityStatus.VERIFICATION_FAILED }),
      ChainOfCustody.countDocuments({ integrityStatus: IntegrityStatus.TAMPER_SUSPECTED }),
      ChainOfCustody.countDocuments({ blockchainVerified: true }),
    ]);

    return { totalEvidence: total, verified, pending, failed, tamperSuspected: tamper, blockchainOnChain: onChain };
  }

  /**
   * Generate hash for chain
   */
  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const chainOfCustodyService = new ChainOfCustodyService();
export default chainOfCustodyService;
