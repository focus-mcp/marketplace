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

// optionalDependency: node-gyp fails on machines without a C++ toolchain;
// skip Twig registration only when the package is genuinely absent.
// Any other error (corrupt install, renamed .wasm path, etc.) re-throws.
let TWIG_WASM_PATH: string | null = null;
try {
    TWIG_WASM_PATH = _require.resolve('tree-sitter-twig/tree-sitter-twig.wasm');
} catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
        TWIG_WASM_PATH = null;
    } else {
        throw err;
    }
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
