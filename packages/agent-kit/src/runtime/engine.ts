import { ModuleContext, AgentToolDef } from '@repo/core';
import { AgentDefinition, AgentRun } from '../types';
import { UntrustedDataQuarantine } from '../guardrails/quarantine';
import { KnowledgeRetrieval } from '../memory/retrieval';
import { ApprovalQueue } from '../approvals/queue';

export class AgentRuntime {
  /**
   * Execute an agent task
   */
  public static async execute(
    ctx: ModuleContext,
    agent: AgentDefinition,
    input: {
      text: string;
      source: 'email' | 'voice' | 'web' | 'document';
      proposedAction?: {
        toolName: string;
        args: any;
        riskLevel?: 'read' | 'write' | 'external-send' | 'financial';
      };
    },
    tools: AgentToolDef[] = []
  ): Promise<AgentRun> {
    const startTime = Date.now();

    // 1. Untrusted Input Quarantine & Guardrails Check
    const quarantine = UntrustedDataQuarantine.quarantine(input.text, input.source);

    // 2. Knowledge Retrieval (RAG)
    const sources = await KnowledgeRetrieval.search(ctx.db, input.text, undefined, 3);

    // 3. Create Agent Run Record
    const run: AgentRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: ctx.tenantId,
      agentId: agent.id,
      triggerType: 'event',
      status: 'running',
      inputs: { rawLength: input.text.length, source: input.source, quarantineStatus: quarantine.safeToProcess },
      retrievedSources: sources,
      toolCalls: [],
      output: null,
      tokensUsed: Math.floor(input.text.length / 4) + 150,
      costCents: 1, // 1 cent metering
      latencyMs: 0,
      createdAt: new Date().toISOString(),
    };

    // If injection attacks flagged, block automatic action and escalate
    if (!quarantine.safeToProcess) {
      run.status = 'escalated';
      run.output = {
        error: 'Security Guardrail: Potential prompt injection attack detected. Action escalated for human inspection.',
        threats: quarantine.flaggedThreats,
      };
      run.latencyMs = Date.now() - startTime;
      await ctx.db.insert('agent_runs', run);
      return run;
    }

    // 4. Autonomy & Tool Calling Evaluation
    if (input.proposedAction) {
      const toolName = input.proposedAction.toolName;
      const targetTool = tools.find((t) => t.name === toolName);
      const riskLevel = input.proposedAction.riskLevel || targetTool?.riskLevel || 'write';

      // Determine autonomy level
      const autonomy = agent.autonomyRules[toolName] || (riskLevel === 'financial' || riskLevel === 'external-send' ? 'approve' : 'auto');

      if (autonomy === 'approve') {
        // Queue in Approval Queue
        const approval = await ApprovalQueue.createApproval(ctx.db, {
          tenantId: ctx.tenantId,
          agentRunId: run.id,
          actionType: toolName,
          actionData: input.proposedAction.args,
          reasoning: `Proposed action [${toolName}] requires human sign-off due to risk level [${riskLevel}].`,
          sourcesUsed: sources.map((s) => ({ title: s.title, citation: s.citation })),
          riskLevel,
        });

        run.status = 'completed';
        run.output = {
          approvalRequired: true,
          approvalId: approval.id,
          message: 'Action queued for human approval.',
        };
      } else if (autonomy === 'suggest') {
        run.status = 'completed';
        run.output = {
          suggestedAction: input.proposedAction,
          reasoning: 'Draft produced for human review.',
          sources,
        };
      } else {
        // Autonomous execution
        let toolResult = null;
        if (targetTool) {
          toolResult = await targetTool.execute(ctx, input.proposedAction.args);
        }
        run.toolCalls.push({
          toolName,
          args: input.proposedAction.args,
          result: toolResult,
          status: 'success',
        });
        run.status = 'completed';
        run.output = { result: toolResult, executedAutonomously: true };
      }
    } else {
      run.status = 'completed';
      run.output = { message: 'Inquiry analyzed successfully', sources };
    }

    run.latencyMs = Date.now() - startTime;
    await ctx.db.insert('agent_runs', run);
    return run;
  }
}
