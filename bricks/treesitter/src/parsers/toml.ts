// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for TOML.
 * Handles: .toml
 *
 * Grammar: @tree-sitter-grammars/tree-sitter-toml (MIT).
 * Extracts: table headers (sections), top-level key-value pairs.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const TOML_WASM_PATH: string = _require.resolve(
    '@tree-sitter-grammars/tree-sitter-toml/tree-sitter-toml.wasm',
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
            case 'table': {
                // [section] or [[array_of_tables]]
                const keyNode = node.children.find(
                    (c) => c.type === 'bare_key' || c.type === 'dotted_key' || c.type === 'key',
                );
                const name = keyNode?.text ?? node.text.replace(/^\[+|\]+$/g, '').trim();
                if (name) {
                    symbols.push({
                        name,
                        kind: 'class',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
                break;
            }
            case 'pair': {
                // key = value at top level
                const keyNode = node.childForFieldName('key') ?? node.children[0];
                if (keyNode) {
                    symbols.push({
                        name: keyNode.text,
                        kind: 'variable',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
                break;
            }
            default:
                break;
        }
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseToml(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(['.toml'], TOML_WASM_PATH, parseToml);
