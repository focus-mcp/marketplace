// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Generic language parsers using @cursorless/tree-sitter-wasms.
 *
 * For languages where extracting function/class names is sufficient.
 * Each registration uses a shared extraction strategy based on common node types.
 *
 * Covered: Lua, Kotlin, Swift, Dart, Elixir, Haskell, Scala, Zig, XML,
 *          R, Perl, LaTeX, Nix, HCL (Terraform), Gleam, Elm, GDScript,
 *          Clojure, Properties.
 */

import { createRequire } from 'node:module';
import type { SymbolInfo } from '../operations.ts';
import { endRow, firstLine, row } from './helpers.ts';
import type { ParseResult, TsNode } from './registry.ts';
import { registerLanguage } from './registry.ts';

const _require = createRequire(import.meta.url);

// ──────────────────────────────────────────────────────────────────────────────
// Generic symbol extractor — walks tree looking for known declaration patterns
// ──────────────────────────────────────────────────────────────────────────────

interface NodePattern {
    /** tree-sitter node types that represent declarations */
    types: string[];
    /** field name OR child type to get the identifier from */
    nameField?: string;
    nameChildType?: string;
    kind: SymbolInfo['kind'];
}

function resolveNameNode(node: TsNode, pattern: NodePattern): TsNode | null {
    if (pattern.nameField) {
        const n = node.childForFieldName(pattern.nameField);
        if (n) return n;
    }
    if (pattern.nameChildType) {
        const n = node.children.find((c) => c.type === pattern.nameChildType);
        if (n) return n;
    }
    // fallback: first identifier child
    return node.children.find((c) => c.type === 'identifier' || c.type === 'name') ?? null;
}

