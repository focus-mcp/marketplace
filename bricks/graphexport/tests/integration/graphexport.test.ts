/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetGraph } from '../../src/operations.js';
import { check as checkGeCypherHappy } from './scenarios/ge_cypher/happy/invariants.js';
import { check as checkGeGraphmlHappy } from './scenarios/ge_graphml/happy/invariants.js';
import { check as checkGeHtmlHappy } from './scenarios/ge_html/happy/invariants.js';
import { check as checkGeInputHappy } from './scenarios/ge_input/happy/invariants.js';
import { check as checkGeMermaidHappy } from './scenarios/ge_mermaid/happy/invariants.js';
import { check as checkGeObsidianHappy } from './scenarios/ge_obsidian/happy/invariants.js';

// Tiny deterministic graph: 5 nodes, 4 edges
const TINY_GRAPH = {
    nodes: [
        { id: 'n1', label: 'NodeA', type: 'file' },
        { id: 'n2', label: 'NodeB', type: 'function' },
        { id: 'n3', label: 'NodeC', type: 'class' },
        { id: 'n4', label: 'NodeD', type: 'export' },
        { id: 'n5', label: 'NodeE', type: 'import' },
    ],
    edges: [
        { from: 'n1', to: 'n2', type: 'imports' },
        { from: 'n2', to: 'n3', type: 'calls' },
        { from: 'n3', to: 'n4', type: 'exports' },
        { from: 'n4', to: 'n5', type: 'depends' },
    ],
};

function assertInvariants(results: { ok: boolean; reason?: string }[]): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason}`);
    }
}

beforeEach(() => {
    resetGraph();
});

afterEach(() => {
    resetGraph();
});

// ─── ge_input ─────────────────────────────────────────────────────────────────

describe('ge_input integration', () => {
    it('happy: ge_input(5 nodes, 4 edges) → loaded=true, nodeCount=5, edgeCount=4', async () => {
        const output = await runTool(brick, 'input', { graph: TINY_GRAPH });
        assertInvariants(checkGeInputHappy(output, 5, 4));
    });
});

// ─── ge_mermaid ───────────────────────────────────────────────────────────────

describe('ge_mermaid integration', () => {
    it('happy: ge_input + ge_mermaid → starts with flowchart, contains NodeA, <4096B', async () => {
        await runTool(brick, 'input', { graph: TINY_GRAPH });
        const output = await runTool(brick, 'mermaid', {});
        assertInvariants(checkGeMermaidHappy(output));
    });
});

// ─── ge_html ──────────────────────────────────────────────────────────────────

describe('ge_html integration', () => {
    it('happy: ge_input + ge_html → <!DOCTYPE html>, contains NodeA, <8192B', async () => {
        await runTool(brick, 'input', { graph: TINY_GRAPH });
        const output = await runTool(brick, 'html', {});
        assertInvariants(checkGeHtmlHappy(output));
    });
});

// ─── ge_graphml ───────────────────────────────────────────────────────────────

describe('ge_graphml integration', () => {
    it('happy: ge_input + ge_graphml → <?xml, graphml namespace, contains NodeA, <4096B', async () => {
        await runTool(brick, 'input', { graph: TINY_GRAPH });
        const output = await runTool(brick, 'graphml', {});
        assertInvariants(checkGeGraphmlHappy(output));
    });
});

// ─── ge_cypher ────────────────────────────────────────────────────────────────

describe('ge_cypher integration', () => {
    it('happy: ge_input + ge_cypher → 9 CREATE lines (5 nodes + 4 edges), <2048B', async () => {
        await runTool(brick, 'input', { graph: TINY_GRAPH });
        const output = await runTool(brick, 'cypher', {});
        assertInvariants(checkGeCypherHappy(output));
    });
});

// ─── ge_obsidian ──────────────────────────────────────────────────────────────

describe('ge_obsidian integration', () => {
    it('happy: ge_input + ge_obsidian → 5 .md files, each has heading, <4096B', async () => {
        await runTool(brick, 'input', { graph: TINY_GRAPH });
        const output = await runTool(brick, 'obsidian', {});
        assertInvariants(checkGeObsidianHappy(output));
    });
});
