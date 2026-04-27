// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Java.
 * Handles: .java
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
    const modifiers = node.children.find((c) => c.type === 'modifiers');
    if (!modifiers) return false;
    return modifiers.children.some((c) => c.type === 'public' || c.text === 'public');
}

// ──────────────────────────────────────────────────────────────────────────────
// Case handlers
// ──────────────────────────────────────────────────────────────────────────────

function handleImportDeclaration(
    node: TsNode,
    imports: Array<{ from: string; names: string[] }>,
): void {
    const path = node.children.find((c) => c.type === 'scoped_identifier' || c.type === 'asterisk');
    if (!path) return;
    const from = path.text;
    const lastName = from.split('.').at(-1) ?? from;
    imports.push({ from, names: [lastName] });
}

function handleMethodDeclaration(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    parentClass: string,
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    symbols.push({
        name: nameNode.text,
        kind: 'method',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: false,
        parent: parentClass,
    });
}

function handleNamedDecl(
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
// Visitor (top-level so closures don't inflate complexity score)
// ──────────────────────────────────────────────────────────────────────────────

interface JavaCtx {
    filePath: string;
    imports: Array<{ from: string; names: string[] }>;
    symbols: SymbolInfo[];
    exports: string[];
}

function visitJava(node: TsNode, ctx: JavaCtx, parentClass?: string): void {
    switch (node.type) {
        case 'import_declaration':
            handleImportDeclaration(node, ctx.imports);
            break;
        case 'class_declaration': {
            handleNamedDecl(node, ctx.filePath, 'class', ctx.symbols, ctx.exports);
            const body = node.childForFieldName('body');
            if (body) {
                for (const child of body.children)
                    visitJava(child, ctx, node.childForFieldName('name')?.text);
            }
            return;
        }
        case 'interface_declaration':
            handleNamedDecl(node, ctx.filePath, 'interface', ctx.symbols, ctx.exports);
            return;
        case 'enum_declaration':
            handleNamedDecl(node, ctx.filePath, 'type', ctx.symbols, ctx.exports);
            return;
        case 'method_declaration':
            if (parentClass) handleMethodDeclaration(node, ctx.filePath, ctx.symbols, parentClass);
            return;
        default:
            for (const child of node.children) visitJava(child, ctx, parentClass);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parseJava(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const ctx: JavaCtx = { filePath, imports: [], symbols: [], exports: [] };
    visitJava(tree.rootNode, ctx);
    return { symbols: ctx.symbols, imports: ctx.imports, exports: ctx.exports };
}

registerLanguage(['.java'], 'tree-sitter-java.wasm', parseJava);
