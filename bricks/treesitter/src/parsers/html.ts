// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Tree-sitter parser for HTML.
 * Handles: .html .htm
 *
 * Grammar: @cursorless/tree-sitter-wasms (tree-sitter-html.wasm).
 * Extracts heading text, element IDs, and script/style tag boundaries as symbols.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);
const HTML_WASM_PATH: string = _require.resolve(
    '@cursorless/tree-sitter-wasms/out/tree-sitter-html.wasm',
);

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function getTagName(element: TsNode): string | null {
    const startTag = element.children.find((c) => c.type === 'start_tag');
    if (!startTag) return null;
    const tagNameNode = startTag.children.find((c) => c.type === 'tag_name');
    return tagNameNode?.text.toLowerCase() ?? null;
}

function getAttrValue(element: TsNode, attrName: string): string | null {
    const startTag = element.children.find((c) => c.type === 'start_tag');
    if (!startTag) return null;
    for (const attr of startTag.children) {
        if (attr.type !== 'attribute') continue;
        const nameNode = attr.children.find((c) => c.type === 'attribute_name');
        if (nameNode?.text !== attrName) continue;
        const valueNode = attr.children.find(
            (c) => c.type === 'attribute_value' || c.type === 'quoted_attribute_value',
        );
        if (!valueNode) continue;
        return valueNode.text.replace(/^['"]|['"]$/g, '');
    }
    return null;
}

function getTextContent(element: TsNode): string {
    for (const child of element.children) {
        if (child.type === 'text') return child.text.trim().slice(0, 80);
    }
    return element.text.trim().slice(0, 80);
}

function makeSymbol(
    name: string,
    kind: SymbolInfo['kind'],
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
        exported: false,
    };
}

function visitElement(node: TsNode, filePath: string, symbols: SymbolInfo[]): boolean {
    const tagName = getTagName(node);
    if (!tagName) return false;
    if (HEADING_TAGS.has(tagName)) {
        const text = getTextContent(node);
        if (text) symbols.push(makeSymbol(text, 'variable', filePath, node));
        return false;
    }
    if (tagName === 'script' || tagName === 'style') {
        const id = getAttrValue(node, 'id');
        const name = id ?? tagName;
        symbols.push(makeSymbol(name, tagName === 'script' ? 'function' : 'type', filePath, node));
        return true; // signal: stop recursing into this element
    }
    const id = getAttrValue(node, 'id');
    if (id) symbols.push(makeSymbol(`#${id}`, 'variable', filePath, node));
    return false;
}

function collectSymbols(root: TsNode, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        if (node.type === 'element') {
            const stop = visitElement(node, filePath, symbols);
            if (stop) return;
        }
        for (const child of node.children) visit(child);
    }

    visit(root);
    return symbols;
}

function parseHtml(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols = collectSymbols(tree.rootNode, filePath);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(['.html', '.htm'], HTML_WASM_PATH, parseHtml);
