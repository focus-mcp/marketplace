// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { exec } from 'node:child_process';
import { open, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { Program } from 'php-parser';
import phpParserDefault from 'php-parser';

const execAsync = promisify(exec);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchLocation {
    line: number;
    contextSnippet: string;
}

export interface CeReplaceBodyInput {
    readonly path: string;
    readonly name: string;
    readonly newBody: string;
    readonly apply?: boolean;
    readonly dryRun?: boolean;
}

export interface CeReplaceBodyOutput {
    found: boolean;
    startLine: number;
    endLine: number;
    error?: string;
    syntaxError?: string;
    preview: {
        before: string;
        after: string;
    };
}

export interface CeInsertAfterInput {
    readonly path: string;
    readonly after?: number;
    readonly pattern?: string;
    readonly lineHint?: number;
    readonly content: string;
    readonly apply?: boolean;
    readonly dryRun?: boolean;
}

export interface CeInsertOutput {
    inserted: boolean;
    atLine: number;
    preview: string;
    matches?: MatchLocation[];
    error?: string;
    syntaxError?: string;
    diff?: string;
}

export interface CeInsertBeforeInput {
    readonly path: string;
    readonly before?: number;
    readonly pattern?: string;
    readonly lineHint?: number;
    readonly content: string;
    readonly apply?: boolean;
    readonly dryRun?: boolean;
}

export interface CeDeleteSafeInput {
    readonly path: string;
    readonly name: string;
    readonly dir?: string;
    readonly force?: boolean;
    readonly apply?: boolean;
    readonly dryRun?: boolean;
}

export interface CeDeleteSafeOutput {
    deleted: boolean;
    blocked: boolean;
    linesRemoved: number;
    dependents: string[];
    error?: string;
    syntaxError?: string;
    diff?: string;
}

// ─── Language detection ───────────────────────────────────────────────────────

type Language = 'typescript' | 'javascript' | 'php' | 'python' | 'go' | 'rust' | 'java' | 'unknown';

export const SUPPORTED_LANGUAGES: Language[] = [
    'typescript',
    'javascript',
    'php',
    'python',
    'go',
    'rust',
    'java',
];

export function detectLanguage(filePath: string): Language {
    const ext = extname(filePath).toLowerCase();
    const map: Record<string, Language> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.mts': 'typescript',
        '.cts': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.php': 'php',
        '.py': 'python',
        '.go': 'go',
        '.rs': 'rust',
        '.java': 'java',
    };
    return map[ext] ?? 'unknown';
}

// ─── Syntax checker helpers ───────────────────────────────────────────────────

function isMissingBinary(err: unknown): boolean {
    const e = err as NodeJS.ErrnoException & { exitCode?: number };
    // code=ENOENT: binary not found by node
    // code=127 (number from exec): shell reports "command not found"
    // code='127' (string): alternative encoding
    return (
        e.code === 'ENOENT' || e.code === '127' || (e.code as unknown) === 127 || e.exitCode === 127
    );
}

async function checkPhpSyntax(filePath: string): Promise<string | null> {
    let stdout = '';
    let stderr = '';
    try {
        const r = await execAsync(`php -l "${filePath}"`);
        stdout = r.stdout;
        stderr = r.stderr;
    } catch (e) {
        if (isMissingBinary(e)) return null;
        const err = e as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
        stdout = err.stdout ?? '';
        stderr = err.stderr ?? '';
        if (!stdout && !stderr) return null;
    }
    const output = stdout + stderr;
    return output.includes('No syntax errors detected') ? null : output.trim() || null;
}

async function checkStderrSyntax(cmd: string): Promise<string | null> {
    let stderr = '';
    try {
        await execAsync(cmd);
    } catch (e) {
        if (isMissingBinary(e)) return null;
        stderr = (e as NodeJS.ErrnoException & { stderr?: string }).stderr ?? '';
        if (!stderr) return null;
    }
    return stderr ? stderr.trim() : null;
}

// ─── Syntax checker ───────────────────────────────────────────────────────────

