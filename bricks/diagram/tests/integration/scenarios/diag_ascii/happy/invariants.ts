/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'diagram'),
        (() => {
            const out = output as { diagram: unknown };
            if (typeof out.diagram !== 'string') {
                return { ok: false, reason: 'output.diagram must be a string' };
            }
            if (out.diagram.trim().length === 0) {
                return { ok: false, reason: 'output.diagram must not be empty for a 3-node chain' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { diagram: unknown };
            const diag = out.diagram as string;
            if (!diag.includes('Start') || !diag.includes('Middle') || !diag.includes('End')) {
                return {
                    ok: false,
                    reason: 'expected node labels "Start", "Middle", "End" in ASCII diagram',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { diagram: unknown };
            const diag = out.diagram as string;
            // Chain diagram uses box-drawing characters (┌ or +)
            const hasBoxChars = diag.includes('┌') || diag.includes('+') || diag.includes('|');
            if (!hasBoxChars) {
                return {
                    ok: false,
                    reason: 'expected box-drawing characters in ASCII diagram',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
