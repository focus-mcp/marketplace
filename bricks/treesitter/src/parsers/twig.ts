// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Twig templates.
 * Handles: .twig
 *
 * Grammar: tree-sitter-twig (kaermorchen), compiled with tree-sitter-cli 0.26.8.
 * ABI compatibility verified: works with @vscode/tree-sitter-wasm (web-tree-sitter).
 * License: MPL-2.0
 *
 * Extracts: block names, macro definitions, set variables.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);

// tree-sitter-twig is declared as an optionalDependency: it ships with a
// node-gyp install script that fails on machines without a native build
// toolchain, even though this brick only needs the bundled .wasm file.
// If the package isn't installed (install script failed and npm removed it,
// or the user explicitly skipped it), gracefully disable Twig support
// rather than crashing the whole tree-sitter brick at module load.
let TWIG_WASM_PATH: string | null = null;
try {
    TWIG_WASM_PATH = _require.resolve('tree-sitter-twig/tree-sitter-twig.wasm');
} catch {
    TWIG_WASM_PATH = null;
}

function collectSymbols(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        switch (node.type) {
            case 'block': {
                // {% block name %}...{% endblock %}
                const nameNode = node.children.find(
                    (c) => c.type === 'identifier' || c.type === 'name',
                );
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
                break;
            }
            case 'macro': {
                // {% macro name(args) %}...{% endmacro %}
                const nameNode = node.children.find(
                    (c) => c.type === 'identifier' || c.type === 'name',
                );
                if (nameNode) {
                    symbols.push({
                        name: nameNode.text,
                        kind: 'function',
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: true,
                    });
                }
                break;
            }
            case 'set': {
                // {% set varName = value %}
                const nameNode = node.children.find(
                    (c) => c.type === 'identifier' || c.type === 'variable',
                );
                if (nameNode) {
                    symbols.push({
                        name: nameNode.text,
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

function parseTwig(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

if (TWIG_WASM_PATH !== null) {
    registerLanguage(['.twig'], TWIG_WASM_PATH, parseTwig);
}
