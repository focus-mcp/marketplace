// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
    id: string;
    type: string;
    label: string;
    file?: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    type: string;
}

export interface GbBuildInput {
    readonly dir: string;
    readonly maxFiles?: number;
}

export interface GbBuildOutput {
    nodeCount: number;
    edgeCount: number;
    files: number;
}

export interface GbUpdateInput {
    readonly files: readonly string[];
}

export interface GbUpdateOutput {
    updated: number;
    nodeCount: number;
    edgeCount: number;
}

export interface GbWatchOutput {
    totalNodes: number;
    totalEdges: number;
    staleNodes: string[];
}

export interface GbAddNodeInput {
    id: string;
    type: string;
    label: string;
}

export interface GbAddEdgeInput {
    from: string;
    to: string;
    type: string;
}

export interface GbAddInput {
    readonly node?: GbAddNodeInput;
    readonly edge?: GbAddEdgeInput;
}

export interface GbAddOutput {
    added: 'node' | 'edge';
    id: string;
}

export type GbMultimodalFormat = 'summary' | 'nodes' | 'edges' | 'full';

export interface GbMultimodalInput {
    readonly format?: string;
}

export interface GbSummaryOutput {
    format: 'summary';
    nodeCount: number;
    edgeCount: number;
    sourceDir: string | null;
}

export interface GbNodesOutput {
    format: 'nodes';
    nodes: GraphNode[];
}

export interface GbEdgesOutput {
    format: 'edges';
    edges: GraphEdge[];
}

export interface GbFullOutput {
    format: 'full';
    nodes: GraphNode[];
    edges: GraphEdge[];
    sourceDir: string | null;
}

export type GbMultimodalOutput = GbSummaryOutput | GbNodesOutput | GbEdgesOutput | GbFullOutput;

// ─── In-memory graph state ────────────────────────────────────────────────────

const nodes = new Map<string, GraphNode>();
const edges: GraphEdge[] = [];
let sourceDir: string | null = null;

export function resetGraph(): void {
    nodes.clear();
    edges.length = 0;
    sourceDir = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
const rImport = /^(?:import|export)\s+.*\s+from\s+['"]([^'"]+)['"]/;
const rExport =
    /^export\s+(?:(?:default|abstract)\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/;

async function collectFiles(dir: string, results: string[], max: number): Promise<void> {
    if (results.length >= max) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (results.length >= max) break;
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, results, max);
        } else if (SUPPORTED_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

interface FileAnalysis {
    imports: string[];
    exports: string[];
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return { imports: [], exports: [] };
    try {
        const content = await fh.readFile('utf-8');
        const fileDir = dirname(filePath);
        const imports: string[] = [];
        const exports: string[] = [];
        for (const line of content.split('\n')) {
            const mImp = rImport.exec(line);
            if (mImp?.[1]?.startsWith('.')) {
                imports.push(resolve(fileDir, mImp[1]));
            }
            const mExp = rExport.exec(line);
            if (mExp?.[1]) {
                exports.push(mExp[1]);
            }
        }
        return { imports, exports };
    } finally {
        await fh.close();
    }
}

function addNode(node: GraphNode): void {
    nodes.set(node.id, node);
}

function addEdge(edge: GraphEdge): void {
    edges.push(edge);
}

function removeNodesForFile(filePath: string): void {
    for (const [id, node] of nodes) {
        if (node.file === filePath || id === filePath) {
            nodes.delete(id);
        }
    }
}

function removeEdgesForFile(filePath: string): void {
    const toRemove = new Set<number>();
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (edge?.from === filePath || edge?.to === filePath) {
            toRemove.add(i);
        }
    }
    for (let i = edges.length - 1; i >= 0; i--) {
        if (toRemove.has(i)) {
            edges.splice(i, 1);
        }
    }
}

function ingestFileAnalysis(filePath: string, analysis: FileAnalysis): void {
    addNode({ id: filePath, type: 'file', label: filePath });

    for (const exportName of analysis.exports) {
        const nodeId = `${filePath}#${exportName}`;
        addNode({ id: nodeId, type: 'export', label: exportName, file: filePath });
        addEdge({ from: filePath, to: nodeId, type: 'exports' });
    }

    for (const importPath of analysis.imports) {
        addEdge({ from: filePath, to: importPath, type: 'imports' });
    }
}

// ─── gbBuild ─────────────────────────────────────────────────────────────────

export async function gbBuild(input: GbBuildInput): Promise<GbBuildOutput> {
    const dir = resolve(input.dir);
    const max = input.maxFiles ?? 200;

    nodes.clear();
    edges.length = 0;
    sourceDir = dir;

    const files: string[] = [];
    await collectFiles(dir, files, max);

    for (const filePath of files) {
        const analysis = await analyzeFile(filePath);
        ingestFileAnalysis(filePath, analysis);
    }

    return { nodeCount: nodes.size, edgeCount: edges.length, files: files.length };
}

// ─── gbUpdate ────────────────────────────────────────────────────────────────

export async function gbUpdate(input: GbUpdateInput): Promise<GbUpdateOutput> {
    let updated = 0;

    for (const rawPath of input.files) {
        const filePath = resolve(rawPath);
        removeNodesForFile(filePath);
        removeEdgesForFile(filePath);
        const analysis = await analyzeFile(filePath);
        ingestFileAnalysis(filePath, analysis);
        updated++;
    }

    return { updated, nodeCount: nodes.size, edgeCount: edges.length };
}

// ─── gbWatch ─────────────────────────────────────────────────────────────────

export async function gbWatch(): Promise<GbWatchOutput> {
    const staleNodes: string[] = [];

    for (const [id, node] of nodes) {
        if (node.type !== 'file') continue;
        const exists = await stat(id)
            .then(() => true)
            .catch(() => false);
        if (!exists) {
            staleNodes.push(id);
        }
    }

    return { totalNodes: nodes.size, totalEdges: edges.length, staleNodes };
}

// ─── gbAdd ───────────────────────────────────────────────────────────────────

export function gbAdd(input: GbAddInput): GbAddOutput {
    if (input.node !== undefined) {
        const { id, type, label } = input.node;
        addNode({ id, type, label });
        return { added: 'node', id };
    }
    if (input.edge !== undefined) {
        const { from, to, type } = input.edge;
        addEdge({ from, to, type });
        return { added: 'edge', id: `${from}->${to}` };
    }
    throw new Error('Either node or edge must be provided');
}

// ─── gbMultimodal ────────────────────────────────────────────────────────────

export function gbMultimodal(input: GbMultimodalInput): GbMultimodalOutput {
    const format = (input.format ?? 'summary') as GbMultimodalFormat;

    if (format === 'nodes') {
        return { format: 'nodes', nodes: [...nodes.values()] };
    }
    if (format === 'edges') {
        return { format: 'edges', edges: [...edges] };
    }
    if (format === 'full') {
        return { format: 'full', nodes: [...nodes.values()], edges: [...edges], sourceDir };
    }
    return { format: 'summary', nodeCount: nodes.size, edgeCount: edges.length, sourceDir };
}
