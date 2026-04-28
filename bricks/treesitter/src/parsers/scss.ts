// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for SCSS.
 * Handles: .scss only (.sass uses a different indented-syntax grammar not available here)
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-scss.wasm).
 * Extracts mixin definitions, variable declarations, and class/id selectors.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const SCSS_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-scss.wasm',
);

function sym(
    name: string,
    kind: SymbolInfo['kind'],
    exported: boolean,
    filePath: string,
    node: TsNode,
): SymbolInfo {
    return {
        name,
        kind,
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported,
    };
}

function visitMixin(node: TsNode, filePath: string): SymbolInfo | null {
    const n = node.children.find((c) => c.type === 'name' || c.type === 'identifier');
    return n ? sym(n.text, 'function', true, filePath, node) : null;
}

function visitDeclaration(node: TsNode, filePath: string): SymbolInfo | null {
    const propNode = node.children.find(
        (c) => c.type === 'variable_value' || c.type === 'property_name',
    );
    const rawName = propNode?.text ?? node.children[0]?.text ?? '';
    if (!rawName.startsWith('$')) return null;
    return sym(rawName, 'variable', false, filePath, node);
}

function visitRuleSet(node: TsNode, filePath: string): SymbolInfo | null {
    const selector = node.children.find((c) => c.type === 'selectors');
    if (!selector) return null;
    // split() always returns at least one element, so [0]! is safe
    const selText = selector.text.trim().split(/[\s,{]/)[0] ?? '';
    if (!selText || (!selText.startsWith('.') && !selText.startsWith('#'))) return null;
    return sym(selText, 'class', false, filePath, node);
}

function collectSymbols(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        let result: SymbolInfo | null = null;
        if (node.type === 'mixin_statement') result = visitMixin(node, filePath);
        else if (node.type === 'declaration') result = visitDeclaration(node, filePath);
        else if (node.type === 'rule_set') result = visitRuleSet(node, filePath);
        if (result) symbols.push(result);
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseScss(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

// Note: .sass (indented syntax) uses a different grammar — not registered here
// to avoid silently misparsing SASS files with the SCSS grammar.
registerLanguage(['.scss'], SCSS_WASM_PATH, parseScss);
