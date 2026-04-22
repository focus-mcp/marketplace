// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphEdge, GraphNode } from './operations.ts';
import {
    gqFilter,
    gqNeighbors,
    gqNode,
    gqPath,
    gqQuery,
    resetGraph,
    setGraph,
} from './operations.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const nodeA: GraphNode = { id: 'a', type: 'concept', label: 'Alpha concept' };
const nodeB: GraphNode = { id: 'b', type: 'concept', label: 'Beta concept' };
const nodeC: GraphNode = { id: 'c', type: 'resource', label: 'Gamma resource' };
const nodeD: GraphNode = { id: 'd', type: 'resource', label: 'Delta resource' };

const edgeAB: GraphEdge = { from: 'a', to: 'b', type: 'relates' };
const edgeBC: GraphEdge = { from: 'b', to: 'c', type: 'uses' };
const edgeAD: GraphEdge = { from: 'a', to: 'd', type: 'uses' };

function buildTestGraph(): void {
    const nodeMap = new Map<string, GraphNode>([
        ['a', nodeA],
        ['b', nodeB],
        ['c', nodeC],
        ['d', nodeD],
    ]);
    setGraph(nodeMap, [edgeAB, edgeBC, edgeAD]);
}

beforeEach(() => {
    buildTestGraph();
});

afterEach(() => {
    resetGraph();
});

// ─── gqQuery ─────────────────────────────────────────────────────────────────

describe('gqQuery', () => {
    it('finds nodes by label substring (case-insensitive)', () => {
        const result = gqQuery({ pattern: 'alpha' });
        expect(result.count).toBe(1);
        expect(result.results[0]?.id).toBe('a');
    });

    it('returns multiple matches', () => {
        const result = gqQuery({ pattern: 'concept' });
        expect(result.count).toBe(2);
        const ids = result.results.map((r) => r.id);
        expect(ids).toContain('a');
        expect(ids).toContain('b');
    });

    it('filters by type', () => {
        const result = gqQuery({ pattern: 'resource', type: 'resource' });
        expect(result.results.every((r) => r.type === 'resource')).toBe(true);
    });

    it('respects limit', () => {
        const result = gqQuery({ pattern: 'concept', limit: 1 });
        expect(result.count).toBe(1);
        expect(result.results).toHaveLength(1);
    });

    it('returns empty when no match', () => {
        const result = gqQuery({ pattern: 'nonexistent' });
        expect(result.count).toBe(0);
        expect(result.results).toHaveLength(0);
    });
});

// ─── gqNode ──────────────────────────────────────────────────────────────────

describe('gqNode', () => {
    it('returns node with in and out edges', () => {
        const result = gqNode({ id: 'a' });
        expect('node' in result).toBe(true);
        if (!('node' in result)) return;
        expect(result.node.id).toBe('a');
        expect(result.outEdges).toHaveLength(2);
        expect(result.inEdges).toHaveLength(0);
    });

    it('returns inEdges for intermediate node', () => {
        const result = gqNode({ id: 'b' });
        expect('node' in result).toBe(true);
        if (!('node' in result)) return;
        expect(result.inEdges).toHaveLength(1);
        expect(result.inEdges[0]?.from).toBe('a');
        expect(result.outEdges).toHaveLength(1);
    });

    it('returns error for unknown node', () => {
        const result = gqNode({ id: 'unknown' });
        expect('error' in result).toBe(true);
        if (!('error' in result)) return;
        expect(result.error).toContain('unknown');
    });
});

// ─── gqNeighbors ─────────────────────────────────────────────────────────────