function buildGenericParser(
    patterns: NodePattern[],
): (
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
) => ParseResult {
    const typeToPattern = new Map<string, NodePattern>();
    for (const p of patterns) {
        for (const t of p.types) typeToPattern.set(t, p);
    }

    return (
        source: string,
        filePath: string,
        parser: { parse(s: string): { rootNode: TsNode } },
    ): ParseResult => {
        const tree = parser.parse(source);
        const symbols: SymbolInfo[] = [];

        function visit(node: TsNode): void {
            const pattern = typeToPattern.get(node.type);
            if (pattern) {
                const nameNode = resolveNameNode(node, pattern);
                if (nameNode) {
                    symbols.push({
                        name: nameNode.text,
                        kind: pattern.kind,
                        file: filePath,
                        line: row(node),
                        endLine: endRow(node),
                        signature: firstLine(node),
                        exported: false,
                    });
                }
            }
            for (const child of node.children) visit(child);
        }

        visit(tree.rootNode);
        return { symbols, imports: [], exports: [] };
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lua
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.lua'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-lua.wasm'),
    buildGenericParser([
        { types: ['function_declaration', 'local_function'], nameField: 'name', kind: 'function' },
        { types: ['function_definition'], nameField: 'name', kind: 'function' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Kotlin
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.kt', '.kotlin'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-kotlin.wasm'),
    buildGenericParser([
        { types: ['function_declaration'], nameField: 'name', kind: 'function' },
        {
            types: ['class_declaration', 'object_declaration', 'interface_declaration'],
            nameField: 'name',
            kind: 'class',
        },
        { types: ['property_declaration'], nameField: 'name', kind: 'variable' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Swift
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.swift'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-swift.wasm'),
    buildGenericParser([
        { types: ['function_declaration'], nameField: 'name', kind: 'function' },
        {
            types: [
                'class_declaration',
                'struct_declaration',
                'enum_declaration',
                'protocol_declaration',
            ],
            nameField: 'name',
            kind: 'class',
        },
        { types: ['variable_declaration'], nameField: 'name', kind: 'variable' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Dart
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.dart'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-dart.wasm'),
    buildGenericParser([
        { types: ['function_signature', 'method_signature'], nameField: 'name', kind: 'function' },
        {
            types: ['class_definition', 'mixin_declaration', 'enum_declaration'],
            nameField: 'name',
            kind: 'class',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Elixir — custom parser to avoid false-positives from generic `call` nodes.
// In tree-sitter-elixir, ALL function calls are `call` nodes, not just defs.
// We filter to only emit symbols for `def`, `defp`, `defmacro`, `defmacrop`,
// `defmodule`, `defprotocol`, `defimpl`, `defstruct` definitions.
// ──────────────────────────────────────────────────────────────────────────────

const ELIXIR_DEF_KEYWORDS = new Set([
    'def',
    'defp',
    'defmacro',
    'defmacrop',
    'defmodule',
    'defprotocol',
    'defimpl',
    'defstruct',
]);

function elixirCallToSymbol(node: TsNode, filePath: string): SymbolInfo | null {
    const fnNode = node.childForFieldName('function');
    if (!fnNode || !ELIXIR_DEF_KEYWORDS.has(fnNode.text)) return null;
    const argsNode = node.childForFieldName('arguments');
    const nameNode =
        argsNode?.children.find((c) => c.type === 'identifier' || c.type === 'alias') ?? null;
    if (!nameNode) return null;
    return {
        name: nameNode.text,
        kind: fnNode.text === 'defmodule' ? 'class' : 'function',
        file: filePath,
        line: row(node),
        endLine: endRow(node),
        signature: firstLine(node),
        exported: fnNode.text === 'def' || fnNode.text === 'defmacro',
    };
}

function parseElixir(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        if (node.type === 'call') {
            const sym = elixirCallToSymbol(node, filePath);
            if (sym) symbols.push(sym);
        }
        for (const child of node.children) visit(child);
    }

    visit(tree.rootNode);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(
    ['.ex', '.exs'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-elixir.wasm'),
    parseElixir,
);

// ──────────────────────────────────────────────────────────────────────────────
// Haskell
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.hs'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-haskell.wasm'),
    buildGenericParser([
        { types: ['function', 'signature'], nameChildType: 'variable', kind: 'function' },
        {
            types: ['data_declaration', 'newtype_declaration', 'type_declaration'],
            nameChildType: 'name',
            kind: 'type',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Scala
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.scala'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-scala.wasm'),
    buildGenericParser([
        {
            types: ['function_definition', 'val_definition', 'var_definition'],
            nameField: 'name',
            kind: 'function',
        },
        {
            types: ['class_definition', 'object_definition', 'trait_definition'],
            nameField: 'name',
            kind: 'class',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Zig
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.zig'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-zig.wasm'),
    buildGenericParser([
        {
            types: ['FnProto', 'function_declaration'],
            nameField: 'name',
            nameChildType: 'identifier',
            kind: 'function',
        },
        {
            types: ['VarDecl', 'variable_declaration'],
            nameField: 'name',
            nameChildType: 'identifier',
            kind: 'variable',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// XML — custom parser: only top-level elements to avoid exponential noise.
// A Spring config, SVG, or Maven pom.xml can have hundreds of nested elements.
// We emit symbols only for direct children of the document root.
// ──────────────────────────────────────────────────────────────────────────────

function parseXml(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols: SymbolInfo[] = [];

    // XML root → document → element (root element)
    // We emit the root element and its direct element children only.
    function visit(node: TsNode, depth: number): void {
        if (node.type === 'element' && depth <= 2) {
            const startTag = node.children.find(
                (c) => c.type === 'start_tag' || c.type === 'self_closing_tag',
            );
            const tagNameNode = startTag?.children.find((c) => c.type === 'tag_name');
            if (tagNameNode) {
                symbols.push({
                    name: tagNameNode.text,
                    kind: 'variable',
                    file: filePath,
                    line: row(node),
                    endLine: endRow(node),
                    signature: firstLine(node),
                    exported: false,
                });
            }
        }
        if (depth < 2) {
            for (const child of node.children) visit(child, depth + 1);
        }
    }

    visit(tree.rootNode, 0);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(
    ['.xml'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-xml.wasm'),
    parseXml,
);

// ──────────────────────────────────────────────────────────────────────────────
// R — custom parser: only capture function assignments (x <- function(...)).
// `binary_operator` matches ALL binary expressions (x+y, a==b, df %>% mutate).
// We only emit a symbol when the operator is `<-`, `=`, or `<<-` AND the
// right-hand side is a `function_definition` node.
// ──────────────────────────────────────────────────────────────────────────────

const R_ASSIGN_OPS = new Set(['<-', '<<-', '=']);

function parseR(
    source: string,
    filePath: string,
    parser: { parse(s: string): { rootNode: TsNode } },
): ParseResult {
    const tree = parser.parse(source);
    const symbols: SymbolInfo[] = [];

    function visit(node: TsNode): void {
        if (node.type === 'binary_operator') {
            const [lhs, op, rhs] = node.children;
            if (
                op &&
                R_ASSIGN_OPS.has(op.text) &&
                rhs?.type === 'function_definition' &&
                lhs?.type === 'identifier'
            ) {
                symbols.push({
                    name: lhs.text,
                    kind: 'function',
                    file: filePath,
                    line: row(node),
                    endLine: endRow(node),
                    signature: firstLine(node),
                    exported: false,
                });
            }
        }
        for (const child of node.children) visit(child);
    }

    visit(tree.rootNode);
    return { symbols, imports: [], exports: [] };
}

registerLanguage(
    ['.r'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-r.wasm'),
    parseR,
);

// ──────────────────────────────────────────────────────────────────────────────
// Perl
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.pl', '.pm'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-perl.wasm'),
    buildGenericParser([
        {
            types: ['named_unary_expression', 'function_definition'],
            nameField: 'name',
            nameChildType: 'identifier',
            kind: 'function',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// LaTeX
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.tex', '.latex'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-latex.wasm'),
    buildGenericParser([
        {
            types: ['chapter', 'section', 'subsection', 'subsubsection'],
            nameChildType: 'curly_group',
            kind: 'variable',
        },
        { types: ['new_command_definition'], nameChildType: 'command_name', kind: 'function' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Nix
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.nix'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-nix.wasm'),
    buildGenericParser([
        { types: ['binding'], nameChildType: 'identifier', kind: 'variable' },
        { types: ['attrpath'], nameChildType: 'identifier', kind: 'variable' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// HCL / Terraform
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.hcl', '.tf'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-hcl.wasm'),
    buildGenericParser([
        { types: ['block'], nameChildType: 'identifier', kind: 'class' },
        { types: ['attribute'], nameChildType: 'identifier', kind: 'variable' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Gleam
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.gleam'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-gleam.wasm'),
    buildGenericParser([
        { types: ['function', 'function_definition'], nameField: 'name', kind: 'function' },
        { types: ['type_alias', 'custom_type'], nameField: 'name', kind: 'type' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Elm
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.elm'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-elm.wasm'),
    buildGenericParser([
        {
            types: ['value_declaration', 'function_declaration_left'],
            nameChildType: 'lower_case_identifier',
            kind: 'function',
        },
        {
            types: ['type_alias_declaration', 'type_declaration'],
            nameChildType: 'upper_case_identifier',
            kind: 'type',
        },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// GDScript (Godot)
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.gd'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-gdscript.wasm'),
    buildGenericParser([
        { types: ['function_definition'], nameField: 'name', kind: 'function' },
        { types: ['class_definition'], nameField: 'name', kind: 'class' },
        { types: ['variable_statement'], nameField: 'name', kind: 'variable' },
    ]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Clojure
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.clj', '.cljs', '.edn'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-clojure.wasm'),
    buildGenericParser([{ types: ['list_lit'], nameChildType: 'sym_lit', kind: 'function' }]),
);

// ──────────────────────────────────────────────────────────────────────────────
// Properties (.properties files — Java-style)
// ──────────────────────────────────────────────────────────────────────────────

registerLanguage(
    ['.properties'],
    _require.resolve('@cursorless/tree-sitter-wasms/out/tree-sitter-properties.wasm'),
    buildGenericParser([{ types: ['property'], nameChildType: 'key', kind: 'variable' }]),
);
