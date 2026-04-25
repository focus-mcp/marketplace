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
                return {
                    ok: false,
                    reason: 'output.diagram must be a string even for empty graph',
                };
            }
            // Must start with a valid Mermaid header — even empty graphs are well-formed
            if (!out.diagram.startsWith('flowchart') && !out.diagram.startsWith('graph')) {
                return {
                    ok: false,
                    reason: `expected diagram to start with "flowchart" or "graph" for empty input, got: "${out.diagram.slice(0, 40)}"`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