export async function checkSyntax(filePath: string, language: Language): Promise<string | null> {
    try {
        if (language === 'php') return checkPhpSyntax(filePath);
        if (language === 'python') {
            return checkStderrSyntax(
                `python3 -c "import ast, sys; ast.parse(open(sys.argv[1]).read())" "${filePath}"`,
            );
        }
        if (language === 'javascript') return checkStderrSyntax(`node --check "${filePath}"`);
        // typescript: tsc needs a full project config; skip for now
        return null;
    } catch {
        return null;
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readFileText(filePath: string): Promise<string | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

export function makeDiff(originalLines: string[], newLines: string[], filePath: string): string {
    const diff: string[] = [`--- ${filePath}`, `+++ ${filePath} (modified)`];
    const maxLen = Math.max(originalLines.length, newLines.length);
    let inHunk = false;
    for (let i = 0; i < maxLen; i++) {
        const orig = originalLines[i];
        const next = newLines[i];
        if (orig !== next) {
            if (!inHunk) {
                diff.push(`@@ -${i + 1} @@`);
                inHunk = true;
            }
            if (orig !== undefined) diff.push(`-${orig}`);
            if (next !== undefined) diff.push(`+${next}`);
        } else {
            inHunk = false;
        }
    }
    return diff.join('\n');
}

// ─── PHP AST function finder ──────────────────────────────────────────────────

interface AstNode {
    kind?: string;
    name?: string | { name?: string };
    loc?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
    [key: string]: unknown;
}

interface PhpFunctionBounds {
    startLine: number;
    endLine: number;
    bodyStart: number;
    bodyEnd: number;
}

function isAstNode(v: unknown): v is AstNode {
    return v !== null && typeof v === 'object' && typeof (v as AstNode).kind === 'string';
}

function collectAstChildren(node: AstNode): AstNode[] {
    const children: AstNode[] = [];
    for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'kind') continue;
        const val = node[key];
        if (Array.isArray(val)) {
            children.push(...(val as unknown[]).filter(isAstNode));
        } else if (isAstNode(val)) {
            children.push(val);
        }
    }
    return children;
}

function phpBodyStart(text: string, startLine: number): number {
    const textLines = text.split('\n');
    for (let i = startLine - 1; i < Math.min(startLine + 5, textLines.length); i++) {
        if ((textLines[i] ?? '').includes('{')) return i + 1;
    }
    return startLine;
}

function findPhpNode(
    nodes: AstNode[],
    name: string,
    lineOffset: number,
    text: string,
): PhpFunctionBounds | null {
    for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const kind = node.kind as string;
        const nodeName =
            typeof node.name === 'string'
                ? node.name
                : ((node.name as { name?: string })?.name ?? '');
        if ((kind === 'function' || kind === 'method') && nodeName === name && node.loc) {
            const startLine = (node.loc.start.line as number) + lineOffset;
            const endLine = (node.loc.end.line as number) + lineOffset;
            return {
                startLine,
                endLine,
                bodyStart: phpBodyStart(text, startLine),
                bodyEnd: endLine,
            };
        }
        const found = findPhpNode(collectAstChildren(node), name, lineOffset, text);
        if (found) return found;
    }
    return null;
}

export function findPhpFunctionBounds(text: string, name: string): PhpFunctionBounds | null {
    try {
        // php-parser exports its constructor as the default — cast to get newable type
        const PhpEngine = phpParserDefault as unknown as new (
            options: unknown,
        ) => {
            parseCode(buffer: string, filename: string): Program;
        };
        const parser = new PhpEngine({
            parser: { extractDoc: true, php7: true, suppressErrors: true },
            ast: { withPositions: true },
        });

        // php-parser requires <?php tag; if bare code, prepend it and track offset
        const hasTag = text.trimStart().startsWith('<?');
        const code = hasTag ? text : `<?php\n${text}`;
        const lineOffset = hasTag ? 0 : -1;

        const ast = parser.parseCode(code, 'file.php');
        return findPhpNode(ast.children as unknown as AstNode[], name, lineOffset, text);
    } catch {
        return null;
    }
}

// ─── TS/JS/Generic function finder ───────────────────────────────────────────

