import { ModuleContext } from '@repo/core';

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition';
  actionType?: string;
  conditionField?: string;
  conditionOperator?: 'contains' | 'equals' | 'greater_than';
  conditionValue?: any;
  params?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  triggerEvent: string;
  steps: WorkflowStep[];
  isActive: boolean;
}

export class AutomationEngine {
  public static async executeWorkflow(
    ctx: ModuleContext,
    workflow: WorkflowDefinition,
    triggerPayload: any
  ): Promise<{ runId: string; status: 'completed' | 'skipped' | 'failed'; logs: any[] }> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stepLogs: any[] = [];

    // Evaluate steps in topological sequence
    for (const step of workflow.steps) {
      if (step.type === 'condition') {
        const fieldVal = triggerPayload[step.conditionField || ''];
        let matched = false;

        if (step.conditionOperator === 'contains') {
          matched = String(fieldVal || '').toLowerCase().includes(String(step.conditionValue || '').toLowerCase());
        } else if (step.conditionOperator === 'equals') {
          matched = fieldVal === step.conditionValue;
        }

        stepLogs.push({ stepId: step.id, type: 'condition', matched, value: fieldVal });
        if (!matched) {
          return { runId, status: 'skipped', logs: stepLogs };
        }
      } else if (step.type === 'action') {
        let actionResult = null;

        if (step.actionType === 'crm.createContact') {
          actionResult = await ctx.db.insert('core_contacts', {
            email: triggerPayload.from,
            first_name: triggerPayload.from ? triggerPayload.from.split('@')[0] : 'Lead',
            source: 'automation_enquiry',
          });
        } else if (step.actionType === 'crm.createDeal') {
          actionResult = await ctx.db.insert('crm_deals', {
            name: `Enquiry: ${triggerPayload.subject || 'New Deal'}`,
            value_cents: step.params?.defaultValueCents || 100000,
            contact_id: step.params?.contactId,
          });
        } else if (step.actionType === 'mail.draftReply') {
          actionResult = await ctx.db.insert('mail_drafts', {
            thread_id: triggerPayload.threadId,
            body_text: 'Thank you for your enquiry. Our team has received your request and will respond shortly.',
            status: 'draft',
          });
        } else if (step.actionType === 'core.notifyOwner') {
          actionResult = await ctx.db.insert('core_notifications', {
            type: 'lead_alert',
            title: 'New Lead Enquiry',
            body: `Inbound enquiry received: "${triggerPayload.subject}"`,
          });
        }

        stepLogs.push({ stepId: step.id, type: 'action', action: step.actionType, result: actionResult });
      }
    }

    return { runId, status: 'completed', logs: stepLogs };
  }
}
