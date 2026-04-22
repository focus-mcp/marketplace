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

export interface GqQueryInput {
    readonly pattern: string;
    readonly type?: string;
    readonly limit?: number;
}

export interface GqQueryResult {
    id: string;
    type: string;
    label: string;
}

export interface GqQueryOutput {
    results: GqQueryResult[];
    count: number;
}

export interface GqNodeInput {
    readonly id: string;
}

export interface GqNodeFound {
    node: GraphNode;
    inEdges: GraphEdge[];
    outEdges: GraphEdge[];
}

export interface GqNodeNotFound {
    error: string;
}

export type GqNodeOutput = GqNodeFound | GqNodeNotFound;

export interface GqNeighborsInput {
    readonly id: string;
    readonly direction?: string;
    readonly edgeType?: string;
}

export interface NeighborEntry {
    id: string;
    type: string;
    label: string;
    edgeType: string;
    direction: 'in' | 'out';
}

export interface GqNeighborsOutput {
    neighbors: NeighborEntry[];
}

export interface GqPathInput {
    readonly from: string;
    readonly to: string;
    readonly maxDepth?: number;
}

export interface GqPathFound {
    path: string[];
    length: number;
}

export interface GqPathNotFound {
    found: false;
}

export type GqPathOutput = GqPathFound | GqPathNotFound;

export interface GqFilterInput {
    readonly nodeTypes?: string[];
    readonly edgeTypes?: string[];
}

export interface GqFilterOutput {
    nodes: GraphNode[];
    edges: GraphEdge[];
    nodeCount: number;
    edgeCount: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const nodes: Map<string, GraphNode> = new Map();
const edges: GraphEdge[] = [];

export function getNodes(): Map<string, GraphNode> {
    return nodes;
}

export function getEdges(): GraphEdge[] {
    return edges;
}

export function setGraph(newNodes: Map<string, GraphNode>, newEdges: GraphEdge[]): void {
    nodes.clear();
    for (const [id, node] of newNodes) {
        nodes.set(id, node);
    }
    edges.length = 0;
    for (const edge of newEdges) {
        edges.push(edge);
    }
}

export function resetGraph(): void {
    nodes.clear();
    edges.length = 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesPattern(label: string, pattern: string): boolean {
    return label.toLowerCase().includes(pattern.toLowerCase());
}

function resolveDirection(raw: string | undefined): 'in' | 'out' | 'both' {
    if (raw === 'in' || raw === 'out') return raw;
    return 'both';
}

function collectOutEdges(id: string): GraphEdge[] {
    return edges.filter((e) => e.from === id);
}

function collectInEdges(id: string): GraphEdge[] {
    return edges.filter((e) => e.to === id);
}

function buildNeighborEntry(
    nodeId: string,
    edgeType: string,
    direction: 'in' | 'out',
): NeighborEntry | undefined {
    const n = nodes.get(nodeId);
    if (!n) return undefined;
    return { id: n.id, type: n.type, label: n.label, edgeType, direction };
}

// ─── gqQuery ─────────────────────────────────────────────────────────────────

export function gqQuery(input: GqQueryInput): GqQueryOutput {
    const limit = input.limit ?? 20;
    const results: GqQueryResult[] = [];

    for (const node of nodes.values()) {
        if (!matchesPattern(node.label, input.pattern)) continue;
        if (input.type !== undefined && node.type !== input.type) continue;
        results.push({ id: node.id, type: node.type, label: node.label });
        if (results.length >= limit) break;
    }

    return { results, count: results.length };
}

// ─── gqNode ──────────────────────────────────────────────────────────────────

export function gqNode(input: GqNodeInput): GqNodeOutput {
    const node = nodes.get(input.id);
    if (!node) return { error: `Node not found: ${input.id}` };

    const outEdges = collectOutEdges(input.id);
    const inEdges = collectInEdges(input.id);

    return { node, inEdges, outEdges };
}

// ─── gqNeighbors ─────────────────────────────────────────────────────────────

function collectDirectional(
    id: string,
    dir: 'in' | 'out',
    edgeType: string | undefined,
): NeighborEntry[] {
    const rawEdges = dir === 'out' ? collectOutEdges(id) : collectInEdges(id);
    const results: NeighborEntry[] = [];
    for (const edge of rawEdges) {
        if (edgeType !== undefined && edge.type !== edgeType) continue;
        const targetId = dir === 'out' ? edge.to : edge.from;
        const entry = buildNeighborEntry(targetId, edge.type, dir);
        if (entry) results.push(entry);
    }
    return results;
}

export function gqNeighbors(input: GqNeighborsInput): GqNeighborsOutput {
    const direction = resolveDirection(input.direction);
    const neighbors: NeighborEntry[] = [];

    if (direction === 'out' || direction === 'both') {
        neighbors.push(...collectDirectional(input.id, 'out', input.edgeType));
    }
    if (direction === 'in' || direction === 'both') {
        neighbors.push(...collectDirectional(input.id, 'in', input.edgeType));
    }

    return { neighbors };
}

// ─── gqPath ──────────────────────────────────────────────────────────────────

function bfsPath(fromId: string, toId: string, maxDepth: number): string[] | null {
    if (fromId === toId) return [fromId];

    const visited = new Set<string>([fromId]);
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const { id, path } = item;

        if (path.length > maxDepth) continue;

        const nextIds = edges.filter((e) => e.from === id).map((e) => e.to);

        for (const nextId of nextIds) {
            if (visited.has(nextId)) continue;
            const nextPath = [...path, nextId];
            if (nextId === toId) return nextPath;
            visited.add(nextId);
            queue.push({ id: nextId, path: nextPath });
        }
    }

    return null;
}

export function gqPath(input: GqPathInput): GqPathOutput {
    const maxDepth = input.maxDepth ?? 5;
    const result = bfsPath(input.from, input.to, maxDepth);

    if (!result) return { found: false };
    return { path: result, length: result.length - 1 };
}

// ─── gqFilter ────────────────────────────────────────────────────────────────

export function gqFilter(input: GqFilterInput): GqFilterOutput {
    const filteredNodes =
        input.nodeTypes !== undefined
            ? [...nodes.values()].filter((n) => (input.nodeTypes ?? []).includes(n.type))
            : [...nodes.values()];

    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = edges.filter((e) => {
        const typeOk =
            input.edgeTypes !== undefined ? (input.edgeTypes ?? []).includes(e.type) : true;
        return typeOk && nodeIds.has(e.from) && nodeIds.has(e.to);
    });

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
    };
}