describe('gqNeighbors', () => {
    it('returns both in and out neighbors by default', () => {
        const result = gqNeighbors({ id: 'b' });
        const ids = result.neighbors.map((n) => n.id);
        expect(ids).toContain('a');
        expect(ids).toContain('c');
    });

    it('returns only outgoing neighbors when direction=out', () => {
        const result = gqNeighbors({ id: 'a', direction: 'out' });
        expect(result.neighbors.every((n) => n.direction === 'out')).toBe(true);
        const ids = result.neighbors.map((n) => n.id);
        expect(ids).toContain('b');
        expect(ids).toContain('d');
    });

    it('returns only incoming neighbors when direction=in', () => {
        const result = gqNeighbors({ id: 'b', direction: 'in' });
        expect(result.neighbors.every((n) => n.direction === 'in')).toBe(true);
        expect(result.neighbors[0]?.id).toBe('a');
    });

    it('filters by edgeType', () => {
        const result = gqNeighbors({ id: 'a', direction: 'out', edgeType: 'uses' });
        expect(result.neighbors).toHaveLength(1);
        expect(result.neighbors[0]?.id).toBe('d');
        expect(result.neighbors[0]?.edgeType).toBe('uses');
    });

    it('returns empty for isolated node', () => {
        resetGraph();
        const nodeMap = new Map<string, GraphNode>([['x', { id: 'x', type: 't', label: 'X' }]]);
        setGraph(nodeMap, []);
        const result = gqNeighbors({ id: 'x' });
        expect(result.neighbors).toHaveLength(0);
    });
});

// ─── gqPath ──────────────────────────────────────────────────────────────────

describe('gqPath', () => {
    it('finds direct path between connected nodes', () => {
        const result = gqPath({ from: 'a', to: 'b' });
        expect('path' in result).toBe(true);
        if (!('path' in result)) return;
        expect(result.path).toEqual(['a', 'b']);
        expect(result.length).toBe(1);
    });

    it('finds multi-hop path', () => {
        const result = gqPath({ from: 'a', to: 'c' });
        expect('path' in result).toBe(true);
        if (!('path' in result)) return;
        expect(result.path[0]).toBe('a');
        expect(result.path[result.path.length - 1]).toBe('c');
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns found: false when no path exists', () => {
        const result = gqPath({ from: 'c', to: 'a' });
        expect('found' in result).toBe(true);
        if (!('found' in result)) return;
        expect(result.found).toBe(false);
    });

    it('returns path of length 0 for same node', () => {
        const result = gqPath({ from: 'a', to: 'a' });
        expect('path' in result).toBe(true);
        if (!('path' in result)) return;
        expect(result.length).toBe(0);
        expect(result.path).toEqual(['a']);
    });

    it('respects maxDepth', () => {
        const result = gqPath({ from: 'a', to: 'c', maxDepth: 1 });
        expect('found' in result).toBe(true);
        if (!('found' in result)) return;
        expect(result.found).toBe(false);
    });
});

// ─── gqFilter ────────────────────────────────────────────────────────────────

describe('gqFilter', () => {
    it('filters by nodeTypes', () => {
        const result = gqFilter({ nodeTypes: ['concept'] });
        expect(result.nodeCount).toBe(2);
        expect(result.nodes.every((n) => n.type === 'concept')).toBe(true);
    });

    it('filters edges to only include nodes in subgraph', () => {
        const result = gqFilter({ nodeTypes: ['concept'] });
        const ids = new Set(result.nodes.map((n) => n.id));
        for (const edge of result.edges) {
            expect(ids.has(edge.from)).toBe(true);
            expect(ids.has(edge.to)).toBe(true);
        }
    });

    it('filters by edgeTypes', () => {
        const result = gqFilter({ edgeTypes: ['uses'] });
        expect(result.edges.every((e) => e.type === 'uses')).toBe(true);
    });

    it('returns full graph when no filters provided', () => {
        const result = gqFilter({});
        expect(result.nodeCount).toBe(4);
        expect(result.edgeCount).toBe(3);
    });

    it('returns empty subgraph for unknown nodeTypes', () => {
        const result = gqFilter({ nodeTypes: ['nonexistent'] });
        expect(result.nodeCount).toBe(0);
        expect(result.edgeCount).toBe(0);
    });
});

// ─── brick integration ────────────────────────────────────────────────────────

describe('graphquery brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('graphquery:query', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphquery:node', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphquery:neighbors', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphquery:path', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphquery:filter', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
