// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
    id: string;
    type: string;
    label: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    type: string;
}

export interface GraphState {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// ─── Shared state ────────────────────────────────────────────────────────────

let state: GraphState = { nodes: [], edges: [] };

export function setGraph(s: GraphState): void {
    state = s;
}

export function resetGraph(): void {
    state = { nodes: [], edges: [] };
}

export function getGraph(): GraphState {
    return state;
}

// ─── Input / Output types ────────────────────────────────────────────────────

export interface GcClusterInput {
    readonly maxClusters?: number;
}

export interface ClusterEntry {
    id: number;
    members: string[];
    size: number;
}

export interface GcClusterOutput {
    clusters: ClusterEntry[];
    totalClusters: number;
}

export interface GcCommunitiesInput {
    readonly minSize?: number;
}

export interface CommunityEntry {
    id: number;
    members: string[];
    size: number;
    density: number;
}

export interface GcCommunitiesOutput {
    communities: CommunityEntry[];
}

export interface GcExplainInput {
    readonly clusterId: number;
}

export interface GcExplainOutput {
    clusterId: number;
    members: string[];
    commonTypes: string[];
    hubNodes: string[];
    edgeTypes: string[];
}

export interface ArchitectureLayer {
    name: string;
    nodes: string[];
    dependsOn: string[];
}

export interface GcArchitectureOutput {
    layers: ArchitectureLayer[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) {
        adj.set(n.id, new Set());
    }
    for (const e of edges) {
        adj.get(e.from)?.add(e.to);
        adj.get(e.to)?.add(e.from);
    }
    return adj;
}

function countNeighborLabels(
    neighbors: Set<string>,
    labels: Map<string, string>,
): Map<string, number> {
    const labelCount = new Map<string, number>();
    for (const nb of neighbors) {
        const lbl = labels.get(nb) ?? nb;
        labelCount.set(lbl, (labelCount.get(lbl) ?? 0) + 1);
    }
    return labelCount;
}

function pickBestLabel(
    nodeId: string,
    labelCount: Map<string, number>,
    labels: Map<string, string>,
): string {
    let bestLabel = labels.get(nodeId) ?? nodeId;
    let bestCount = 0;
    for (const [lbl, count] of labelCount) {
        if (count > bestCount) {
            bestCount = count;
            bestLabel = lbl;
        }
    }
    return bestLabel;
}

function updateNodeLabel(
    nodeId: string,
    adj: Map<string, Set<string>>,
    labels: Map<string, string>,
): void {
    const neighbors = adj.get(nodeId) ?? new Set<string>();
    if (neighbors.size === 0) return;
    const labelCount = countNeighborLabels(neighbors, labels);
    labels.set(nodeId, pickBestLabel(nodeId, labelCount, labels));
}

function runLabelPropagation(
    nodes: GraphNode[],
    adj: Map<string, Set<string>>,
    iterations: number,
): Map<string, string> {
    const labels = new Map<string, string>(nodes.map((n) => [n.id, n.id]));

    for (let i = 0; i < iterations; i++) {
        const shuffled = [...nodes].sort(() => Math.random() - 0.5);
        for (const node of shuffled) {
            updateNodeLabel(node.id, adj, labels);
        }
    }

    return labels;
}

function groupByLabel(labels: Map<string, string>): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const [nodeId, lbl] of labels) {
        const existing = groups.get(lbl);
        if (existing) {
            existing.push(nodeId);
        } else {
            groups.set(lbl, [nodeId]);
        }
    }
    return groups;
}

function computeDensity(members: string[], edges: GraphEdge[]): number {
    const memberSet = new Set(members);
    const n = members.length;
    if (n < 2) return 0;
    const possibleEdges = (n * (n - 1)) / 2;
    const internalEdges = edges.filter((e) => memberSet.has(e.from) && memberSet.has(e.to)).length;
    return possibleEdges > 0 ? internalEdges / possibleEdges : 0;
}

function computeDegrees(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
    const degrees = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    for (const e of edges) {
        degrees.set(e.from, (degrees.get(e.from) ?? 0) + 1);
        degrees.set(e.to, (degrees.get(e.to) ?? 0) + 1);
    }
    return degrees;
}

