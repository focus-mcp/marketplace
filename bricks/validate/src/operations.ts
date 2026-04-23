// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open } from 'node:fs/promises';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValJsonInput {
    readonly text: string;
}

export interface ValJsonOutput {
    readonly valid: boolean;
    readonly error?: string;
    readonly parsed?: unknown;
}

export interface ValSchemaInput {
    readonly data: string;
    readonly schema: SchemaNode;
}

export interface SchemaError {
    readonly path: string;
    readonly message: string;
}

export interface ValSchemaOutput {
    readonly valid: boolean;
    readonly errors: SchemaError[];
}

export interface ValTypesInput {
    readonly path: string;
}

export interface TypeIssue {
    readonly line: number;
    readonly type: string;
    readonly message: string;
}

export interface ValTypesOutput {
    readonly issues: TypeIssue[];
    readonly score: number;
}

export interface ValLintInput {
    readonly path: string;
}

export interface LintFinding {
    readonly line: number;
    readonly rule: string;
    readonly message: string;
}

export interface ValLintOutput {
    readonly findings: LintFinding[];
    readonly clean: boolean;
}

// ─── JSON Schema subset types ─────────────────────────────────────────────────

type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface SchemaNode {
    readonly type?: SchemaType | SchemaType[];
    readonly required?: readonly string[];
    readonly properties?: Record<string, SchemaNode>;
    readonly items?: SchemaNode;
}

// ─── valJson ──────────────────────────────────────────────────────────────────

export function valJson(input: ValJsonInput): ValJsonOutput {
    try {
        const parsed: unknown = JSON.parse(input.text);
        return { valid: true, parsed };
    } catch (err) {
        const message = err instanceof SyntaxError ? err.message : String(err);
        return { valid: false, error: message };
    }
}

// ─── valSchema helpers ────────────────────────────────────────────────────────

function jsTypeOf(value: unknown): SchemaType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    const t = typeof value;
    if (t === 'string') return 'string';
    if (t === 'boolean') return 'boolean';
    if (t === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return 'object';
}

function matchesType(value: unknown, schemaType: SchemaType): boolean {
    const actual = jsTypeOf(value);
    if (schemaType === 'number') return actual === 'number' || actual === 'integer';
    return actual === schemaType;
}

function childPath(parent: string, key: string): string {
    return parent === '' ? key : `${parent}.${key}`;
}

function checkType(
    value: unknown,
    schema: SchemaNode,
    path: string,
    errors: SchemaError[],
): boolean {
    if (schema.type === undefined) return true;
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (types.some((t) => matchesType(value, t))) return true;
    errors.push({ path, message: `Expected type ${types.join(' | ')}, got ${jsTypeOf(value)}` });
    return false;
}

function checkRequired(
    obj: Record<string, unknown>,
    schema: SchemaNode,
    path: string,
    errors: SchemaError[],
): void {
    for (const key of schema.required ?? []) {
        if (!(key in obj)) {
            errors.push({
                path: childPath(path, key),
                message: `Missing required property "${key}"`,
            });
        }
    }
}

function checkProperties(
    obj: Record<string, unknown>,
    schema: SchemaNode,
    path: string,
    errors: SchemaError[],
): void {
    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
        if (key in obj) {
            validateNode(obj[key], propSchema, childPath(path, key), errors);
        }
    }
}

function checkItems(
    value: unknown[],
    schema: SchemaNode,
    path: string,
    errors: SchemaError[],
): void {
    if (schema.items === undefined) return;
    for (let i = 0; i < value.length; i++) {
        validateNode(value[i], schema.items, `${path}[${i}]`, errors);
    }
}

function validateNode(
    value: unknown,
    schema: SchemaNode,
    path: string,
    errors: SchemaError[],
): void {
    if (!checkType(value, schema, path, errors)) return;
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    if (isObject) {
        const obj = value as Record<string, unknown>;
        checkRequired(obj, schema, path, errors);
        checkProperties(obj, schema, path, errors);
    }
    if (Array.isArray(value)) checkItems(value, schema, path, errors);
}

// ─── valSchema ────────────────────────────────────────────────────────────────

export function valSchema(input: ValSchemaInput): ValSchemaOutput {
    let parsed: unknown;
    try {
        parsed = JSON.parse(input.data);
    } catch (err) {
        const message = err instanceof SyntaxError ? err.message : String(err);
        return { valid: false, errors: [{ path: '', message: `Invalid JSON: ${message}` }] };
    }

    const errors: SchemaError[] = [];
    validateNode(parsed, input.schema, '', errors);
    return { valid: errors.length === 0, errors };
}

// ─── valTypes ────────────────────────────────────────────────────────────────

// Detects `: any` type annotation
const rExplicitAny = /:\s*any\b/;
// Detects a function declaration (not arrow expression)
const rFunctionDecl = /^\s*(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/;
// Detects a return type annotation after the closing paren: ): Type
const rReturnType = /\)\s*:\s*\S/;
// Captures parameter list from a function declaration
const rParamCapture = /function\s+\w+\s*\(([^)]*)\)/;

