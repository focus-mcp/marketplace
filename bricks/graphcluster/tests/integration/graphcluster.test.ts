/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetGraph, setGraph } from '../../src/operations.js';
import { check as checkGcArchitectureHappy } from './scenarios/gc_architecture/happy/invariants.js';
import { check as checkGcClusterHappy } from './scenarios/gc_cluster/happy/invariants.js';
import { check as checkGcCommunitiesHappy } from './scenarios/gc_communities/happy/invariants.js';
import { check as checkGcExplainHappy } from './scenarios/gc_explain/happy/invariants.js';

// 6-node graph with two tightly-connected groups (group A: n1-n2-n3, group B: n4-n5-n6)
// Plus a few cross edges that don't break cluster separation.
// Path-like IDs for gc_architecture (src/ and lib/ prefixes).
const SIX_NODE_GRAPH = {
    nodes: [
        { id: 'src/n1', type: 'file', label: 'SrcN1' },
        { id: 'src/n2', type: 'file', label: 'SrcN2' },
        { id: 'src/n3', type: 'file', label: 'SrcN3' },
        { id: 'lib/n4', type: 'export', label: 'LibN4' },
        { id: 'lib/n5', type: 'export', label: 'LibN5' },
        { id: 'lib/n6', type: 'export', label: 'LibN6' },
    ],
    edges: [
        { from: 'src/n1', to: 'src/n2', type: 'imports' },
        { from: 'src/n2', to: 'src/n3', type: 'imports' },
        { from: 'src/n3', to: 'src/n1', type: 'imports' },
        { from: 'lib/n4', to: 'lib/n5', type: 'calls' },
        { from: 'lib/n5', to: 'lib/n6', type: 'calls' },
        { from: 'lib/n6', to: 'lib/n4', type: 'calls' },
        { from: 'src/n1', to: 'lib/n4', type: 'depends' },
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

// ─── gc_cluster ────────────────────────────────────────────────────────────────

describe('gc_cluster integration', () => {
    it('happy: setGraph(6 nodes, 2 groups) + cluster → clusters non-empty, totalClusters>0', async () => {
        setGraph(SIX_NODE_GRAPH);
        const output = await runTool(brick, 'cluster', {});
        assertInvariants(checkGcClusterHappy(output));
    });
});

// ─── gc_communities ────────────────────────────────────────────────────────────

describe('gc_communities integration', () => {
    it('happy: setGraph(6 nodes) + communities(minSize=2) → communities non-empty, each size>=2', async () => {
        setGraph(SIX_NODE_GRAPH);
        const output = await runTool(brick, 'communities', { minSize: 2 });
        assertInvariants(checkGcCommunitiesHappy(output));
    });
});

// ─── gc_architecture ──────────────────────────────────────────────────────────

describe('gc_architecture integration', () => {
    it('happy: setGraph(src/* + lib/* nodes) + architecture → layers non-empty, valid shape', async () => {
        setGraph(SIX_NODE_GRAPH);
        const output = await runTool(brick, 'architecture', {});
        assertInvariants(checkGcArchitectureHappy(output));
    });
});

// ─── gc_explain ────────────────────────────────────────────────────────────────

describe('gc_explain integration', () => {
    it('happy: setGraph + cluster + explain(clusterId=0) → members non-empty, arrays present', async () => {
        setGraph(SIX_NODE_GRAPH);
        // cluster first to confirm at least 1 cluster exists before explaining
        const clusterOutput = await runTool(brick, 'cluster', {});
        const { totalClusters } = clusterOutput as { totalClusters: number };
        if (totalClusters === 0) throw new Error('Expected at least 1 cluster before explain');
        const output = await runTool(brick, 'explain', { clusterId: 0 });
        assertInvariants(checkGcExplainHappy(output, 0));
    });
});
