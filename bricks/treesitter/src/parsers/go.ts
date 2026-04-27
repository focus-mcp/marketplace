// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for Go.
 * Handles: .go
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

function handleImportSpec(node: TsNode, imports: Array<{ from: string; names: string[] }>): void {
    const pathNode = node.children.find(
        (c) => c.type === 'interpreted_string_literal' || c.type === 'raw_string_literal',
    );
    if (!pathNode) return;
    const from = pathNode.text.replace(/^["` ]|["` ]$/g, '');
    const pkgName = from.split('/').at(-1) ?? from;
    imports.push({ from, names: [pkgName] });
}

function handleFunctionDecl(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    const exported = /^[A-Z]/.test(name);
    symbols.push({
        name,
        kind: 'function',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported,
    });
    if (exported) exports.push(name);
}

function resolveReceiverType(params: TsNode): string | undefined {
    const recv = params.children.find((c) => c.type === 'parameter_declaration');
    if (!recv) return undefined;
    const typeNode = recv.children.find(
        (c) => c.type === 'type_identifier' || c.type === 'pointer_type',
    );
    if (!typeNode) return undefined;
    const tid =
        typeNode.type === 'pointer_type'
            ? typeNode.children.find((c) => c.type === 'type_identifier')
            : typeNode;
    return tid?.text;
}

function handleMethodDecl(node: TsNode, filePath: string, symbols: SymbolInfo[]): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;
    const name = nameNode.text;
    const params = node.children.find((c) => c.type === 'parameter_list');
    const parent = params ? resolveReceiverType(params) : undefined;
    symbols.push({
        name,
        kind: 'method',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: /^[A-Z]/.test(name),
        ...(parent !== undefined && { parent }),
    });
}

function handleTypeDecl(
    node: TsNode,
    filePath: string,
    symbols: SymbolInfo[],
    exports: string[],
): void {
    for (const spec of node.children) {
        if (spec.type !== 'type_spec') continue;
        const nameNode = spec.children.find((c) => c.type === 'type_identifier');
        if (!nameNode) continue;
        const name = nameNode.text;
        const exported = /^[A-Z]/.test(name);
        const typeBodyNode = spec.children.find(
            (c) => c.type === 'struct_type' || c.type === 'interface_type',
        );
        const kind: 'class' | 'interface' | 'type' =
            typeBodyNode?.type === 'struct_type'
                ? 'class'
                : typeBodyNode?.type === 'interface_type'
                  ? 'interface'
                  : 'type';
        symbols.push({
            name,
            kind,
            file: filePath,
            line: row(spec),
            endLine: endRow(spec),
            signature: firstLine(spec),
            exported,
        });
        if (exported) exports.push(name);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────────────────────────

function parseGo(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const root = tree.rootNode;

    const imports: Array<{ from: string; names: string[] }> = [];
    const symbols: SymbolInfo[] = [];
    const exports: string[] = [];

    function visit(node: TsNode): void {
        switch (node.type) {
            case 'import_spec':
                handleImportSpec(node, imports);
                break;
            case 'import_spec_list':
                for (const child of node.children) {
                    if (child.type === 'import_spec') visit(child);
                }
                break;
            case 'function_declaration':
                handleFunctionDecl(node, filePath, symbols, exports);
                break;
            case 'method_declaration':
                handleMethodDecl(node, filePath, symbols);
                break;
            case 'type_declaration':
                handleTypeDecl(node, filePath, symbols, exports);
                break;
            default:
                for (const child of node.children) visit(child);
        }
    }

    visit(root);
    return { symbols, imports, exports };
}

registerLanguage(['.go'], 'tree-sitter-go.wasm', parseGo);
