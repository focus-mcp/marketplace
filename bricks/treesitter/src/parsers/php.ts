// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for PHP.
 * Handles: .php
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

// ──────────────────────────────────────────────────────────────────────────────
// Case handlers (keep each function small for complexity budget)
// ──────────────────────────────────────────────────────────────────────────────

function handleUseDeclaration(
    node: TsNode,
    imports: Array<{ from: string; names: string[] }>,
): void {
    for (const clause of node.children) {
        if (clause.type !== 'namespace_use_clause') continue;
        const qname = clause.children.find((c) => c.type === 'qualified_name' || c.type === 'name');
        if (!qname) continue;
        const from = qname.text;
        const aliasNode = clause.children.find((c) => c.type === 'name');
        const names = aliasNode ? [aliasNode.text] : [from.split('\\').at(-1) ?? from];
        imports.push({ from, names });
    }
}

function handleFunctionDef(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
    parentClass: string | undefined,
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push({
        name,
        kind: 'function',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: true,
        ...(parentClass !== undefined && { parent: parentClass }),
    });
    if (!parentClass) exports.push(name);
}

function handleClassDecl(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push({
        name,
        kind: 'class',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: true,
    });
    exports.push(name);
    for (const child of node.children) {
        if (child.type !== 'declaration_list') continue;
        for (const member of child.children) {
            if (member.type !== 'method_declaration') continue;
            const mName = member.childForFieldName('name');
            if (!mName) continue;
            symbols.push({
                name: mName.text,
                kind: 'method',
                file: filePath,
                line: row(member),
                endLine: endRow(member),
                signature: firstLine(member),
                exported: false,
                parent: name,
            });
        }
    }
}

function handleInterfaceDecl(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push({
        name,
        kind: 'interface',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: true,
    });
    exports.push(name);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parsePhp(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const root = tree.rootNode;

    const imports: Array<{ from: string; names: string[] }> = [];
    const symbols: SymbolInfo[] = [];
    const exports: string[] = [];

    function visit(node: TsNode, parentClass?: string): void {
        switch (node.type) {
            case 'namespace_use_declaration':
                handleUseDeclaration(node, imports);
                break;
            case 'function_definition':
                handleFunctionDef(node, filePath, symbols, exports, parentClass);
                break;
            case 'class_declaration':
                handleClassDecl(node, filePath, symbols, exports);
                return; // don't recurse further
            case 'interface_declaration':
                handleInterfaceDecl(node, filePath, symbols, exports);
                return;
            default:
                for (const child of node.children) visit(child, parentClass);
        }
    }

    visit(root);
    return { symbols, imports, exports };
}

registerLanguage(['.php'], 'tree-sitter-php.wasm', parsePhp);
