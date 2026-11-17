# ADR-006: Telephony and Realtime Voice Pipeline Architecture

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The Voice module provides an intelligent AI phone agent capable of handling inbound customer inquiries, looking up orders/inventory, booking appointments, and conducting outbound compliance-checked campaigns.
Key requirements:
1. Low conversational latency (<800ms mouth-to-ear response time).
2. Natural barge-in: Callers must be able to interrupt the AI speech seamlessly.
3. DTMF keypress detection, live audio streaming, and call recording with dual-channel audio.
4. Seamless handoff to human agents with full conversation context and CRM summary.
5. Strict regulatory compliance (TCPA, TSR, EU GDPR, DNC registry verification, calling-hours enforcement, and mandatory AI recording disclosures).

## Alternatives Considered
- **Direct Twilio Media Streams + Custom WebSocket Server:** Raw audio streaming over WebSockets requires writing a bespoke DSP pipeline for acoustic echo cancellation, voice activity detection (VAD), silence detection, chunking, and streaming LLM completion synthesis. Prohibitively high development time and latency overhead.
- **Vapi / Retell AI (Turnkey Voice Platforms):** Excellent managed voice performance, but introduces closed proprietary third-party lock-in, high per-minute surcharge ($0.05 - $0.15/min on top of telephony), and zero ability to run self-hosted on-premises.
- **Twilio SIP Trunking + LiveKit Agents Framework:** LiveKit provides an open-source, production-grade realtime WebRTC and SIP infrastructure designed specifically for voice AI agents. It includes built-in Silero VAD, Deepgram STT, Cartesia/ElevenLabs TTS, and LLM orchestration with native barge-in support. Can be consumed via LiveKit Cloud or self-hosted in Docker.

## Decision
We adopt **Twilio** for telephony provisioning and **LiveKit Agents** for the realtime conversational voice pipeline:
1. **Telephony Layer (`packages/providers/twilio`):**
   - Handles phone number purchasing, regulatory compliance bundles, inbound routing via SIP Trunking, and outbound calling via Twilio Voice API.
   - Secondary provider adapter interface (`TelephonyProvider`) allows swapping to Telnyx.
2. **Realtime Media Pipeline (`packages/providers/livekit`):**
   - Twilio forwards calls to LiveKit via SIP URI.
   - LiveKit Agent runs in `apps/worker` (or a dedicated voice runner) utilizing the LiveKit Agents SDK:
     - **VAD:** Silero VAD for low-latency voice boundary detection.
     - **STT:** Deepgram Nova-2 streaming speech-to-text.
     - **LLM:** Anthropic Claude 3.5 Sonnet / Haiku with streaming tool execution.
     - **TTS:** Cartesia Sonic or ElevenLabs Flash for ultra-fast, natural audio synthesis.
     - **Barge-in:** Audio playback instantly cancels when caller interruption is detected.
3. **Flow Builder Integration:**
   - Visual call flows built in the UI translate into a directed graph evaluated by the LiveKit agent worker.
   - Flow nodes can invoke tools defined in other modules (e.g., `inv.checkStock`, `fin.getInvoiceStatus`, `crm.createContact`).
4. **Compliance Gatekeeper (`packages/modules/voice/src/compliance.ts`):**
   - Outbound campaigns strictly enforce regional calling hour windows (based on recipient area code/timezone).
   - Mandatory AI and recording disclosure played before user speech begins.
   - Verification against the tenant Do-Not-Call (DNC) list. Campaigns failing compliance checks are blocked at launch.
5. **Post-Call Processing:**
   - Recordings and transcripts are ingested into `voice_calls`.
   - Post-call agent extracts call summary, sentiment, outcome tags, and emits `voice.call.completed` event to update CRM and Helpdesk.

## Consequences
### Positive
- Sub-second latency response with natural conversational interruption.
- Open-source LiveKit architecture allows full on-premises deployment without vendor lock-in.
- Telephony and audio processing are decoupled; numbers can move between carriers without rewriting the agent logic.

### Negative / Trade-offs
- LiveKit agent worker requires persistent WebSocket connections and cannot run as an ephemeral serverless request.
- Multi-party transcription and high-quality TTS incur per-minute cloud costs that must be metered per tenant.

## References
- LiveKit Agents Framework: https://docs.livekit.io/agents
- Twilio Voice SIP Trunking: https://www.twilio.com/docs/voice/sip
- Deepgram Streaming Audio: https://developers.deepgram.com
- FCC / FTC TCPA Compliance Guidelines: https://www.fcc.gov
