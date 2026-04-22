// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    gcArchitecture,
    gcCluster,
    gcCommunities,
    gcExplain,
    resetGraph,
    setGraph,
} from './operations.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const twoClusterGraph = {
    nodes: [
        { id: 'a/util', type: 'file', label: 'util' },
        { id: 'a/helper', type: 'file', label: 'helper' },
        { id: 'a/core', type: 'file', label: 'core' },
        { id: 'b/service', type: 'service', label: 'service' },
        { id: 'b/repo', type: 'service', label: 'repo' },
        { id: 'b/model', type: 'service', label: 'model' },
    ],
    edges: [
        { from: 'a/util', to: 'a/helper', type: 'imports' },
        { from: 'a/helper', to: 'a/core', type: 'imports' },
        { from: 'a/core', to: 'a/util', type: 'imports' },
        { from: 'b/service', to: 'b/repo', type: 'calls' },
        { from: 'b/repo', to: 'b/model', type: 'calls' },
        { from: 'b/model', to: 'b/service', type: 'calls' },
    ],
};

const isolatedGraph = {
    nodes: [
        { id: 'x', type: 'file', label: 'x' },
        { id: 'y', type: 'file', label: 'y' },
    ],
    edges: [],
};

beforeEach(() => {
    resetGraph();
});

afterEach(() => {
    resetGraph();
});

// ─── gcCluster ───────────────────────────────────────────────────────────────

describe('gcCluster', () => {
    it('returns empty when graph is empty', () => {
        const result = gcCluster({});
        expect(result.clusters).toHaveLength(0);
        expect(result.totalClusters).toBe(0);
    });

    it('detects at least 1 cluster from a connected graph', () => {
        setGraph(twoClusterGraph);
        const result = gcCluster({});
        expect(result.totalClusters).toBeGreaterThanOrEqual(1);
        expect(result.clusters.every((c) => c.size > 0)).toBe(true);
    });

    it('respects maxClusters limit', () => {
        setGraph(twoClusterGraph);
        const result = gcCluster({ maxClusters: 1 });
        expect(result.clusters.length).toBeLessThanOrEqual(1);
    });

    it('each cluster member is a known node id', () => {
        setGraph(twoClusterGraph);
        const knownIds = new Set(twoClusterGraph.nodes.map((n) => n.id));
        const result = gcCluster({});
        for (const cluster of result.clusters) {
            for (const m of cluster.members) {
                expect(knownIds.has(m)).toBe(true);
            }
        }
    });

    it('all nodes are covered across clusters', () => {
        setGraph(twoClusterGraph);
        const result = gcCluster({ maxClusters: 10 });
        const covered = new Set(result.clusters.flatMap((c) => c.members));
        for (const n of twoClusterGraph.nodes) {
            expect(covered.has(n.id)).toBe(true);
        }
    });
});

// ─── gcCommunities ───────────────────────────────────────────────────────────

describe('gcCommunities', () => {
    it('returns empty when graph is empty', () => {
        const result = gcCommunities({});
        expect(result.communities).toHaveLength(0);
    });

    it('filters by minSize', () => {
        setGraph(twoClusterGraph);
        const result = gcCommunities({ minSize: 3 });
        expect(result.communities.every((c) => c.size >= 3)).toBe(true);
    });

    it('computes density between 0 and 1', () => {
        setGraph(twoClusterGraph);
        const result = gcCommunities({ minSize: 2 });
        for (const c of result.communities) {
            expect(c.density).toBeGreaterThanOrEqual(0);
            expect(c.density).toBeLessThanOrEqual(1);
        }
    });

    it('isolated graph with minSize 2 returns no communities', () => {
        setGraph(isolatedGraph);
        const result = gcCommunities({ minSize: 2 });
        expect(result.communities).toHaveLength(0);
    });
});

// ─── gcExplain ───────────────────────────────────────────────────────────────

describe('gcExplain', () => {
    it('returns explain for cluster 0', () => {
        setGraph(twoClusterGraph);
        const result = gcExplain({ clusterId: 0 });
        expect(result.clusterId).toBe(0);
        expect(result.members.length).toBeGreaterThan(0);
        expect(Array.isArray(result.commonTypes)).toBe(true);
        expect(Array.isArray(result.hubNodes)).toBe(true);
        expect(Array.isArray(result.edgeTypes)).toBe(true);
    });

    it('returns empty members for out-of-range clusterId', () => {
        setGraph(twoClusterGraph);
        const result = gcExplain({ clusterId: 999 });
        expect(result.members).toHaveLength(0);
    });

    it('hubNodes length is at most 3', () => {
        setGraph(twoClusterGraph);
        const result = gcExplain({ clusterId: 0 });
        expect(result.hubNodes.length).toBeLessThanOrEqual(3);
    });
});

// ─── gcArchitecture ──────────────────────────────────────────────────────────

describe('gcArchitecture', () => {
    it('returns empty when graph is empty', () => {
        const result = gcArchitecture();
        expect(result.layers).toHaveLength(0);
    });

    it('groups nodes by directory prefix', () => {
        setGraph(twoClusterGraph);
        const result = gcArchitecture();
        const layerNames = result.layers.map((l) => l.name);
        expect(layerNames).toContain('a');
        expect(layerNames).toContain('b');
    });

    it('detects cross-layer dependencies', () => {
        const crossGraph = {
            nodes: [
                { id: 'core/util', type: 'file', label: 'util' },
                { id: 'api/handler', type: 'file', label: 'handler' },
            ],
            edges: [{ from: 'api/handler', to: 'core/util', type: 'imports' }],
        };
        setGraph(crossGraph);
        const result = gcArchitecture();
        const apiLayer = result.layers.find((l) => l.name === 'api');
        expect(apiLayer?.dependsOn).toContain('core');
    });

    it('layers have non-empty nodes arrays', () => {
        setGraph(twoClusterGraph);
        const result = gcArchitecture();
        for (const layer of result.layers) {
            expect(layer.nodes.length).toBeGreaterThan(0);
        }
    });
});

// ─── brick lifecycle ─────────────────────────────────────────────────────────

describe('graphcluster brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('graphcluster:cluster', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphcluster:communities', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphcluster:explain', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphcluster:architecture', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
