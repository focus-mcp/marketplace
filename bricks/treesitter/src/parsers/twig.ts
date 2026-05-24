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

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

// The Twig grammar `.wasm` is bundled with this brick under `wasms/` rather
// than pulled from `tree-sitter-twig` on npm. That package ships an
// `install: node-gyp rebuild` script with no `binding.gyp` in its tarball,
// so installing it fails on every machine without a build toolchain (and
// is broken upstream regardless). We only need the prebuilt `.wasm`, so we
// vendor it directly. The grammar is MPL-2.0, see wasms/tree-sitter-twig.wasm.license.
const _here = dirname(fileURLToPath(import.meta.url));
const _bundledTwigWasm = join(_here, '..', '..', 'wasms', 'tree-sitter-twig.wasm');
const TWIG_WASM_PATH: string | null = existsSync(_bundledTwigWasm) ? _bundledTwigWasm : null;

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
