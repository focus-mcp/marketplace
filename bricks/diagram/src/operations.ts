// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiagNode {
    readonly id: string;
    readonly label?: string;
}

export interface DiagEdge {
    readonly from: string;
    readonly to: string;
    readonly label?: string;
}

export interface DiagMermaidInput {
    readonly type: string;
    readonly nodes: readonly DiagNode[];
    readonly edges: readonly DiagEdge[];
    readonly direction?: string;
}

export interface DiagMermaidOutput {
    readonly diagram: string;
    readonly type: string;
}

export interface DiagDotNode extends DiagNode {
    readonly shape?: string;
}

export interface DiagDotInput {
    readonly nodes: readonly DiagDotNode[];
    readonly edges: readonly DiagEdge[];
    readonly directed?: boolean;
}

export interface DiagDotOutput {
    readonly diagram: string;
    readonly directed: boolean;
}

export interface DiagAsciiInput {
    readonly nodes: readonly DiagNode[];
    readonly edges: readonly DiagEdge[];
}

export interface DiagAsciiOutput {
    readonly diagram: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nodeLabel(node: DiagNode): string {
    return node.label ?? node.id;
}

// ─── diagMermaid helpers ──────────────────────────────────────────────────────

function mermaidFlowLines(
    nodes: readonly DiagNode[],
    edges: readonly DiagEdge[],
    header: string,
): string[] {
    const lines: string[] = [header];
    for (const node of nodes) lines.push(`    ${node.id}[${nodeLabel(node)}]`);
    for (const edge of edges) {
        const lbl = edge.label ? ` |${edge.label}|` : '';
        lines.push(`    ${edge.from} -->${lbl} ${edge.to}`);
    }
    return lines;
}

function mermaidSequenceLines(nodes: readonly DiagNode[], edges: readonly DiagEdge[]): string[] {
    const lines: string[] = ['sequenceDiagram'];
    for (const node of nodes) lines.push(`    participant ${node.id} as ${nodeLabel(node)}`);
    for (const edge of edges) lines.push(`    ${edge.from}->>+${edge.to}: ${edge.label ?? ''}`);
    return lines;
}

function mermaidClassLines(nodes: readonly DiagNode[], edges: readonly DiagEdge[]): string[] {
    const lines: string[] = ['classDiagram'];
    for (const node of nodes) {
        lines.push(`    class ${node.id} {`);
        if (node.label && node.label !== node.id) lines.push(`        ${node.label}`);
        lines.push('    }');
    }
    for (const edge of edges) {
        const rel = edge.label ? ` : ${edge.label}` : '';
        lines.push(`    ${edge.from} --> ${edge.to}${rel}`);
    }
    return lines;
}

// ─── diagMermaid ─────────────────────────────────────────────────────────────

export function diagMermaid(input: DiagMermaidInput): DiagMermaidOutput {
    const { type, nodes, edges, direction = 'TB' } = input;
    let lines: string[];

    switch (type) {
        case 'sequence':
            lines = mermaidSequenceLines(nodes, edges);
            break;
        case 'classDiagram':
            lines = mermaidClassLines(nodes, edges);
            break;
        case 'graph':
            lines = mermaidFlowLines(nodes, edges, `graph ${direction}`);
            break;
        default:
            lines = mermaidFlowLines(nodes, edges, `flowchart ${direction}`);
    }

    return { diagram: lines.join('\n'), type };
}

// ─── diagDot ─────────────────────────────────────────────────────────────────

export function diagDot(input: DiagDotInput): DiagDotOutput {
    const directed = input.directed !== false;
    const graphType = directed ? 'digraph' : 'graph';
    const arrow = directed ? '->' : '--';
    const lines: string[] = [];

    lines.push(`${graphType} G {`);
    for (const node of input.nodes) {
        const label = nodeLabel(node);
        const shape = (node as DiagDotNode).shape;
        const attrs: string[] = [`label="${label}"`];
        if (shape) attrs.push(`shape=${shape}`);
        lines.push(`    "${node.id}" [${attrs.join(' ')}];`);
    }
    for (const edge of input.edges) {
        const edgeAttr = edge.label ? ` [label="${edge.label}"]` : '';
        lines.push(`    "${edge.from}" ${arrow} "${edge.to}"${edgeAttr};`);
    }
    lines.push('}');

    return { diagram: lines.join('\n'), directed };
}

// ─── diagAscii helpers ────────────────────────────────────────────────────────

function boxLines(text: string): readonly string[] {
    const width = Math.max(text.length, 4);
    const top = `┌${'─'.repeat(width + 2)}┐`;
    const mid = `│ ${text.padEnd(width)} │`;
    const bot = `└${'─'.repeat(width + 2)}┘`;
    return [top, mid, bot] as const;
}

function buildDegrees(edges: readonly DiagEdge[]): {
    outDegree: Map<string, number>;
    inDegree: Map<string, number>;
} {
    const outDegree = new Map<string, number>();
    const inDegree = new Map<string, number>();
    for (const edge of edges) {
        outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
    return { outDegree, inDegree };
}

function renderChain(
    root: DiagNode,
    labelOf: Map<string, string>,
    nextOf: Map<string, string>,
    edgeLabelOf: Map<string, string>,
): string[] {
    const lines: string[] = [];
    let cur: string | undefined = root.id;
    let first = true;
    while (cur !== undefined) {
        const label = labelOf.get(cur) ?? cur;
        if (!first) {
            const prev = [...nextOf.entries()].find(([, v]) => v === cur)?.[0];
            const arrowLabel = prev ? (edgeLabelOf.get(`${prev}:${cur}`) ?? '') : '';
            lines.push(arrowLabel ? `   │ ${arrowLabel}` : '   │');
            lines.push('   ▼');
        }
        for (const l of boxLines(label)) lines.push(l);
        first = false;
        cur = nextOf.get(cur);
    }
    return lines;
}

function renderFallback(
    nodes: readonly DiagNode[],
    edges: readonly DiagEdge[],
    labelOf: Map<string, string>,
): string[] {
    const lines: string[] = [];
    for (const node of nodes) {
        for (const l of boxLines(nodeLabel(node))) lines.push(l);
        lines.push('');
    }
    if (edges.length > 0) {
        lines.push('Edges:');
        for (const edge of edges) {
            const from = labelOf.get(edge.from) ?? edge.from;
            const to = labelOf.get(edge.to) ?? edge.to;
            const lbl = edge.label ? ` [${edge.label}]` : '';
            lines.push(`  ${from} --> ${to}${lbl}`);
        }
    }
    return lines;
}

// ─── diagAscii ───────────────────────────────────────────────────────────────

export function diagAscii(input: DiagAsciiInput): DiagAsciiOutput {
    const { nodes, edges } = input;

    const labelOf = new Map<string, string>();
    for (const node of nodes) labelOf.set(node.id, nodeLabel(node));

    const { outDegree, inDegree } = buildDegrees(edges);
    const isChain =
        nodes.length > 0 &&
        edges.length === nodes.length - 1 &&
        [...outDegree.values()].every((d) => d <= 1) &&
        [...inDegree.values()].every((d) => d <= 1);

    if (isChain && edges.length > 0) {
        const nextOf = new Map<string, string>();
        const edgeLabelOf = new Map<string, string>();
        for (const edge of edges) {
            nextOf.set(edge.from, edge.to);
            if (edge.label) edgeLabelOf.set(`${edge.from}:${edge.to}`, edge.label);
        }
        const targets = new Set(edges.map((e) => e.to));
        const root = nodes.find((n) => !targets.has(n.id));
        if (root) {
            const lines = renderChain(root, labelOf, nextOf, edgeLabelOf);
            return { diagram: lines.join('\n') };
        }
    }

    return { diagram: renderFallback(nodes, edges, labelOf).join('\n') };
}
