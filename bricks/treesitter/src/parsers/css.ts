// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for CSS.
 * Handles: .css
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-css.wasm).
 * Extracts class selectors, id selectors, and @keyframes as symbols.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const CSS_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-css.wasm',
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

function collectSymbols(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        switch (node.type) {
            case 'class_selector': {
                const nameNode = node.children.find((c) => c.type === 'class_name');
                if (nameNode) {
                    symbols.push({
                        name: `.${nameNode.text}`,
                        kind: 'class',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
                return;
            }
            case 'id_selector': {
                const nameNode = node.children.find((c) => c.type === 'id_name');
                if (nameNode) {
                    symbols.push({
                        name: `#${nameNode.text}`,
                        kind: 'variable',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
                return;
            }
            case 'keyframes_statement': {
                const nameNode = node.children.find((c) => c.type === 'keyframes_name');
                if (nameNode) {
                    symbols.push({
                        name: nameNode.text,
                        kind: 'function',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
                return;
            }
            default:
                break;
        }
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseCss(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(['.css'], CSS_WASM_PATH, parseCss);
