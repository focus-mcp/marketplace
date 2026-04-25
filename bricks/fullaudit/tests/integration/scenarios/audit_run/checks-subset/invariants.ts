/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'codeFindings'),
        inv.outputHasField(output, 'securityFindings'),
        inv.outputHasField(output, 'checks'),
        // checks array must contain only "security"
        (() => {
            const o = output as { checks: unknown };
            if (!Array.isArray(o.checks)) {
                return { ok: false, reason: 'output.checks must be an array' };
            }
            const checks = o.checks as string[];
            if (checks.length !== 1 || checks[0] !== 'security') {
                return {
                    ok: false,
                    reason: `expected checks=["security"], got ${JSON.stringify(checks)}`,
                };
            }
            return { ok: true };
        })(),
        // code findings must be empty when only security check is requested
        (() => {
            const o = output as { codeFindings: unknown };
            if (!Array.isArray(o.codeFindings)) {
                return { ok: false, reason: 'output.codeFindings must be an array' };
            }
            if (o.codeFindings.length > 0) {
                return {
                    ok: false,
                    reason: `expected empty codeFindings when only security check run, got ${o.codeFindings.length}`,
                };
            }
            return { ok: true };
        })(),
        // securityFindings is present and is an array
        (() => {
            const o = output as { securityFindings: unknown };
            if (!Array.isArray(o.securityFindings)) {
                return { ok: false, reason: 'output.securityFindings must be an array' };
            }
            return { ok: true };
        })(),
    ];
}
