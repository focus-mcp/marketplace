/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkDiagAsciiHappy } from './scenarios/diag_ascii/happy/invariants.js';
import { check as checkDiagDotHappy } from './scenarios/diag_dot/happy/invariants.js';
import { check as checkDiagMermaidEmpty } from './scenarios/diag_mermaid/empty-graph/invariants.js';
import { check as checkDiagMermaidHappy } from './scenarios/diag_mermaid/happy/invariants.js';

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

describe('diag_mermaid integration', () => {
    it('happy: flowchart A→B → starts with "flowchart"', async () => {
        const output = await runTool(brick, 'mermaid', {
            type: 'flowchart',
            nodes: [
                { id: 'A', label: 'Start' },
                { id: 'B', label: 'End' },
            ],
            edges: [{ from: 'A', to: 'B', label: 'next' }],
        });
        assertInvariants('diag_mermaid/happy', checkDiagMermaidHappy(output));
    });

    it('adversarial: empty nodes+edges → minimal valid Mermaid output', async () => {
        const output = await runTool(brick, 'mermaid', {
            type: 'flowchart',
            nodes: [],
            edges: [],
        });
        assertInvariants('diag_mermaid/empty-graph', checkDiagMermaidEmpty(output));
    });
});

describe('diag_dot integration', () => {
    it('happy: directed A→B → starts with "digraph", contains node ids and "->"', async () => {
        const output = await runTool(brick, 'dot', {
            nodes: [
                { id: 'A', label: 'Start' },
                { id: 'B', label: 'End' },
            ],
            edges: [{ from: 'A', to: 'B' }],
            directed: true,
        });
        assertInvariants('diag_dot/happy', checkDiagDotHappy(output));
    });
});

describe('diag_ascii integration', () => {
    it('happy: chain A→B→C → non-empty ASCII art with node labels and box chars', async () => {
        const output = await runTool(brick, 'ascii', {
            nodes: [
                { id: 'A', label: 'Start' },
                { id: 'B', label: 'Middle' },
                { id: 'C', label: 'End' },
            ],
            edges: [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
            ],
        });
        assertInvariants('diag_ascii/happy', checkDiagAsciiHappy(output));
    });
});
