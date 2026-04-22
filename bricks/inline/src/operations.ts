// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InlInlineInput {
    readonly path: string;
    readonly name: string;
    readonly apply?: boolean;
}

export interface InlInlineOutput {
    readonly inlined: boolean;
    readonly usagesReplaced: number;
    readonly definitionRemoved: boolean;
    readonly preview: string;
}

export interface InlExtractInput {
    readonly path: string;
    readonly startLine: number;
    readonly endLine: number;
    readonly functionName: string;
    readonly apply?: boolean;
}

export interface InlExtractOutput {
    readonly extracted: boolean;
    readonly functionSignature: string;
    readonly params: string[];
    readonly preview: string;
}

export interface InlMoveInput {
    readonly sourcePath: string;
    readonly targetPath: string;
    readonly name: string;
    readonly apply?: boolean;
}

export interface InlMoveOutput {
    readonly moved: boolean;
    readonly sourceUpdated: boolean;
    readonly targetUpdated: boolean;
    readonly preview: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRelativePath(from: string, to: string): string {
    const fromDir = dirname(resolve(from));
    const toAbs = resolve(to);
    let rel = relative(fromDir, toAbs);
    rel = rel.replace(/\.(ts|tsx|js|jsx|mts|mjs)$/, '');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return rel;
}

/** Collect all matches of a regex into an array (avoids assign-in-while). */
function execAll(re: RegExp, str: string): RegExpExecArray[] {
    const results: RegExpExecArray[] = [];
    let m = re.exec(str);
    while (m !== null) {
        results.push(m);
        m = re.exec(str);
    }
    return results;
}

/** Collect all group-1 captures into a Set. */
function collectCaptures(re: RegExp, str: string): Set<string> {
    const set = new Set<string>();
    for (const m of execAll(re, str)) {
        if (m[1]) set.add(m[1]);
    }
    return set;
}

// ─── inlInline — definition finding ─────────────────────────────────────────

interface DefinitionMatch {
    lineIndex: number;
    replacement: string;
    isFunction: boolean;
    params: string[];
}

function splitParams(raw: string): string[] {
    return raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
}

function matchLineDefinition(
    trimmed: string,
    lineIndex: number,
    esc: string,
): DefinitionMatch | null {
    const arrowPattern = new RegExp(
        `^(?:export\\s+)?const\\s+${esc}\\s*=\\s*(?:\\(([^)]*)\\)|([\\w]+))\\s*=>\\s*(.+?);?\\s*$`,
    );
    const funcPattern = new RegExp(
        `^(?:export\\s+)?function\\s+${esc}\\s*\\(([^)]*)\\)\\s*(?::\\s*\\S+\\s*)?\\{\\s*return\\s+(.+?);?\\s*\\}\\s*$`,
    );
    const constPattern = new RegExp(`^(?:export\\s+)?const\\s+${esc}\\s*=\\s*(.+?);?\\s*$`);

    const arrowMatch = arrowPattern.exec(trimmed);
    if (arrowMatch) {
        return {
            lineIndex,
            replacement: arrowMatch[3] ?? '',
            isFunction: true,
            params: splitParams(arrowMatch[1] ?? arrowMatch[2] ?? ''),
        };
    }

    const funcMatch = funcPattern.exec(trimmed);
    if (funcMatch) {
        return {
            lineIndex,
            replacement: funcMatch[2] ?? '',
            isFunction: true,
            params: splitParams(funcMatch[1] ?? ''),
        };
    }

    const constMatch = constPattern.exec(trimmed);
    if (constMatch) {
        const val = constMatch[1] ?? '';
        if (!val.includes('=>')) {
            return { lineIndex, replacement: val.trim(), isFunction: false, params: [] };
        }
    }

    return null;
}

function findDefinition(lines: string[], name: string): DefinitionMatch | null {
    const esc = escapeRegex(name);
    for (let i = 0; i < lines.length; i++) {
        const match = matchLineDefinition((lines[i] ?? '').trim(), i, esc);
        if (match) return match;
    }
    return null;
}

/** Replace usages of a plain const value in a single line. */
function replaceConstUsages(
    line: string,
    name: string,
    replacement: string,
): { result: string; count: number } {
    const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g');
    const count = (line.match(pattern) ?? []).length;
    return { result: count > 0 ? line.replace(pattern, replacement) : line, count };
}

/** Replace call-site usages of a function in a single line. */
function replaceFunctionUsages(
    line: string,
    name: string,
    replacement: string,
    params: string[],
): { result: string; count: number } {
    const callPattern = new RegExp(`\\b${escapeRegex(name)}\\s*\\(([^)]*)\\)`, 'g');
    const allMatches = execAll(callPattern, line);
    let result = line;

    for (const match of allMatches) {
        const callArgs = match[1]
            ? match[1]
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
            : [];
        let expr = replacement;
        for (let p = 0; p < params.length; p++) {
            const paramName = params[p];
            if (paramName) {
                expr = expr.replace(
                    new RegExp(`\\b${escapeRegex(paramName)}\\b`, 'g'),
                    callArgs[p] ?? 'undefined',
                );
            }
        }
        result = result.replace(match[0], expr);
    }
    return { result, count: allMatches.length };
}

// ─── inlInline ───────────────────────────────────────────────────────────────

export async function inlInline(input: InlInlineInput): Promise<InlInlineOutput> {
    const content = await readFile(input.path, 'utf-8');
    const lines = content.split('\n');
    const def = findDefinition(lines, input.name);

    if (!def) {
        return {
            inlined: false,
            usagesReplaced: 0,
            definitionRemoved: false,
            preview: `Definition of '${input.name}' not found (only simple single-line const/function supported).`,
        };
    }

    let usagesReplaced = 0;
    const newLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (i === def.lineIndex) continue;
        const line = lines[i] ?? '';
        if (!def.isFunction) {
            const { result, count } = replaceConstUsages(line, input.name, def.replacement);
            usagesReplaced += count;
            newLines.push(result);
        } else {
            const { result, count } = replaceFunctionUsages(
                line,
                input.name,
                def.replacement,
                def.params,
            );
            usagesReplaced += count;
            newLines.push(result);
        }
    }

