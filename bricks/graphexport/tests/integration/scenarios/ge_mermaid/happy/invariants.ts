/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    // ge_mermaid returns a string directly
    return [
        (() => {
            if (typeof output !== 'string') {
                return { ok: false, reason: `expected string output, got ${typeof output}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.startsWith('flowchart')) {
                return {
                    ok: false,
                    reason: `expected output to start with 'flowchart', got: ${String(output).substring(0, 50)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof output !== 'string' || !output.includes('NodeA')) {
                return {
                    ok: false,
                    reason: `expected mermaid output to contain node label 'NodeA'`,
                };
            }
            return { ok: true };
        })(),
        // outputSizeUnder: 4096 bytes — measured at 185B for 5 nodes, well within budget
        inv.outputSizeUnder(4096)(output),
    ];
}