function hasUntypedParams(paramStr: string): boolean {
    const params = paramStr
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    return params.some((p) => {
        if (p.startsWith('...') || p.startsWith('{') || p.startsWith('[')) return false;
        return !p.includes(':');
    });
}

function scanTypesLine(line: string, lineNo: number, issues: TypeIssue[]): void {
    if (rExplicitAny.test(line)) {
        issues.push({
            line: lineNo,
            type: 'explicit-any',
            message: 'Explicit `any` type annotation found',
        });
    }
    if (rFunctionDecl.test(line) && !rReturnType.test(line)) {
        issues.push({
            line: lineNo,
            type: 'missing-return-type',
            message: 'Function declaration missing return type annotation',
        });
    }
    const m = rParamCapture.exec(line);
    if (m?.[1] !== undefined && hasUntypedParams(m[1])) {
        issues.push({
            line: lineNo,
            type: 'implicit-any',
            message: 'Function parameter(s) without type annotation (implicit any)',
        });
    }
}

export async function valTypes(input: ValTypesInput): Promise<ValTypesOutput> {
    const fh = await open(input.path, 'r').catch(() => null);
    if (!fh) {
        return {
            issues: [{ line: 0, type: 'file-error', message: `Cannot open file: ${input.path}` }],
            score: 0,
        };
    }

    const issues: TypeIssue[] = [];
    try {
        const content = await fh.readFile('utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            scanTypesLine(lines[i] ?? '', i + 1, issues);
        }
    } finally {
        await fh.close();
    }

    const score = Math.max(0, 100 - issues.length * 10);
    return { issues, score };
}

// ─── valLint helpers ──────────────────────────────────────────────────────────

const rConsole = /\bconsole\s*\.\s*log\s*\(/;
const rDebugSt = /\bdebugger\b/;
const rTodo = /\b(?:TODO|FIXME)\b/;
const rImportLine = /^\s*import\s/;

function extractImportedNames(line: string): string[] {
    const braceMatch = /import\s*\{([^}]+)\}\s*from/.exec(line);
    if (braceMatch?.[1] !== undefined) {
        return braceMatch[1]
            .split(',')
            .map((s) => {
                const alias = /\bas\s+(\w+)/.exec(s.trim());
                return alias?.[1] ?? s.trim().split(/\s+/)[0] ?? '';
            })
            .filter((n) => n.length > 0);
    }
    const defaultMatch = /import\s+(\w+)\s+from/.exec(line);
    if (defaultMatch?.[1] !== undefined) return [defaultMatch[1]];
    const nsMatch = /import\s*\*\s*as\s+(\w+)\s+from/.exec(line);
    if (nsMatch?.[1] !== undefined) return [nsMatch[1]];
    return [];
}

function collectImports(lines: string[]): Map<string, number> {
    const importedNames = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (!rImportLine.test(line)) continue;
        for (const name of extractImportedNames(line)) {
            importedNames.set(name, i + 1);
        }
    }
    return importedNames;
}

function isUsed(name: string, importLine: number, lines: string[]): boolean {
    const wordRe = new RegExp(`\\b${name}\\b`);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (i + 1 === importLine || rImportLine.test(line)) continue;
        if (wordRe.test(line)) return true;
    }
    return false;
}

function findUnusedImports(importedNames: Map<string, number>, lines: string[]): LintFinding[] {
    const findings: LintFinding[] = [];
    for (const [name, importLine] of importedNames) {
        if (!isUsed(name, importLine, lines)) {
            findings.push({
                line: importLine,
                rule: 'unused-import',
                message: `Imported name "${name}" is never used`,
            });
        }
    }
    return findings;
}

function scanLintLine(line: string, lineNo: number, findings: LintFinding[]): void {
    if (rConsole.test(line))
        findings.push({ line: lineNo, rule: 'no-console-log', message: 'console.log() found' });
    if (rDebugSt.test(line))
        findings.push({ line: lineNo, rule: 'no-debugger', message: 'debugger statement found' });
    if (rTodo.test(line))
        findings.push({ line: lineNo, rule: 'todo-fixme', message: 'TODO/FIXME comment found' });
}

// ─── valLint ─────────────────────────────────────────────────────────────────

export async function valLint(input: ValLintInput): Promise<ValLintOutput> {
    const fh = await open(input.path, 'r').catch(() => null);
    if (!fh) {
        return {
            findings: [{ line: 0, rule: 'file-error', message: `Cannot open file: ${input.path}` }],
            clean: false,
        };
    }

    const findings: LintFinding[] = [];
    try {
        const content = await fh.readFile('utf-8');
        const lines = content.split('\n');
        const importedNames = collectImports(lines);
        findings.push(...findUnusedImports(importedNames, lines));
        for (let i = 0; i < lines.length; i++) {
            scanLintLine(lines[i] ?? '', i + 1, findings);
        }
    } finally {
        await fh.close();
    }

    findings.sort((a, b) => a.line - b.line);
    return { findings, clean: findings.length === 0 };
}
