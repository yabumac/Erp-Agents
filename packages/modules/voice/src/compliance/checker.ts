import { ModuleContext } from '@repo/core';

export interface ComplianceCheckResult {
  allowed: boolean;
  violations: string[];
}

export class VoiceComplianceChecker {
  public static async verifyOutboundCall(
    ctx: ModuleContext,
    targetNumber: string,
    region: string = 'US',
    callHour: number = 14 // 2pm local
  ): Promise<ComplianceCheckResult> {
    const violations: string[] = [];

    // 1. Calling Hours Check (TCPA: 8:00 AM - 9:00 PM local time)
    if (callHour < 8 || callHour >= 21) {
      violations.push(`TCPA Violation: Calling outside permissible legal hours (8am - 9pm). Current call hour: ${callHour}:00`);
    }

    // 2. Do-Not-Call (DNC) Registry Check
    const dncList = await ctx.db.findMany<any>('voice_dnc_records');
    const isDnc = dncList.some((r) => r.phone_number === targetNumber);
    if (isDnc) {
      violations.push(`DNC Violation: Number ${targetNumber} is registered on the tenant Do-Not-Call registry.`);
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }
}
