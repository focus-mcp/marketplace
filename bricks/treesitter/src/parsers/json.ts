// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for JSON.
 * Handles: .json .jsonc
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-json.wasm).
 * Extracts top-level object keys as 'variable' symbols.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const JSON_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-json.wasm',
);

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

function collectTopLevelKeys(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    // JSON root → document → object → pair[]
    function extractFromObject(obj: TsNode): void {
        for (const child of obj.children) {
            if (child.type === 'pair') {
                const keyNode = child.childForFieldName('key') ?? child.children[0];
                if (!keyNode) continue;
                const key = keyNode.text.replace(/^['"]|['"]$/g, '');
                if (!key) continue;
                symbols.push({
                    name: key,
                    kind: 'variable',
                    file: filePath,
                    line: row(child),
                    endLine: endRow(child),
                    signature: firstLine(child),
                    exported: false,
                });
            }
        }
    }

    // Walk to find the top-level object
    function visit(node: TsNode): void {
        if (node.type === 'object') {
            extractFromObject(node);
            return; // only top-level
        }
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseJson(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectTopLevelKeys(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(['.json', '.jsonc'], JSON_WASM_PATH, parseJson);
