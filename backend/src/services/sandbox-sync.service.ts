/**
 * Sandbox Synchronization Service
 * Handles data sync from desktop sandbox agent
 */

import { SandboxSession } from '../models';
import { SandboxSessionStatus } from '../types';
import { ConflictError, AppError } from '../middleware';
// import { v4 as uuidv4 } from 'uuid';

export class SandboxSyncService {
  /**
   * Receive sandbox session start event
   */
  async receiveSessionStart(data: {
    sessionId: string;
    vmName: string;
    simulatorId: string;
    simulatorName: string;
    startTime: string;
  }): Promise<any> {
    // Check for duplicate session
    const existing = await SandboxSession.findOne({ sessionId: data.sessionId });
    if (existing) {
      throw new ConflictError(`Session ${data.sessionId} already exists`);
    }

    const session = await SandboxSession.create({
      sessionId: data.sessionId,
      vmName: data.vmName,
      simulatorId: data.simulatorId,
      simulatorName: data.simulatorName,
      status: SandboxSessionStatus.RUNNING,
      startTime: new Date(data.startTime),
    });

    return session;
  }

  /**
   * Receive sandbox session completion
   */
  async receiveSessionComplete(data: {
    sessionId: string;
    status: SandboxSessionStatus;
    endTime: string;
    exitCode?: number;
    eventsCollected?: number;
    evidenceFiles?: string[];
    errors?: string[];
  }): Promise<any> {
    const session = await SandboxSession.findOne({ sessionId: data.sessionId });
    if (!session) {
      throw new AppError('Session not found', 400, 'NOT_FOUND');
    }

    session.status = data.status;
    session.endTime = new Date(data.endTime);
    session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    session.exitCode = data.exitCode;
    session.eventsCollected = data.eventsCollected || 0;
    session.evidenceFiles = data.evidenceFiles || [];
    session.errorMessages = data.errors || [];
    session.syncedAt = new Date();

    await session.save();
    return session;
  }

  /**
   * Receive forensic events from sandbox
   */
  async receiveForensicEvents(data: {
    sessionId: string;
    events: Array<{
      timestamp: string;
      type: string;
      source: string;
      details: Record<string, any>;
    }>;
  }): Promise<{ received: number }> {
    // Verify session exists
    const session = await SandboxSession.findOne({ sessionId: data.sessionId });
    if (!session) {
      throw new AppError('Session not found', 400, 'NOT_FOUND');
    }

    // In a full implementation, these would be stored in an events collection
    // For now, we just increment the counter
    session.eventsCollected += data.events.length;
    await session.save();

    return { received: data.events.length };
  }

  /**
   * Get all sessions
   */
  async findAll(options: {
    page: number;
    limit: number;
    status?: SandboxSessionStatus;
  }): Promise<{ sessions: any[]; total: number; totalPages: number }> {
    const { page, limit, status } = options;

    const query = status ? { status } : {};

    const total = await SandboxSession.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const sessions = await SandboxSession.find(query)
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { sessions, total, totalPages };
  }

  /**
   * Get session by ID
   */
  async findById(sessionId: string): Promise<any> {
    const session = await SandboxSession.findOne({ sessionId }).lean();
    if (!session) {
      throw new AppError('Session not found', 400, 'NOT_FOUND');
    }
    return session;
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgDuration: number;
  }> {
    const total = await SandboxSession.countDocuments();

    const byStatus = await SandboxSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const avgDuration = await SandboxSession.aggregate([
      { $match: { duration: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      avgDuration: avgDuration[0]?.avg || 0,
    };
  }
}

export const sandboxSyncService = new SandboxSyncService();
export default sandboxSyncService;