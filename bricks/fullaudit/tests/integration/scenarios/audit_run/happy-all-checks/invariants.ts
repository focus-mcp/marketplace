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
        inv.outputHasField(output, 'score'),
        inv.outputHasField(output, 'checks'),
        (() => {
            const o = output as { files: unknown };
            if (!Array.isArray(o.files)) {
                return { ok: false, reason: 'output.files must be an array' };
            }
            if (o.files.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one file in synthetic fixtures dir',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { codeFindings: unknown };
            if (!Array.isArray(o.codeFindings)) {
                return { ok: false, reason: 'output.codeFindings must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { securityFindings: unknown };
            if (!Array.isArray(o.securityFindings)) {
                return { ok: false, reason: 'output.securityFindings must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { score: unknown };
            if (typeof o.score !== 'number' || o.score < 0 || o.score > 100) {
                return {
                    ok: false,
                    reason: `expected score in [0, 100], got ${o.score}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { checks: unknown };
            if (!Array.isArray(o.checks)) {
                return { ok: false, reason: 'output.checks must be an array' };
            }
            const valid = new Set(['code', 'security', 'architecture']);
            for (const c of o.checks as unknown[]) {
                if (typeof c !== 'string' || !valid.has(c)) {
                    return { ok: false, reason: `unexpected check kind: ${String(c)}` };
                }
            }
            return { ok: true };
        })(),
        (() => {
            // All three checks should be present when no override given
            const o = output as { checks: string[] };
            if (!Array.isArray(o.checks)) return { ok: true };
            const expected = ['code', 'security', 'architecture'];
            const missing = expected.filter((c) => !o.checks.includes(c));
            if (missing.length > 0) {
                return {
                    ok: false,
                    reason: `expected all three checks, missing: ${missing.join(', ')}`,
                };
            }
            return { ok: true };
        })(),
        // Fixtures include console.log and TODO — expect at least one code finding
        (() => {
            const o = output as { codeFindings: Array<{ kind: string }> };
            if (!Array.isArray(o.codeFindings)) return { ok: true };
            if (o.codeFindings.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one code finding (console.log + TODO in with-code-issues.ts)',
                };
            }
            return { ok: true };
        })(),
    ];
}