function makeFunctionPatterns(name: string): RegExp[] {
    return [
        // TS/JS: function declaration
        new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*[(<]`),
        // TS/JS: const arrow
        new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:async\\s*)?(?:\\(|[a-zA-Z_$])`),
        // Python
        new RegExp(`^\\s*(?:async\\s+)?def\\s+${name}\\s*\\(`),
        // Java/Go: visibility + return type + name(
        new RegExp(
            `^\\s*(?:(?:public|private|protected|static|async|override|abstract|final|pub|fn)\\s+)*(?:\\w[\\w.<>\\[\\]]*\\s+)?${name}\\s*[(<]`,
        ),
    ];
}

function findDeclarationLine(lines: string[], patterns: RegExp[]): number {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (patterns.some((p) => p.test(line))) return i;
    }
    return -1;
}

function findOpeningBrace(lines: string[], from: number): number {
    for (let i = from; i < Math.min(from + 10, lines.length); i++) {
        if ((lines[i] ?? '').includes('{')) return i;
    }
    return -1;
}

function findClosingBrace(lines: string[], from: number): number {
    let depth = 0;
    for (let i = from; i < lines.length; i++) {
        for (const ch of lines[i] ?? '') {
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) return i;
            }
        }
    }
    return -1;
}

/**
 * Find the start and end line (1-based, inclusive) of a function/method
 * by name, using brace counting. For PHP, use findPhpFunctionBounds instead.
 */
export function findFunctionBounds(
    lines: string[],
    name: string,
): { startLine: number; endLine: number; bodyStart: number; bodyEnd: number } | null {
    const patterns = makeFunctionPatterns(name);
    const declLine = findDeclarationLine(lines, patterns);
    if (declLine === -1) return null;

    const braceStart = findOpeningBrace(lines, declLine);
    if (braceStart === -1) return null;

    const braceEnd = findClosingBrace(lines, braceStart);
    if (braceEnd === -1) return null;

    return {
        startLine: declLine + 1,
        endLine: braceEnd + 1,
        bodyStart: braceStart + 1,
        bodyEnd: braceEnd + 1,
    };
}

function findFunctionBoundsForFile(
    text: string,
    lines: string[],
    name: string,
    language: Language,
): { startLine: number; endLine: number; bodyStart: number; bodyEnd: number } | null {
    if (language === 'php') {
        return findPhpFunctionBounds(text, name);
    }
    return findFunctionBounds(lines, name);
}

// ─── Pattern matching with ambiguity detection ────────────────────────────────

interface PatternMatch {
    index: number;
    line: number;
    contextSnippet: string;
}

function findPatternMatches(lines: string[], pattern: string): PatternMatch[] {
    const re = new RegExp(pattern);
    const matches: PatternMatch[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i] ?? '')) {
            matches.push({ index: i, line: i + 1, contextSnippet: (lines[i] ?? '').trim() });
        }
    }
    return matches;
}

type ResolvePatternResult =
    | { ok: true; index: number }
    | { ok: false; noMatch: true }
    | { ok: false; ambiguous: true; matches: MatchLocation[] };

function resolvePatternIndex(
    lines: string[],
    pattern: string,
    lineHint: number | undefined,
): ResolvePatternResult {
    const matches = findPatternMatches(lines, pattern);
    if (matches.length === 0) return { ok: false, noMatch: true };
    if (matches.length === 1) return { ok: true, index: (matches[0] as PatternMatch).index };
    if (typeof lineHint === 'number') {
        const closest = matches.reduce((best, m) =>
            Math.abs(m.line - lineHint) < Math.abs(best.line - lineHint) ? m : best,
        );
        return { ok: true, index: closest.index };
    }
    return {
        ok: false,
        ambiguous: true,
        matches: matches.map((m) => ({ line: m.line, contextSnippet: m.contextSnippet })),
    };
}

// ─── Source file collector (dependents check) ─────────────────────────────────

const TS_JS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

