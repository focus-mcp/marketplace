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
// `install: node-gyp rebuild` script but its tarball contains no
// `binding.gyp`, so installing it fails on every machine (with or without
// a C/C++ toolchain — node-gyp has nothing to build). We only need the
// prebuilt `.wasm`, so we vendor it directly. Grammar is MPL-2.0; see
// wasms/tree-sitter-twig.wasm.license.
//
// The `.wasm` is now a REQUIRED artifact of the brick (listed in
// package.json `files`). A missing file means a broken install, not an
// expected optional miss — so we throw rather than silently disable Twig.
const _here = dirname(fileURLToPath(import.meta.url));
const TWIG_WASM_PATH = join(_here, '..', '..', 'wasms', 'tree-sitter-twig.wasm');
if (!existsSync(TWIG_WASM_PATH)) {
    throw new Error(
        `bundled tree-sitter-twig.wasm not found at ${TWIG_WASM_PATH} — ` +
            'the brick install is broken (the wasms/ directory must ship in the npm tarball)',
    );
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

registerLanguage(['.twig'], TWIG_WASM_PATH, parseTwig);
