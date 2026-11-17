import { RiskLevel, AutonomyLevel, AgentToolDef } from '@repo/core';

export interface AgentDefinition {
  id: string;
  tenantId: string;
  name: string;
  purpose: string;
  systemPrompt: string;
  systemPromptVersion: number;
  model: string;
  temperature: number;
  allowedTools: string[];
  autonomyRules: Record<string, AutonomyLevel>; // toolName -> 'suggest' | 'approve' | 'auto'
  budgetLimits: {
    maxCostPerDayCents: number;
    maxRunsPerHour: number;
  };
}

export interface AgentRun {
  id: string;
  tenantId: string;
  agentId: string;
  triggerType: 'event' | 'manual' | 'schedule';
  status: 'running' | 'completed' | 'failed' | 'escalated';
  inputs: any;
  retrievedSources: Array<{ sourceId: string; title: string; content: string; score: number }>;
  toolCalls: Array<{ toolName: string; args: any; result?: any; status: string }>;
  output: any;
  tokensUsed: number;
  costCents: number;
  latencyMs: number;
  createdAt: string;
  completedAt?: string;
}

export interface AgentApproval {
  id: string;
  tenantId: string;
  agentRunId: string;
  actionType: string;
  actionData: any;
  reasoning: string;
  sourcesUsed: Array<{ title: string; citation: string }>;
  riskLevel: RiskLevel;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  approvedBy?: string;
  humanEdits?: any;
  createdAt: string;
}

export interface IngestionSource {
  id: string;
  tenantId: string;
  type: 'document' | 'url' | 'text' | 'faq';
  name: string;
  content: string;
  chunks: Array<{
    id: string;
    content: string;
    embedding: number[];
  }>;
}
