export interface QuarantineResult {
  sanitized: string;
  flaggedThreats: string[];
  safeToProcess: boolean;
}

export class UntrustedDataQuarantine {
  private static INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /disregard\s+(?:all\s+)?prior\s+prompts/i,
    /system\s*prompt\s*override/i,
    /you\s+are\s+now\s+in\s+DAN\s+mode/i,
    /jailbreak/i,
    /exfiltrate\s+(?:all\s+)?(?:data|keys|tokens|passwords)/i,
    /format\s+drive/i,
    /grant\s+(?:me\s+)?admin\s+role/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /drop\s+table\s+/i,
  ];

  /**
   * Quarantines any untrusted external text inside delimited XML blocks
   * and scans for adversarial injection attempts.
   */
  public static quarantine(text: string, source: 'email' | 'voice' | 'web' | 'document'): QuarantineResult {
    const threats: string[] = [];
    const cleanText = text || '';

    // Pattern matching against known jailbreaks and prompt attacks
    for (const pattern of UntrustedDataQuarantine.INJECTION_PATTERNS) {
      if (pattern.test(cleanText)) {
        threats.push(`Matched adversarial pattern: ${pattern.toString()}`);
      }
    }

    // Strip direct command injection markers
    let neutralized = cleanText
      .replace(/<\/?system>/gi, '')
      .replace(/<\/?instructions>/gi, '')
      .replace(/<\/?admin>/gi, '');

    // Wrap in tamper-evident untrusted data envelope
    const wrapped = `
<untrusted_content source="${source}">
${neutralized.trim()}
</untrusted_content>
    `.trim();

    return {
      sanitized: wrapped,
      flaggedThreats: threats,
      safeToProcess: threats.length === 0,
    };
  }

  /**
   * Rate limiting and loop prevention (e.g. max 1 automatic reply per thread)
   */
  public static shouldSuppressAutoReply(thread: {
    messageCount: number;
    lastSenderEmail?: string;
    hasAgentReplied: boolean;
  }): boolean {
    const email = (thread.lastSenderEmail || '').toLowerCase();

    // Never reply to automated service emails, bounce handlers, or mailing lists
    if (
      email.includes('no-reply') ||
      email.includes('noreply') ||
      email.includes('mailer-daemon') ||
      email.includes('notifications@') ||
      email.includes('bounce')
    ) {
      return true;
    }

    // Suppress if agent already replied automatically in this thread
    if (thread.hasAgentReplied) {
      return true;
    }

    return false;
  }
}