async function collectSourceFiles(dir: string, results: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectSourceFiles(full, results);
        } else if (TS_JS_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

async function findDependents(name: string, dir: string, excludePath: string): Promise<string[]> {
    const files: string[] = [];
    await collectSourceFiles(resolve(dir), files);

    const dependents: string[] = [];
    const importPattern = new RegExp(
        `(?:import\\s+(?:\\{[^}]*\\b${name}\\b[^}]*\\}|${name})\\s+from|\\b${name}\\b)`,
    );

    for (const fp of files) {
        if (resolve(fp) === resolve(excludePath)) continue;
        const text = await readFileText(fp);
        if (text && importPattern.test(text)) {
            dependents.push(relative(resolve(dir), fp));
        }
    }

    return dependents;
}

// ─── ceReplaceBody ────────────────────────────────────────────────────────────

export async function ceReplaceBody(input: CeReplaceBodyInput): Promise<CeReplaceBodyOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { found: false, startLine: 0, endLine: 0, preview: { before: '', after: '' } };
    }

    const language = detectLanguage(filePath);
    const lines = text.split('\n');
    const bounds = findFunctionBoundsForFile(text, lines, input.name, language);

    if (!bounds) {
        if (language === 'unknown') {
            return {
                found: false,
                startLine: 0,
                endLine: 0,
                error: `Language not supported for AST parsing. Supported: ${SUPPORTED_LANGUAGES.join(', ')}.`,
                preview: { before: '', after: '' },
            };
        }
        return { found: false, startLine: 0, endLine: 0, preview: { before: '', after: '' } };
    }

    const { startLine, endLine, bodyStart, bodyEnd } = bounds;
    const beforeLines = lines.slice(0, bodyStart - 1);
    const afterLines = lines.slice(bodyEnd);

    const openBraceLine = lines[bodyStart - 1] ?? '';
    const braceIndent = openBraceLine.match(/^(\s*)/)?.[1] ?? '';

    const newLines = [
        ...beforeLines,
        `${braceIndent}{`,
        input.newBody,
        `${braceIndent}}`,
        ...afterLines,
    ];

    const newText = newLines.join('\n');
    const previewBefore = lines.slice(startLine - 1, endLine).join('\n');
    const newEndLine = bodyStart + 2;
    const previewAfter = newLines.slice(startLine - 1, newEndLine).join('\n');

    if (input.dryRun) {
        return {
            found: true,
            startLine,
            endLine,
            preview: { before: previewBefore, after: previewAfter },
        };
    }

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
        const syntaxErr = await checkSyntax(filePath, language);
        if (syntaxErr) {
            await writeFile(filePath, text, 'utf-8');
            return {
                found: true,
                startLine,
                endLine,
                syntaxError: `Post-edit syntax check failed (rolled back): ${syntaxErr}`,
                preview: { before: previewBefore, after: previewAfter },
            };
        }
    }

    return {
        found: true,
        startLine,
        endLine,
        preview: { before: previewBefore, after: previewAfter },
    };
}

// ─── ceInsertAfter ────────────────────────────────────────────────────────────

export async function ceInsertAfter(input: CeInsertAfterInput): Promise<CeInsertOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const language = detectLanguage(filePath);
    const lines = text.split('\n');
    let insertAfterIndex = -1;

    if (typeof input.after === 'number') {
        insertAfterIndex = Math.min(input.after, lines.length) - 1;
    } else if (input.pattern) {
        const result = resolvePatternIndex(lines, input.pattern, input.lineHint);
        if (!result.ok) {
            if ('ambiguous' in result) {
                return {
                    inserted: false,
                    atLine: 0,
                    preview: '',
                    matches: result.matches,
                    error: `Ambiguous pattern: ${result.matches.length} matches found. Provide lineHint to disambiguate.`,
                };
            }
            return { inserted: false, atLine: 0, preview: '' };
        }
        insertAfterIndex = result.index;
    }

    if (insertAfterIndex === -1) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const insertLine = insertAfterIndex + 1;
    const newLines = [
        ...lines.slice(0, insertAfterIndex + 1),
        input.content,
        ...lines.slice(insertAfterIndex + 1),
    ];

    const newText = newLines.join('\n');
    const previewStart = Math.max(0, insertAfterIndex - 1);
    const previewEnd = Math.min(newLines.length, insertAfterIndex + 3);
    const preview = newLines.slice(previewStart, previewEnd).join('\n');

    if (input.dryRun) {
        const diff = makeDiff(lines, newLines, filePath);
        return { inserted: true, atLine: insertLine + 1, preview, diff };
    }

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
        const syntaxErr = await checkSyntax(filePath, language);
        if (syntaxErr) {
            await writeFile(filePath, text, 'utf-8');
            return {
                inserted: true,
                atLine: insertLine + 1,
                preview,
                syntaxError: `Post-edit syntax check failed (rolled back): ${syntaxErr}`,
            };
        }
    }

    return { inserted: true, atLine: insertLine + 1, preview };
}