    const preview = newLines.join('\n');
    if (input.apply === true) await writeFile(input.path, preview, 'utf-8');

    return { inlined: true, usagesReplaced, definitionRemoved: true, preview };
}

// ─── inlExtract — helpers ────────────────────────────────────────────────────

const JS_KEYWORDS = new Set([
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'true',
    'false',
    'null',
    'undefined',
    'new',
    'this',
    'typeof',
    'instanceof',
    'import',
    'export',
    'class',
    'extends',
    'async',
    'await',
    'of',
    'in',
    'try',
    'catch',
    'throw',
    'finally',
    'switch',
    'case',
    'break',
    'continue',
    'console',
    'Math',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
]);

function detectParams(selectedCode: string, beforeCode: string, functionName: string): string[] {
    const declPattern = /(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const innerPattern = /(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const identPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

    const declaredBefore = collectCaptures(declPattern, beforeCode);
    const innerDeclared = collectCaptures(innerPattern, selectedCode);
    const usedIdents = collectCaptures(identPattern, selectedCode);

    const excluded = new Set([...JS_KEYWORDS, functionName]);
    const params: string[] = [];
    for (const ident of usedIdents) {
        if (!excluded.has(ident) && declaredBefore.has(ident) && !innerDeclared.has(ident)) {
            params.push(ident);
        }
    }
    return params;
}

// ─── inlExtract ──────────────────────────────────────────────────────────────

export async function inlExtract(input: InlExtractInput): Promise<InlExtractOutput> {
    const content = await readFile(input.path, 'utf-8');
    const lines = content.split('\n');
    const start = input.startLine - 1;
    const end = input.endLine - 1;

    if (start < 0 || end >= lines.length || start > end) {
        return {
            extracted: false,
            functionSignature: '',
            params: [],
            preview: `Invalid line range ${input.startLine}..${input.endLine} (file has ${lines.length} lines).`,
        };
    }

    const selectedLines = lines.slice(start, end + 1);
    const selectedCode = selectedLines.join('\n');
    const beforeCode = lines.slice(0, start).join('\n');
    const params = detectParams(selectedCode, beforeCode, input.functionName);

    const paramList = params.join(', ');
    const functionSignature = `function ${input.functionName}(${paramList})`;

    const firstLine = selectedLines[0] ?? '';
    const indent = /^(\s*)/.exec(firstLine)?.[1] ?? '';

    const funcLines = [
        `${indent}${functionSignature} {`,
        ...selectedLines.map((l) => `    ${l}`),
        `${indent}}`,
    ];
    const callLine = `${indent}${input.functionName}(${paramList});`;

    const newLines = [...lines.slice(0, start), ...funcLines, callLine, ...lines.slice(end + 1)];
    const preview = newLines.join('\n');

    if (input.apply === true) await writeFile(input.path, preview, 'utf-8');

    return {
        extracted: true,
        functionSignature: `${functionSignature} { ... }`,
        params,
        preview,
    };
}

// ─── inlMove — helpers ───────────────────────────────────────────────────────

function countBraces(line: string, depth: number): { depth: number; foundOpen: boolean } {
    let d = depth;
    let foundOpen = false;
    for (const ch of line) {
        if (ch === '{') {
            d++;
            foundOpen = true;
        } else if (ch === '}') {
            d--;
        }
    }
    return { depth: d, foundOpen };
}

function isSingleLineArrow(line: string): boolean {
    return line.includes('=>') && line.trimEnd().endsWith(';');
}

function scanBlockEnd(lines: string[], blockStart: number): number {
    let depth = 0;
    let foundOpen = false;

    for (let i = blockStart; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const result = countBraces(line, depth);
        depth = result.depth;
        if (result.foundOpen) foundOpen = true;
        if (foundOpen && depth === 0) return i;
        if (i === blockStart && !foundOpen && isSingleLineArrow(line)) return i;
    }
    return blockStart;
}

function findBlockStart(
    lines: string[],
    name: string,
): { index: number; wasExported: boolean } | null {
    const esc = escapeRegex(name);
    const startPattern = new RegExp(
        `^(export\\s+)?((?:async\\s+)?function\\s+${esc}\\s*\\(|const\\s+${esc}\\s*=)`,
    );
    for (let i = 0; i < lines.length; i++) {
        const match = startPattern.exec((lines[i] ?? '').trim());
        if (match) return { index: i, wasExported: Boolean(match[1]) };
    }
    return null;
}

function findBlockBounds(
    lines: string[],
    name: string,
): { blockStart: number; blockEnd: number; wasExported: boolean } | null {
    const found = findBlockStart(lines, name);
    if (!found) return null;
    return {
        blockStart: found.index,
        blockEnd: scanBlockEnd(lines, found.index),
        wasExported: found.wasExported,
    };
}

// ─── inlMove ─────────────────────────────────────────────────────────────────

export async function inlMove(input: InlMoveInput): Promise<InlMoveOutput> {
    const sourceContent = await readFile(input.sourcePath, 'utf-8');
    const sourceLines = sourceContent.split('\n');

    const bounds = findBlockBounds(sourceLines, input.name);
    if (!bounds) {
        return {
            moved: false,
            sourceUpdated: false,
            targetUpdated: false,
            preview: `Function '${input.name}' not found in ${input.sourcePath}.`,
        };
    }

    const { blockStart, blockEnd, wasExported } = bounds;
    const funcLines = sourceLines.slice(blockStart, blockEnd + 1);
    let funcBlock = funcLines.join('\n');

    if (!wasExported) {
        funcBlock = funcBlock.replace(/^((?:async\s+)?function\s+|const\s+)/, 'export $1');
    }

    const remainingLines = [
        ...sourceLines.slice(0, blockStart),
        ...sourceLines.slice(blockEnd + 1),
    ];
    let finalSourceContent = remainingLines.join('\n');

    if (wasExported) {
        const relPath = buildRelativePath(input.sourcePath, input.targetPath);
        finalSourceContent = `import { ${input.name} } from '${relPath}';\n${finalSourceContent}`;
    }

    let targetContent = '';
    try {
        targetContent = await readFile(input.targetPath, 'utf-8');
    } catch {
        // target may not exist yet
    }

    const sep = targetContent.endsWith('\n') || targetContent === '' ? '' : '\n';
    const newTargetContent = `${targetContent}${sep}\n${funcBlock}\n`;

    const preview = [
        `--- source: ${input.sourcePath} ---`,
        finalSourceContent,
        `--- target: ${input.targetPath} ---`,
        newTargetContent,
    ].join('\n');

    if (input.apply === true) {
        await writeFile(input.sourcePath, finalSourceContent, 'utf-8');
        await writeFile(input.targetPath, newTargetContent, 'utf-8');
    }

    return { moved: true, sourceUpdated: true, targetUpdated: true, preview };
}
