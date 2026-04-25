/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    // ge_cypher returns a string directly
    return [
        (() => {
            if (typeof output !== 'string') {
                return { ok: false, reason: `expected string output, got ${typeof output}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('CREATE')) {
                return {
                    ok: false,
                    reason: `expected Cypher output to contain 'CREATE' statements`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string') return { ok: true };
            const lines = output.split('\n').filter((l) => l.trim().length > 0);
            // 5 nodes + 4 edges = 9 CREATE statements
            if (lines.length !== 9) {
                return {
                    ok: false,
                    reason: `expected 9 CREATE lines (5 nodes + 4 edges), got ${lines.length}`,
                };
            }
            return { ok: true };
        })(),
        // outputSizeUnder: 2048 bytes — measured at 378B for 5 nodes, well within budget
        inv.outputSizeUnder(2048)(output),
    ];
}
