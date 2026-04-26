/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { findings?: unknown[]; clean?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'findings'),
        inv.outputHasField(output, 'clean'),
        (() => {
            if (!Array.isArray(o.findings) || o.findings.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty findings, got ${JSON.stringify(o.findings)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.clean !== true) {
                return { ok: false, reason: `expected clean=true, got ${String(o.clean)}` };
            }
            return { ok: true };
        })(),
    ];
}
