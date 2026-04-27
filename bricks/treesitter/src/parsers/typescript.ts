// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for TypeScript and JavaScript.
 *
 * Handles: .ts .tsx .js .jsx .mjs .cjs
 * Grammar: tree-sitter-typescript (tsx variant for TSX/JSX)
 */

import type { SymbolInfo } from '../operations.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function row(node: TsNode): number {
    return node.startPosition.row + 1;
}

function endRow(node: TsNode): number {
    return node.endPosition.row + 1;
}

function firstLine(node: TsNode): string {
    const text = node.text;
    const newline = text.indexOf('\n');
    return (newline === -1 ? text : text.slice(0, newline)).trim();
}

function makeSymbol(
    name: string,
    kind: SymbolInfo['kind'],
    filePath: string,
    node: TsNode,
    exported: boolean,
    parent?: string,
): SymbolInfo {
    return {
        name,
        kind,
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported,
        ...(parent !== undefined && { parent }),
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Import extraction
// ──────────────────────────────────────────────────────────────────────────────

function extractNamedImports(namedImports: TsNode): string[] {
    const names: string[] = [];
    for (const spec of namedImports.children) {
        if (spec.type === 'import_specifier') {
            const nameNode = spec.childForFieldName('name') ?? spec.children[0];
            if (nameNode) names.push(nameNode.text);
        }
    }
    return names;
}

function extractImportClauseNames(importClause: TsNode): string[] {
    const names: string[] = [];
    const defaultId = importClause.children.find((c) => c.type === 'identifier');
    if (defaultId) names.push(defaultId.text);
    const namedImports = importClause.children.find((c) => c.type === 'named_imports');
    if (namedImports) names.push(...extractNamedImports(namedImports));
    const nsImport = importClause.children.find((c) => c.type === 'namespace_import');
    if (nsImport) {
        const nsId = nsImport.children.find((c) => c.type === 'identifier');
        if (nsId) names.push(`* as ${nsId.text}`);
    }
    return names;
}

function collectImports(root: TsNode): Array<{ from: string; names: string[] }> {
    const imports: Array<{ from: string; names: string[] }> = [];
    function visit(node: TsNode): void {
        if (node.type === 'import_statement') {
            const sourceNode = node.childForFieldName('source');
            if (!sourceNode) return;
            const from = sourceNode.text.replace(/^['"]|['"]$/g, '');
            const importClause = node.children.find((c) => c.type === 'import_clause');
            const names = importClause ? extractImportClauseNames(importClause) : [];
            imports.push({ from, names });
            return;
        }
        for (const child of node.children) visit(child);
    }
    visit(root);
    return imports;
}

// ──────────────────────────────────────────────────────────────────────────────
// Class body method extraction
// ──────────────────────────────────────────────────────────────────────────────

function extractClassMethods(body: TsNode, filePath: string, parentClass: string): SymbolInfo[] {
    const methods: SymbolInfo[] = [];
    for (const child of body.children) {
        if (child.type === 'method_definition' || child.type === 'public_field_definition') {
            const nameNode =
                child.childForFieldName('name') ??
                child.children.find((c) => c.type === 'property_identifier');
            if (!nameNode) continue;
            const name = nameNode.text;
            if (name === 'constructor') continue;
            methods.push(makeSymbol(name, 'method', filePath, child, false, parentClass));
        }
    }
    return methods;
}

// ──────────────────────────────────────────────────────────────────────────────
// Declaration handlers
// ──────────────────────────────────────────────────────────────────────────────

function handleFunctionDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = decl.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push(makeSymbol(name, 'function', filePath, decl, exported));
    if (exported) exports.push(name);
}

function handleClassDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = decl.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push(makeSymbol(name, 'class', filePath, decl, exported));
    if (exported) exports.push(name);
    const body = decl.children.find((c) => c.type === 'class_body');
    if (body) symbols.push(...extractClassMethods(body, filePath, name));
}

function handleInterfaceDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = decl.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push(makeSymbol(name, 'interface', filePath, decl, exported));
    if (exported) exports.push(name);
}

function handleTypeAliasDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = decl.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    symbols.push(makeSymbol(name, 'type', filePath, decl, exported));
    if (exported) exports.push(name);
}

function handleVariableDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    for (const child of decl.children) {
        if (child.type === 'variable_declarator') {
            const nameNode = child.childForFieldName('name');
            if (!nameNode) continue;
            const name = nameNode.text;
            symbols.push(makeSymbol(name, 'variable', filePath, decl, exported));
            if (exported) exports.push(name);
        }
    }
}

function processDecl(
    decl: TsNode,
    filePath: string,
    exported: boolean,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    switch (decl.type) {
        case 'function_declaration':
            handleFunctionDecl(decl, filePath, exported, symbols, exports);
            break;
        case 'class_declaration':
        case 'abstract_class_declaration':
            handleClassDecl(decl, filePath, exported, symbols, exports);
            break;
        case 'interface_declaration':
            handleInterfaceDecl(decl, filePath, exported, symbols, exports);
            break;
        case 'type_alias_declaration':
        case 'enum_declaration':
            handleTypeAliasDecl(decl, filePath, exported, symbols, exports);
            break;
        case 'lexical_declaration':
        case 'variable_declaration':
            handleVariableDecl(decl, filePath, exported, symbols, exports);
            break;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Symbol extraction
// ──────────────────────────────────────────────────────────────────────────────

const EXPORTED_DECL_TYPES = new Set([
    'function_declaration',
    'class_declaration',
    'abstract_class_declaration',
    'interface_declaration',
    'type_alias_declaration',
    'lexical_declaration',
    'variable_declaration',
    'enum_declaration',
]);

function handleExportClause(exportClause: TsNode, exports: string[]): void {
    for (const spec of exportClause.children) {
        if (spec.type === 'export_specifier') {
            const nameNode = spec.childForFieldName('name') ?? spec.children[0];
            if (nameNode?.type === 'identifier') exports.push(nameNode.text);
        }
    }
}

interface TsCtx {
    filePath: string;
    symbols: SymbolInfo[];
    exports: string[];
}

function visitTs(node: TsNode, ctx: TsCtx, parentClass?: string): void {
    if (node.type === 'export_statement') {
        const decl = node.children.find((c) => EXPORTED_DECL_TYPES.has(c.type));
        if (decl) processDecl(decl, ctx.filePath, true, ctx.symbols, ctx.exports);
        const exportClause = node.children.find((c) => c.type === 'export_clause');
        if (exportClause) handleExportClause(exportClause, ctx.exports);
        return;
    }
    if (node.type === 'class_body' && parentClass) {
        ctx.symbols.push(...extractClassMethods(node, ctx.filePath, parentClass));
        return;
    }
    for (const child of node.children) visitTs(child, ctx, parentClass);
}

function collectSymbols(
    root: TsNode,
    filePath: string,
): { symbols: SymbolInfo[]; exports: string[] } {
    const ctx: TsCtx = { filePath, symbols: [], exports: [] };
    visitTs(root, ctx);
    return { symbols: ctx.symbols, exports: ctx.exports };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parseTypeScript(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const root = tree.rootNode;
    const imports = collectImports(root);
    const { symbols, exports } = collectSymbols(root, filePath);
    return { symbols, imports, exports };
}

// ──────────────────────────────────────────────────────────────────────────────
// Registration
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(['.ts'], 'tree-sitter-typescript.wasm', parseTypeScript);
registerLanguage(['.tsx'], 'tree-sitter-tsx.wasm', parseTypeScript);
registerLanguage(['.js', '.jsx', '.mjs', '.cjs'], 'tree-sitter-javascript.wasm', parseTypeScript);
