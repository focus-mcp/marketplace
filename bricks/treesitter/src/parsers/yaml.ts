// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for YAML.
 * Handles: .yaml .yml
 *
 * Grammar: @tree-sitter-grammars/tree-sitter-yaml (community package — not bundled in @vscode/tree-sitter-wasm).
 * Extracts top-level mapping keys as 'variable' symbols (useful for k8s manifests,
 * GitHub Actions workflows, OpenAPI specs, docker-compose, etc.).
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
// Resolve the wasm file directly — robust under any CWD or Vitest mode
const YAML_WASM_PATH: string = _require.resolve(
    '@tree-sitter-grammars/tree-sitter-yaml/tree-sitter-yaml.wasm',
);

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function row(node: TsNode): number {
    return node.startPosition.row + 1;
}
function endRow(node: TsNode): number {
    return node.endPosition.row + 1;
}
function firstLine(node: TsNode): string {
    const text = node.text;
    const nl = text.indexOf('\n');
    return (nl === -1 ? text : text.slice(0, nl)).trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// Symbol extraction — top-level mapping keys
// ──────────────────────────────────────────────────────────────────────────────

function extractTopLevelKeys(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    // Walk direct children of root (stream → document → block_node → block_mapping)
    for (const child of root.children) {
        if (child.type === 'document') extractDocumentKeys(child, filePath, symbols);
    }
    return symbols;
}

const SCALAR_TYPES = new Set([
    'flow_node',
    'plain_scalar',
    'double_quote_scalar',
    'single_quote_scalar',
]);

const PAIR_TYPES = new Set(['block_mapping_pair', 'flow_pair']);
const MAPPING_TYPES = new Set(['block_mapping', 'flow_mapping']);

function resolveKeyNode(pair: TsNode): TsNode | undefined {
    return pair.childForFieldName('key') ?? pair.children.find((c) => SCALAR_TYPES.has(c.type));
}

function pairToSymbol(pair: TsNode, filePath: string): SymbolInfo | null {
    const keyNode = resolveKeyNode(pair);
    if (!keyNode) return null;
    const keyText = keyNode.text.replace(/^['"]|['"]$/g, '').trim();
    if (!keyText) return null;
    return {
        name: keyText,
        kind: 'variable',
        file: filePath,
        line: row(pair),
        endLine: endRow(pair),
        signature: firstLine(pair),
        exported: false,
    };
}

function collectMappingSymbols(mapping: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    for (const pair of mapping.children) {
        if (!PAIR_TYPES.has(pair.type)) continue;
        const sym = pairToSymbol(pair, filePath);
        if (sym) symbols.push(sym);
    }
    return symbols;
}

function extractDocumentKeys(doc: TsNode, filePath: string, symbols: SymbolInfo[]): void {
    for (const child of doc.children) {
        if (child.type !== 'block_node' && child.type !== 'flow_node') continue;
        for (const grandchild of child.children) {
            if (MAPPING_TYPES.has(grandchild.type)) {
                symbols.push(...collectMappingSymbols(grandchild, filePath));
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parseYaml(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const root = tree.rootNode;
    const symbols = extractTopLevelKeys(root, filePath);
    return { symbols, imports: [], exports: [] };
}

// ──────────────────────────────────────────────────────────────────────────────
// Registration — uses absolute WASM path (not in @vscode/tree-sitter-wasm bundle)
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(['.yaml', '.yml'], YAML_WASM_PATH, parseYaml);