function extractPathPrefix(nodeId: string): string {
    const parts = nodeId.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function collectEdgeTypes(memberSet: Set<string>, edges: GraphEdge[]): string[] {
    const types = new Set<string>();
    for (const e of edges) {
        if (memberSet.has(e.from) && memberSet.has(e.to)) {
            types.add(e.type);
        }
    }
    return [...types];
}

function collectNodeTypes(memberIds: string[], nodes: GraphNode[]): string[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const typeCounts = new Map<string, number>();
    for (const id of memberIds) {
        const t = nodeMap.get(id)?.type ?? 'unknown';
        typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    return [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

function pickHubNodes(memberIds: string[], degrees: Map<string, number>, topN: number): string[] {
    return [...memberIds]
        .sort((a, b) => (degrees.get(b) ?? 0) - (degrees.get(a) ?? 0))
        .slice(0, topN);
}

function limitClusters(groups: Map<string, string[]>, maxClusters: number): ClusterEntry[] {
    const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
    return sorted.slice(0, maxClusters).map((members, idx) => ({
        id: idx,
        members,
        size: members.length,
    }));
}

// ─── gcCluster ───────────────────────────────────────────────────────────────

export function gcCluster(input: GcClusterInput): GcClusterOutput {
    const { nodes, edges } = state;
    const maxClusters = input.maxClusters ?? 10;

    if (nodes.length === 0) {
        return { clusters: [], totalClusters: 0 };
    }

    const adj = buildAdjacency(nodes, edges);
    const labels = runLabelPropagation(nodes, adj, 10);
    const groups = groupByLabel(labels);
    const clusters = limitClusters(groups, maxClusters);

    return { clusters, totalClusters: clusters.length };
}

// ─── gcCommunities ───────────────────────────────────────────────────────────

export function gcCommunities(input: GcCommunitiesInput): GcCommunitiesOutput {
    const { nodes, edges } = state;
    const minSize = input.minSize ?? 2;

    if (nodes.length === 0) {
        return { communities: [] };
    }

    const adj = buildAdjacency(nodes, edges);
    const labels = runLabelPropagation(nodes, adj, 10);
    const groups = groupByLabel(labels);

    const communities: CommunityEntry[] = [];
    let idx = 0;
    for (const members of groups.values()) {
        if (members.length < minSize) continue;
        const density = computeDensity(members, edges);
        communities.push({ id: idx, members, size: members.length, density });
        idx++;
    }

    communities.sort((a, b) => b.size - a.size);
    return { communities };
}

// ─── gcExplain ───────────────────────────────────────────────────────────────

export function gcExplain(input: GcExplainInput): GcExplainOutput {
    const { nodes, edges } = state;
    const { clusterId } = input;

    const adj = buildAdjacency(nodes, edges);
    const labels = runLabelPropagation(nodes, adj, 10);
    const groups = groupByLabel(labels);
    const sorted = [...groups.values()].sort((a, b) => b.length - a.length);

    const members = sorted[clusterId] ?? [];
    const memberSet = new Set(members);
    const degrees = computeDegrees(nodes, edges);

    const commonTypes = collectNodeTypes(members, nodes);
    const hubNodes = pickHubNodes(members, degrees, 3);
    const edgeTypes = collectEdgeTypes(memberSet, edges);

    return { clusterId, members, commonTypes, hubNodes, edgeTypes };
}

// ─── gcArchitecture ──────────────────────────────────────────────────────────

function groupNodesByPrefix(nodes: GraphNode[]): Map<string, string[]> {
    const byPrefix = new Map<string, string[]>();
    for (const n of nodes) {
        const prefix = extractPathPrefix(n.id);
        const key = prefix === '' ? '(root)' : prefix;
        const existing = byPrefix.get(key);
        if (existing) {
            existing.push(n.id);
        } else {
            byPrefix.set(key, [n.id]);
        }
    }
    return byPrefix;
}

function detectLayerDependencies(
    layerName: string,
    nodeSet: Set<string>,
    edges: GraphEdge[],
    byPrefix: Map<string, string[]>,
): string[] {
    const deps = new Set<string>();
    for (const e of edges) {
        if (nodeSet.has(e.from) && !nodeSet.has(e.to)) {
            const targetPrefix = extractPathPrefix(e.to);
            const targetKey = targetPrefix === '' ? '(root)' : targetPrefix;
            if (targetKey !== layerName && byPrefix.has(targetKey)) {
                deps.add(targetKey);
            }
        }
    }
    return [...deps];
}

export function gcArchitecture(): GcArchitectureOutput {
    const { nodes, edges } = state;

    if (nodes.length === 0) {
        return { layers: [] };
    }

    const byPrefix = groupNodesByPrefix(nodes);
    const layers: ArchitectureLayer[] = [];

    for (const [layerName, layerNodes] of byPrefix) {
        const nodeSet = new Set(layerNodes);
        const dependsOn = detectLayerDependencies(layerName, nodeSet, edges, byPrefix);
        layers.push({ name: layerName, nodes: layerNodes, dependsOn });
    }

    layers.sort((a, b) => b.nodes.length - a.nodes.length);
    return { layers };
}
