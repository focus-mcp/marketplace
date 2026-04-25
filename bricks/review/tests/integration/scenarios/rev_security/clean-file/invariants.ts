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
            const o = output as { findings: unknown[] };
            if (!Array.isArray(o.findings) || o.findings.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty findings for clean file, got ${Array.isArray(o.findings) ? o.findings.length : 'non-array'}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { riskLevel: unknown };
            if (o.riskLevel !== 'low') {
                return {
                    ok: false,
                    reason: `expected riskLevel === "low" for clean file, got ${o.riskLevel}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
