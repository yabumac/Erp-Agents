export interface VoiceCall {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  contactId?: string;
  status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'busy' | 'no_answer' | 'voicemail';
  durationSeconds: number;
  transcript: string;
  transcriptSegments: Array<{ speaker: 'caller' | 'agent'; text: string; timestampMs: number }>;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  outcomeTags: string[];
  aiContained: boolean;
  costCents: number;
  startedAt: string;
  endedAt?: string;
}

export interface VoiceFlowDefinition {
  id: string;
  tenantId: string;
  name: string;
  greetingText: string;
  allowedTools: string[];
  fallbackAction: 'voicemail' | 'transfer' | 'hangup';
  transferNumber?: string;
}
