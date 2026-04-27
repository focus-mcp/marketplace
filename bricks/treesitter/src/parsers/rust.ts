// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Rust.
 * Handles: .rs
 */

import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

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

function isPublic(node: TsNode): boolean {
    return node.children.some((c) => c.type === 'visibility_modifier' && c.text.startsWith('pub'));
}

// ──────────────────────────────────────────────────────────────────────────────
// Case handlers
// ──────────────────────────────────────────────────────────────────────────────

function handleUseDeclaration(
    node: TsNode,
    imports: Array<{ from: string; names: string[] }>,
): void {
    const pathNode = node.children.find(
        (c) =>
            c.type === 'scoped_identifier' ||
            c.type === 'identifier' ||
            c.type === 'scoped_use_list' ||
            c.type === 'use_as_clause',
    );
    if (!pathNode) return;
    const from = pathNode.text.split('::').at(-1) ?? pathNode.text;
    imports.push({ from: pathNode.text, names: [from] });
}

function handleFunctionItem(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
    parentImpl: string | undefined,
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    const exported = isPublic(node);
    symbols.push({
        name,
        kind: parentImpl ? 'method' : 'function',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported,
        ...(parentImpl !== undefined && { parent: parentImpl }),
    });
    if (!parentImpl && exported) exports.push(name);
}

function handleNamedItem(
    node: TsNode,
    filePath: string,
    kind: SymbolInfo['kind'],
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    const exported = isPublic(node);
    symbols.push({
        name,
        kind,
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported,
    });
    if (exported) exports.push(name);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parseRust(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const root = tree.rootNode;

    const imports: Array<{ from: string; names: string[] }> = [];
    const symbols: SymbolInfo[] = [];
    const exports: string[] = [];

    function visit(node: TsNode, parentImpl?: string): void {
        switch (node.type) {
            case 'use_declaration':
                handleUseDeclaration(node, imports);
                break;
            case 'function_item':
                handleFunctionItem(node, filePath, symbols, exports, parentImpl);
                return; // don't recurse into function body
            case 'struct_item':
                handleNamedItem(node, filePath, 'class', symbols, exports);
                break;
            case 'trait_item':
                handleNamedItem(node, filePath, 'interface', symbols, exports);
                break;
            case 'type_item':
            case 'enum_item':
                handleNamedItem(node, filePath, 'type', symbols, exports);
                break;
            case 'const_item':
            case 'static_item':
                handleNamedItem(node, filePath, 'variable', symbols, exports);
                break;
            case 'impl_item': {
                const typeNode = node.childForFieldName('type');
                const implName = typeNode?.text;
                const body = node.childForFieldName('body');
                if (body && implName) {
                    for (const child of body.children) visit(child, implName);
                }
                return;
            }
            default:
                for (const child of node.children) visit(child, parentImpl);
        }
    }

    visit(root);
    return { symbols, imports, exports };
}

registerLanguage(['.rs'], 'tree-sitter-rust.wasm', parseRust);
