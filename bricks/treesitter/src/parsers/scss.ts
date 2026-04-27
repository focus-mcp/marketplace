// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for SCSS and SASS.
 * Handles: .scss .sass (SASS uses SCSS grammar as a fallback)
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-scss.wasm).
 * Extracts mixin definitions, variable declarations, and class/id selectors.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const SCSS_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-scss.wasm',
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
    const selText = selector.text.trim().split(/[\s,{]/)[0] ?? selector.text.trim();
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

registerLanguage(['.scss', '.sass'], SCSS_WASM_PATH, parseScss);
