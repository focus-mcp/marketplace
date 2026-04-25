/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'findings'),
        inv.outputHasField(output, 'score'),
        (() => {
            const o = output as { findings: unknown };
            if (!Array.isArray(o.findings)) {
                return { ok: false, reason: 'output.findings must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { score: unknown };
            if (typeof o.score !== 'number' || o.score < 1 || o.score > 10) {
                return { ok: false, reason: `expected score in [1,10], got ${o.score}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { findings: unknown[] };
            if (!Array.isArray(o.findings) || o.findings.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one finding (TODO comment + console.log in fixture)',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                findings: Array<{ type: string; severity: string; line: number; message: string }>;
            };
            if (!Array.isArray(o.findings) || o.findings.length === 0) return { ok: true };
            const first = o.findings[0];
            if (!first) return { ok: true };
            if (typeof first.type !== 'string') {
                return { ok: false, reason: 'finding must have a string "type" field' };
            }
            if (!['info', 'warning', 'error'].includes(first.severity)) {
                return { ok: false, reason: `invalid severity: ${first.severity}` };
            }
            if (typeof first.line !== 'number') {
                return { ok: false, reason: 'finding must have a number "line" field' };
            }
            if (typeof first.message !== 'string') {
                return { ok: false, reason: 'finding must have a string "message" field' };
            }
            return { ok: true };
        })(),
    ];
}
