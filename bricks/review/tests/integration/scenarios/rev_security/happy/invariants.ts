/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'findings'),
        inv.outputHasField(output, 'riskLevel'),
        (() => {
            const o = output as { findings: unknown };
            if (!Array.isArray(o.findings)) {
                return { ok: false, reason: 'output.findings must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { riskLevel: unknown };
            if (!['low', 'medium', 'high', 'critical'].includes(o.riskLevel as string)) {
                return { ok: false, reason: `invalid riskLevel: ${o.riskLevel}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { findings: unknown[] };
            if (!Array.isArray(o.findings) || o.findings.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least one finding for file with hardcoded API key',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { findings: Array<{ type: string }> };
            if (!Array.isArray(o.findings)) return { ok: true };
            const hasApiKeyFinding = o.findings.some((f) => f.type === 'hardcoded-api-key');
            if (!hasApiKeyFinding) {
                return {
                    ok: false,
                    reason: 'expected a hardcoded-api-key finding for sk_test_xxx fixture',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { riskLevel: string };
            if (!['high', 'critical'].includes(o.riskLevel)) {
                return {
                    ok: false,
                    reason: `expected riskLevel high or critical for file with API key, got ${o.riskLevel}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
