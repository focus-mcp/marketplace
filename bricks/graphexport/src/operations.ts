// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Shared graph state ───────────────────────────────────────────────────────

export interface GraphNode {
    readonly id: string;
    readonly label: string;
    readonly type: string;
}

export interface GraphEdge {
    readonly from: string;
    readonly to: string;
    readonly type: string;
}

/** Inline graph payload accepted by ge_input and all export tools via the optional `graph` param. */
export interface GraphJson {
    readonly nodes: readonly GraphNode[];
    readonly edges: readonly GraphEdge[];
}

export const nodes: Map<string, GraphNode> = new Map();
export const edges: GraphEdge[] = [];

export function setGraph(newNodes: GraphNode[], newEdges: GraphEdge[]): void {
    nodes.clear();
    for (const n of newNodes) nodes.set(n.id, n);
    edges.length = 0;
    edges.push(...newEdges);
}

export function resetGraph(): void {
    nodes.clear();
    edges.length = 0;
}

// ─── geInput — load an inline graph into ambient state ───────────────────────

export interface GeInputInput {
    readonly graph: GraphJson;
}

export interface GeInputOutput {
    readonly loaded: true;
    readonly nodeCount: number;
    readonly edgeCount: number;
}

/**
 * Load an inline graph (nodes + edges JSON) into the ambient state so that
 * subsequent export tools can use it without requiring an upstream graphbuild
 * or callgraph brick.
 */
export function geInput(input: GeInputInput): GeInputOutput {
    setGraph([...input.graph.nodes] as GraphNode[], [...input.graph.edges] as GraphEdge[]);
    return { loaded: true, nodeCount: nodes.size, edgeCount: edges.length };
}

// ─── Helpers to resolve graph from optional inline payload or ambient state ───

function resolveNodes(graph?: GraphJson): readonly GraphNode[] {
    if (graph) return graph.nodes;
    return [...nodes.values()];
}

function resolveEdges(graph?: GraphJson): readonly GraphEdge[] {
    if (graph) return graph.edges;
    return edges;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface GeHtmlInput {
    readonly title?: string;
    readonly graph?: GraphJson;
}

export interface GeMermaidInput {
    readonly direction?: string;
    readonly graph?: GraphJson;
}

export interface GeGraphmlInput {
    readonly graph?: GraphJson;
}

export interface GeCypherInput {
    readonly graph?: GraphJson;
}

export interface GeObsidianInput {
    readonly graph?: GraphJson;
}

export interface GeWikiInput {
    readonly graph?: GraphJson;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

const CIRCLE_RADIUS = 20;
const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;
const NODE_SPREAD_X = 120;
const NODE_SPREAD_Y = 100;
const SVG_OFFSET_X = 60;
const SVG_OFFSET_Y = 60;

interface NodePosition {
    readonly x: number;
    readonly y: number;
}

function computeNodePositions(nodeList: GraphNode[]): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)));
    nodeList.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.set(node.id, {
            x: SVG_OFFSET_X + col * NODE_SPREAD_X,
            y: SVG_OFFSET_Y + row * NODE_SPREAD_Y,
        });
    });
    return positions;
}

function renderSvgEdges(edgeList: GraphEdge[], positions: Map<string, NodePosition>): string {
    return edgeList
        .map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return '';
            const fx = from.x;
            const fy = from.y;
            const tx = to.x;
            const ty = to.y;
            return `  <line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="#999" stroke-width="1.5" marker-end="url(#arrow)"/>`;
        })
        .filter(Boolean)
        .join('\n');
}

function renderSvgNodes(nodeList: GraphNode[], positions: Map<string, NodePosition>): string {
    return nodeList
        .map((node) => {
            const pos = positions.get(node.id);
            const x = pos?.x ?? 0;
            const y = pos?.y ?? 0;
            return [
                `  <circle cx="${x}" cy="${y}" r="${CIRCLE_RADIUS}" fill="#4f9cf9" stroke="#2563eb" stroke-width="1.5"/>`,
                `  <text x="${x}" y="${y + CIRCLE_RADIUS + 14}" text-anchor="middle" font-size="11" fill="#222">${node.label}</text>`,
            ].join('\n');
        })
        .join('\n');
}

