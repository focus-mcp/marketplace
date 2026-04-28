// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Markdown.
 * Handles: .md .markdown
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-markdown.wasm).
 * Extracts ATX and setext headings as symbols (useful for docs, READMEs, wikis).
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const MD_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-markdown.wasm',
);

function extractHeadingText(node: TsNode): string {
    // atx_heading structure: [atx_hN_marker, inline, newline?]
    // Only the 'inline' child carries the heading text.
    for (const child of node.children) {
        if (child.type === 'inline') {
            const text = child.text.trim();
            if (text) return text.slice(0, 100);
        }
    }
    // setext_heading fallback: strip leading #, grab first line
    return (
        node.text
            .replace(/^#+\s*/, '')
            .trim()
            .split('\n')[0]
            ?.slice(0, 100) ?? ''
    );
}

function collectSymbols(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        if (node.type === 'atx_heading' || node.type === 'setext_heading') {
            const text = extractHeadingText(node);
            if (text) {
                symbols.push({
                    name: text,
                    kind: 'variable',
                    file: filePath,
                    line: row(node),
                    endLine: endRow(node),
                    signature: firstLine(node),
                    exported: false,
                });
            }
            return; // no need to recurse into heading
        }
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseMarkdown(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(['.md', '.markdown'], MD_WASM_PATH, parseMarkdown);
