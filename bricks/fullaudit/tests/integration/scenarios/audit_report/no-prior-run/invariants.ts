/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'report'),
        inv.outputHasField(output, 'format'),
        // Tool should not throw — output must be an object
        (() => {
            if (typeof output !== 'object' || output === null) {
                return {
                    ok: false,
                    reason: `expected object output, got ${typeof output}`,
                };
            }
            return { ok: true };
        })(),
        // Report must contain an error/guidance message
        (() => {
            const o = output as { report: unknown };
            if (typeof o.report !== 'string') {
                return { ok: false, reason: 'output.report must be a string' };
            }
            const lower = o.report.toLowerCase();
            if (!lower.includes('no audit') && !lower.includes('audit:run')) {
                return {
                    ok: false,
                    reason: 'expected an error/guidance message when no prior audit_run exists',
                };
            }
            return { ok: true };
        })(),
    ];
}