const SVG_DEFS = `  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#999"/>
    </marker>
  </defs>`;

// ─── geHtml ───────────────────────────────────────────────────────────────────

export function geHtml(input: GeHtmlInput): string {
    const title = input.title ?? 'Knowledge Graph';
    const nodeList = [...resolveNodes(input.graph)];
    const edgeList = [...resolveEdges(input.graph)];
    const positions = computeNodePositions(nodeList);
    const svgEdges = renderSvgEdges(edgeList, positions);
    const svgNodes = renderSvgNodes(nodeList, positions);

    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        `  <meta charset="UTF-8"/>`,
        `  <title>${title}</title>`,
        '  <style>body{font-family:sans-serif;margin:0;background:#f8fafc;}h1{padding:1rem;color:#1e293b;}</style>',
        '</head>',
        '<body>',
        `  <h1>${title}</h1>`,
        `  <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`,
        SVG_DEFS,
        svgEdges,
        svgNodes,
        '  </svg>',
        '</body>',
        '</html>',
    ].join('\n');
}

// ─── geMermaid ────────────────────────────────────────────────────────────────

const ALLOWED_DIRECTIONS = new Set(['TB', 'LR', 'BT', 'RL']);

function sanitizeMermaidId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function geMermaid(input: GeMermaidInput): string {
    const rawDir = input.direction ?? 'TB';
    const dir = ALLOWED_DIRECTIONS.has(rawDir) ? rawDir : 'TB';
    const lines: string[] = [`flowchart ${dir}`];

    for (const node of resolveNodes(input.graph)) {
        const safeId = sanitizeMermaidId(node.id);
        lines.push(`  ${safeId}["${node.label}"]`);
    }

    for (const edge of resolveEdges(input.graph)) {
        const fromId = sanitizeMermaidId(edge.from);
        const toId = sanitizeMermaidId(edge.to);
        lines.push(`  ${fromId} -->|${edge.type}| ${toId}`);
    }

    return lines.join('\n');
}

// ─── geGraphml ────────────────────────────────────────────────────────────────

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderGraphmlNodes(nodeList: readonly GraphNode[]): string {
    return [...nodeList]
        .map((node) =>
            [
                `    <node id="${xmlEscape(node.id)}">`,
                `      <data key="label">${xmlEscape(node.label)}</data>`,
                `      <data key="type">${xmlEscape(node.type)}</data>`,
                `    </node>`,
            ].join('\n'),
        )
        .join('\n');
}

function renderGraphmlEdges(edgeList: readonly GraphEdge[]): string {
    return [...edgeList]
        .map((edge, i) =>
            [
                `    <edge id="e${i}" source="${xmlEscape(edge.from)}" target="${xmlEscape(edge.to)}">`,
                `      <data key="type">${xmlEscape(edge.type)}</data>`,
                `    </edge>`,
            ].join('\n'),
        )
        .join('\n');
}

const GRAPHML_HEADER = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/graphml">',
    '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
    '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
    '  <key id="type" for="edge" attr.name="type" attr.type="string"/>',
    '  <graph id="G" edgedefault="directed">',
].join('\n');

export function geGraphml(input: GeGraphmlInput = {}): string {
    return [
        GRAPHML_HEADER,
        renderGraphmlNodes(resolveNodes(input.graph)),
        renderGraphmlEdges(resolveEdges(input.graph)),
        '  </graph>',
        '</graphml>',
    ].join('\n');
}

// ─── geCypher ────────────────────────────────────────────────────────────────

function cypherEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function renderCypherNodes(nodeList: readonly GraphNode[]): string[] {
    return [...nodeList].map(
        (node) =>
            `CREATE (n_${sanitizeMermaidId(node.id)}:${node.type} {id: '${cypherEscape(node.id)}', label: '${cypherEscape(node.label)}'})`,
    );
}

