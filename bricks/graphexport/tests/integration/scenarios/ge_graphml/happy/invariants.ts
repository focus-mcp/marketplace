/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    // ge_graphml returns a string directly
    return [
        (() => {
            if (typeof output !== 'string') {
                return { ok: false, reason: `expected string output, got ${typeof output}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('<?xml')) {
                return {
                    ok: false,
                    reason: `expected GraphML output to contain '<?xml'`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('graphml')) {
                return {
                    ok: false,
                    reason: `expected GraphML output to contain 'graphml' namespace`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('NodeA')) {
                return {
                    ok: false,
                    reason: `expected GraphML output to contain node label 'NodeA'`,
                };
            }
            return { ok: true };
        })(),
        // outputSizeUnder: 4096 bytes — measured at 1389B for 5 nodes, well within budget
        inv.outputSizeUnder(4096)(output),
    ];
}