// ─── ceInsertBefore ───────────────────────────────────────────────────────────

export async function ceInsertBefore(input: CeInsertBeforeInput): Promise<CeInsertOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const language = detectLanguage(filePath);
    const lines = text.split('\n');
    let insertBeforeIndex = -1;

    if (typeof input.before === 'number') {
        insertBeforeIndex = Math.min(input.before - 1, lines.length - 1);
    } else if (input.pattern) {
        const result = resolvePatternIndex(lines, input.pattern, input.lineHint);
        if (!result.ok) {
            if ('ambiguous' in result) {
                return {
                    inserted: false,
                    atLine: 0,
                    preview: '',
                    matches: result.matches,
                    error: `Ambiguous pattern: ${result.matches.length} matches found. Provide lineHint to disambiguate.`,
                };
            }
            return { inserted: false, atLine: 0, preview: '' };
        }
        insertBeforeIndex = result.index;
    }

    if (insertBeforeIndex === -1) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const newLines = [
        ...lines.slice(0, insertBeforeIndex),
        input.content,
        ...lines.slice(insertBeforeIndex),
    ];

    const newText = newLines.join('\n');
    const previewStart = Math.max(0, insertBeforeIndex - 1);
    const previewEnd = Math.min(newLines.length, insertBeforeIndex + 3);
    const preview = newLines.slice(previewStart, previewEnd).join('\n');

    if (input.dryRun) {
        const diff = makeDiff(lines, newLines, filePath);
        return { inserted: true, atLine: insertBeforeIndex + 1, preview, diff };
    }

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
        const syntaxErr = await checkSyntax(filePath, language);
        if (syntaxErr) {
            await writeFile(filePath, text, 'utf-8');
            return {
                inserted: true,
                atLine: insertBeforeIndex + 1,
                preview,
                syntaxError: `Post-edit syntax check failed (rolled back): ${syntaxErr}`,
            };
        }
    }

    return { inserted: true, atLine: insertBeforeIndex + 1, preview };
}

// ─── ceDeleteSafe ─────────────────────────────────────────────────────────────

export async function ceDeleteSafe(input: CeDeleteSafeInput): Promise<CeDeleteSafeOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { deleted: false, blocked: false, linesRemoved: 0, dependents: [] };
    }

    let dependents: string[] = [];
    if (input.dir) {
        dependents = await findDependents(input.name, input.dir, filePath);
    }

    if (dependents.length > 0 && !input.force) {
        return { deleted: false, blocked: true, linesRemoved: 0, dependents };
    }

    const language = detectLanguage(filePath);
    const lines = text.split('\n');
    const bounds = findFunctionBoundsForFile(text, lines, input.name, language);

    if (!bounds) {
        return { deleted: false, blocked: false, linesRemoved: 0, dependents };
    }

    const { startLine, endLine } = bounds;
    const linesRemoved = endLine - startLine + 1;
    const newLines = [...lines.slice(0, startLine - 1), ...lines.slice(endLine)];
    const newText = newLines.join('\n');

    if (input.dryRun) {
        const diff = makeDiff(lines, newLines, filePath);
        return { deleted: true, blocked: false, linesRemoved, dependents, diff };
    }

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
        const syntaxErr = await checkSyntax(filePath, language);
        if (syntaxErr) {
            await writeFile(filePath, text, 'utf-8');
            return {
                deleted: false,
                blocked: false,
                linesRemoved: 0,
                dependents,
                syntaxError: `Post-edit syntax check failed (rolled back): ${syntaxErr}`,
            };
        }
    }

    return { deleted: true, blocked: false, linesRemoved, dependents };
}