function renderCypherEdges(edgeList: readonly GraphEdge[]): string[] {
    return [...edgeList].map((edge) => {
        const fromVar = `n_${sanitizeMermaidId(edge.from)}`;
        const toVar = `n_${sanitizeMermaidId(edge.to)}`;
        const relType = edge.type.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        return `CREATE (${fromVar})-[:${relType}]->(${toVar})`;
    });
}

export function geCypher(input: GeCypherInput = {}): string {
    return [
        ...renderCypherNodes(resolveNodes(input.graph)),
        ...renderCypherEdges(resolveEdges(input.graph)),
    ].join('\n');
}

// ─── geObsidian ───────────────────────────────────────────────────────────────

function getNeighborLabels(
    nodeId: string,
    edgeList: readonly GraphEdge[],
    nodeMap: ReadonlyMap<string, GraphNode>,
): string[] {
    const neighborIds = edgeList
        .filter((e) => e.from === nodeId || e.to === nodeId)
        .map((e) => (e.from === nodeId ? e.to : e.from));
    return neighborIds.map((id) => nodeMap.get(id)?.label ?? id);
}

function renderObsidianFile(
    node: GraphNode,
    edgeList: readonly GraphEdge[],
    nodeMap: ReadonlyMap<string, GraphNode>,
): string {
    const neighborLabels = getNeighborLabels(node.id, edgeList, nodeMap);
    const linksSection =
        neighborLabels.length > 0
            ? neighborLabels.map((label) => `- [[${label}]]`).join('\n')
            : '_No connections._';

    return [`# ${node.label}`, `Type: ${node.type}`, '', '## Links', linksSection].join('\n');
}

export function geObsidian(input: GeObsidianInput = {}): Record<string, string> {
    const nodeList = resolveNodes(input.graph);
    const edgeList = resolveEdges(input.graph);
    const nodeMap: Map<string, GraphNode> = new Map(nodeList.map((n) => [n.id, n]));
    const files: Record<string, string> = {};
    for (const node of nodeList) {
        const filename = `${node.label.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
        files[filename] = renderObsidianFile(node, edgeList, nodeMap);
    }
    return files;
}

// ─── geWiki ──────────────────────────────────────────────────────────────────

function getOutgoingEdges(nodeId: string, edgeList: readonly GraphEdge[]): GraphEdge[] {
    return [...edgeList].filter((e) => e.from === nodeId);
}

function getIncomingEdges(nodeId: string, edgeList: readonly GraphEdge[]): GraphEdge[] {
    return [...edgeList].filter((e) => e.to === nodeId);
}

function renderWikiSection(
    node: GraphNode,
    edgeList: readonly GraphEdge[],
    nodeMap: ReadonlyMap<string, GraphNode>,
): string {
    const outgoing = getOutgoingEdges(node.id, edgeList);
    const incoming = getIncomingEdges(node.id, edgeList);

    const outLines =
        outgoing.length > 0
            ? outgoing
                  .map((e) => {
                      const target = nodeMap.get(e.to)?.label ?? e.to;
                      return `- —[${e.type}]→ **${target}**`;
                  })
                  .join('\n')
            : '_No outgoing connections._';

    const inLines =
        incoming.length > 0
            ? incoming
                  .map((e) => {
                      const source = nodeMap.get(e.from)?.label ?? e.from;
                      return `- **${source}** —[${e.type}]→`;
                  })
                  .join('\n')
            : '_No incoming connections._';

    return [
        `## ${node.label}`,
        '',
        `**Type:** ${node.type}  `,
        `**ID:** \`${node.id}\``,
        '',
        '### Outgoing',
        outLines,
        '',
        '### Incoming',
        inLines,
    ].join('\n');
}

export function geWiki(input: GeWikiInput = {}): string {
    const nodeList = resolveNodes(input.graph);
    const edgeList = resolveEdges(input.graph);
    const nodeMap: Map<string, GraphNode> = new Map(nodeList.map((n) => [n.id, n]));
    const sections = [...nodeList].map((n) => renderWikiSection(n, edgeList, nodeMap));
    return ['# Knowledge Graph', '', ...sections].join('\n\n');
}
