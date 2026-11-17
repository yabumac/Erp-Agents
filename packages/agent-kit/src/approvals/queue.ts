import { TenantDb } from '@repo/core';
import { AgentApproval } from '../types';

export class ApprovalQueue {
  public static async listPending(db: TenantDb): Promise<AgentApproval[]> {
    return await db.findMany<AgentApproval>('agent_approvals', { status: 'pending' }, { orderBy: 'created_at', orderDirection: 'desc' });
  }

  public static async createApproval(
    db: TenantDb,
    data: Omit<AgentApproval, 'id' | 'status' | 'createdAt'>
  ): Promise<AgentApproval> {
    return await db.insert<AgentApproval>('agent_approvals', {
      ...data,
      status: 'pending',
    });
  }

  public static async approve(
    db: TenantDb,
    approvalId: string,
    userId: string,
    executor?: (actionData: any) => Promise<any>
  ): Promise<{ approval: AgentApproval; result?: any }> {
    const existing = await db.findById<AgentApproval>('agent_approvals', approvalId);
    if (!existing) {
      throw new Error(`Approval item [${approvalId}] not found`);
    }

    let executionResult;
    if (executor) {
      executionResult = await executor(existing.actionData);
    }

    const updated = await db.update<AgentApproval>('agent_approvals', approvalId, {
      status: 'approved',
      approvedBy: userId,
    });

    return { approval: updated, result: executionResult };
  }

  public static async editAndApprove(
    db: TenantDb,
    approvalId: string,
    humanEdits: any,
    userId: string,
    executor?: (actionData: any) => Promise<any>
  ): Promise<{ approval: AgentApproval; result?: any }> {
    const existing = await db.findById<AgentApproval>('agent_approvals', approvalId);
    if (!existing) {
      throw new Error(`Approval item [${approvalId}] not found`);
    }

    let executionResult;
    if (executor) {
      executionResult = await executor(humanEdits);
    }

    // Record human feedback diff for few-shot improvement
    await db.insert('agent_feedback', {
      approval_id: approvalId,
      agent_run_id: existing.agentRunId,
      original_output: existing.actionData,
      edited_output: humanEdits,
      diff: {
        wasEdited: true,
        timestamp: new Date().toISOString(),
      },
      used_as_example: true,
    });

    const updated = await db.update<AgentApproval>('agent_approvals', approvalId, {
      status: 'edited',
      approvedBy: userId,
      humanEdits,
    });

    return { approval: updated, result: executionResult };
  }

  public static async reject(
    db: TenantDb,
    approvalId: string,
    reason: string,
    userId: string
  ): Promise<AgentApproval> {
    return await db.update<AgentApproval>('agent_approvals', approvalId, {
      status: 'rejected',
      approvedBy: userId,
      actionData: {
        ...((await db.findById<AgentApproval>('agent_approvals', approvalId))?.actionData || {}),
        rejectionReason: reason,
      },
    });
  }
}
