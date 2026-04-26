/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import type { GraphEdge, GraphNode } from '../../src/operations.js';
import { resetGraph, setGraph } from '../../src/operations.js';
import { check as checkGqFilterHappy } from './scenarios/gq_filter/happy/invariants.js';
import { check as checkGqNeighborsHappy } from './scenarios/gq_neighbors/happy/invariants.js';
import { check as checkGqNodeHappy } from './scenarios/gq_node/happy/invariants.js';
import { check as checkGqPathHappy } from './scenarios/gq_path/happy/invariants.js';
import { check as checkGqQueryHappy } from './scenarios/gq_query/happy/invariants.js';

// ─── Fixture ──────────────────────────────────────────────────────────────────
// Graph: a --relates--> b --uses--> c
// Node a = concept "Alpha concept"
// Node b = concept "Beta concept"
// Node c = resource "Gamma resource"

const nodeA: GraphNode = { id: 'a', type: 'concept', label: 'Alpha concept' };
const nodeB: GraphNode = { id: 'b', type: 'concept', label: 'Beta concept' };
const nodeC: GraphNode = { id: 'c', type: 'resource', label: 'Gamma resource' };

const edgeAB: GraphEdge = { from: 'a', to: 'b', type: 'relates' };
const edgeBC: GraphEdge = { from: 'b', to: 'c', type: 'uses' };

beforeEach(() => {
    const nodeMap = new Map<string, GraphNode>([
        ['a', nodeA],
        ['b', nodeB],
        ['c', nodeC],
    ]);
    setGraph(nodeMap, [edgeAB, edgeBC]);
});

afterEach(() => {
    resetGraph();
});

// ─── gq_query ─────────────────────────────────────────────────────────────────

describe('gq_query integration', () => {
    it('happy: query("alpha") → count=1, result has id/type/label, size<=2048B', async () => {
        const output = await runTool(brick, 'query', { pattern: 'alpha' });
        for (const inv of checkGqQueryHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── gq_node ──────────────────────────────────────────────────────────────────

describe('gq_node integration', () => {
    it('happy: node("a") → node.id=a, outEdges >= 1, size<=2048B', async () => {
        const output = await runTool(brick, 'node', { id: 'a' });
        for (const inv of checkGqNodeHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── gq_neighbors ─────────────────────────────────────────────────────────────

describe('gq_neighbors integration', () => {
    it('happy: neighbors("b") → includes a and c, size<=2048B', async () => {
        const output = await runTool(brick, 'neighbors', { id: 'b' });
        for (const inv of checkGqNeighborsHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── gq_path ──────────────────────────────────────────────────────────────────

describe('gq_path integration', () => {
    it('happy: path(a→c) → path=[a,b,c], length=2, size<=2048B', async () => {
        const output = await runTool(brick, 'path', { from: 'a', to: 'c' });
        for (const inv of checkGqPathHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── gq_filter ────────────────────────────────────────────────────────────────

describe('gq_filter integration', () => {
    it('happy: filter(nodeTypes=["concept"]) → nodeCount=2, all concept, size<=2048B', async () => {
        const output = await runTool(brick, 'filter', { nodeTypes: ['concept'] });
        for (const inv of checkGqFilterHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
