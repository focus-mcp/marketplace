/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'diagram'),
        inv.outputHasField(output, 'directed'),
        (() => {
            const out = output as { diagram: unknown; directed: unknown };
            if (typeof out.diagram !== 'string') {
                return { ok: false, reason: 'output.diagram must be a string' };
            }
            if (!out.diagram.startsWith('digraph') && !out.diagram.startsWith('graph')) {
                return {
                    ok: false,
                    reason: `expected diagram to start with "digraph" or "graph", got: "${out.diagram.slice(0, 40)}"`,
                };
            }
            if (out.directed !== true) {
                return { ok: false, reason: `expected directed=true, got ${String(out.directed)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { diagram: unknown };
            const diag = out.diagram as string;
            if (!diag.includes('"A"') || !diag.includes('"B"')) {
                return {
                    ok: false,
                    reason: 'expected node ids "A" and "B" in DOT diagram',
                };
            }
            if (!diag.includes('->')) {
                return {
                    ok: false,
                    reason: 'expected directed edge "->" in DOT diagram',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
