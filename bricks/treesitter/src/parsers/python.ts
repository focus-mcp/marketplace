// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Python.
 * Handles: .py
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
// Case handlers
// ──────────────────────────────────────────────────────────────────────────────

function handleImportStatement(
    node: TsNode,
    imports: Array<{ from: string; names: string[] }>,
): void {
    const names: string[] = [];
    for (const child of node.children) {
        if (child.type === 'dotted_name' || child.type === 'aliased_import') {
            names.push(child.text.split('.')[0] ?? child.text);
        }
    }
    if (names.length > 0) imports.push({ from: names[0] ?? '', names });
}

function collectFromObjectNames(node: TsNode): string[] {
    return node.children
        .filter((id) => id.type === 'dotted_name' || id.type === 'identifier')
        .map((id) => id.text);
}

function collectFromNames(node: TsNode, moduleNode: TsNode | undefined): string[] {
    const names: string[] = [];
    for (const child of node.children) {
        if (child.type === 'import_from_object') {
            names.push(...collectFromObjectNames(child));
        } else if (child.type === 'aliased_import') {
            const alias = child.children.find((c) => c.type === 'identifier');
            if (alias) names.push(alias.text);
        } else if (child.type === 'dotted_name' && child !== moduleNode) {
            names.push(child.text);
        }
    }
    return names;
}

function handleImportFromStatement(
    node: TsNode,
    imports: Array<{ from: string; names: string[] }>,
): void {
    const moduleNode = node.children.find(
        (c) => c.type === 'dotted_name' || c.type === 'relative_import',
    );
    const from = moduleNode?.text ?? '';
    imports.push({ from, names: collectFromNames(node, moduleNode) });
}

function extractClassBody(
    body: TsNode,
    filePath: string,
    parentName: string,
    symbols: SymbolInfo[],
): void {
    for (const child of body.children) {
        if (child.type === 'function_definition') {
            const mName = child.childForFieldName('name');
            if (!mName) continue;
            symbols.push({
                name: mName.text,
                kind: 'method',
                file: filePath,
                line: row(child),
                endLine: endRow(child),
                signature: firstLine(child),
                exported: false,
                parent: parentName,
            });
        } else if (child.type === 'decorated_definition') {
            const inner = child.children.find((c) => c.type === 'function_definition');
            if (!inner) continue;
            const mName = inner.childForFieldName('name');
            if (!mName) continue;
            symbols.push({
                name: mName.text,
                kind: 'method',
                file: filePath,
                line: row(child),
                endLine: endRow(child),
                signature: firstLine(inner),
                exported: false,
                parent: parentName,
            });
        }
    }
}

function handleClassDefinition(
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
        exported: !name.startsWith('_'),
    });
    if (!name.startsWith('_')) exports.push(name);
    const body = node.childForFieldName('body');
    if (body) extractClassBody(body, filePath, name, symbols);
}

// ──────────────────────────────────────────────────────────────────────────────
// Visitor (top-level to avoid closure complexity inflation)
// ──────────────────────────────────────────────────────────────────────────────

interface PyCtx {
    filePath: string;
    imports: Array<{ from: string; names: string[] }>;
    symbols: SymbolInfo[];
    exports: string[];
}

function handleFuncOrDecorated(node: TsNode, ctx: PyCtx, parentClass: string | undefined): void {
    const funcDef =
        node.type === 'decorated_definition'
            ? node.children.find(
                  (c) => c.type === 'function_definition' || c.type === 'class_definition',
              )
            : node;
    if (!funcDef) return;
    if (funcDef.type === 'function_definition') {
        const nameNode = funcDef.childForFieldName('name');
        if (!nameNode) return;
        const name = nameNode.text;
        ctx.symbols.push({
            name,
            kind: 'function',
            file: ctx.filePath,
            line: row(node),
            endLine: endRow(node),
            signature: firstLine(funcDef),
            exported: !parentClass && !name.startsWith('_'),
            ...(parentClass !== undefined && { parent: parentClass }),
        });
        if (!parentClass && !name.startsWith('_')) ctx.exports.push(name);
    } else if (funcDef.type === 'class_definition') {
        visitPython(funcDef, ctx, parentClass);
    }
}

function visitPython(node: TsNode, ctx: PyCtx, parentClass?: string): void {
    switch (node.type) {
        case 'import_statement':
            handleImportStatement(node, ctx.imports);
            break;
        case 'import_from_statement':
            handleImportFromStatement(node, ctx.imports);
            break;
        case 'function_definition':
        case 'decorated_definition':
            handleFuncOrDecorated(node, ctx, parentClass);
            return;
        case 'class_definition':
            handleClassDefinition(node, ctx.filePath, ctx.symbols, ctx.exports);
            return;
        default:
            for (const child of node.children) visitPython(child, ctx, parentClass);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parsePython(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const ctx: PyCtx = { filePath, imports: [], symbols: [], exports: [] };
    visitPython(tree.rootNode, ctx);
    return { symbols: ctx.symbols, imports: ctx.imports, exports: ctx.exports };
}

registerLanguage(['.py'], 'tree-sitter-python.wasm', parsePython);
