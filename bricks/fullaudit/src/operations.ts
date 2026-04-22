// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckKind = 'code' | 'security' | 'architecture';

export interface RunInput {
    readonly dir: string;
    readonly checks?: readonly string[];
}

export interface CodeFinding {
    readonly file: string;
    readonly kind: 'long-function' | 'any-usage' | 'console-log' | 'todo';
    readonly line: number;
    readonly detail: string;
}

export interface SecurityFinding {
    readonly file: string;
    readonly kind: 'eval-usage' | 'hardcoded-secret';
    readonly line: number;
    readonly detail: string;
}

export interface AuditResult {
    readonly dir: string;
    readonly files: readonly string[];
    readonly checks: readonly CheckKind[];
    readonly codeFindings: readonly CodeFinding[];
    readonly securityFindings: readonly SecurityFinding[];
    readonly score: number;
    readonly scannedAt: string;
}

export interface RunOutput {
    readonly files: readonly string[];
    readonly codeFindings: readonly CodeFinding[];
    readonly securityFindings: readonly SecurityFinding[];
    readonly score: number;
    readonly checks: readonly CheckKind[];
}

export interface ReportInput {
    readonly format?: string;
}

export interface ReportOutput {
    readonly report: string;
    readonly format: string;
}

// ─── Internal state ───────────────────────────────────────────────────────────

let lastAudit: AuditResult | null = null;

export function resetAudit(): void {
    lastAudit = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_CHECKS: readonly CheckKind[] = ['code', 'security', 'architecture'];
const SECRET_PATTERN =
    /(?:password|secret|token|api_?key|apikey)\s*[:=]\s*['"](?!process\.env)[^'"]{6,}/i;
const LONG_FUNCTION_THRESHOLD = 60;

function resolveChecks(raw: readonly string[] | undefined): readonly CheckKind[] {
    if (raw === undefined || raw.length === 0) {
        return [...VALID_CHECKS];
    }
    return raw.filter((c): c is CheckKind => VALID_CHECKS.includes(c as CheckKind));
}

async function collectFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    async function walk(current: string): Promise<void> {
        let entries: import('node:fs').Dirent[];
        try {
            entries = (await readdir(current, {
                withFileTypes: true,
            })) as import('node:fs').Dirent[];
        } catch {
            return;
        }

        for (const entry of entries) {
            const name = entry.name.toString();
            if (name.startsWith('.') || name === 'node_modules') continue;
            const full = join(current, name);
            if (entry.isDirectory()) {
                await walk(full);
            } else if (/\.[tj]sx?$/.test(name)) {
                results.push(full);
            }
        }
    }

    await walk(dir);
    return results;
}

function scanSimpleCodeFindings(
    file: string,
    lines: readonly string[],
    findings: CodeFinding[],
): void {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNum = i + 1;
        if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
            findings.push({ file, kind: 'any-usage', line: lineNum, detail: line.trim() });
        }
        if (/console\.log\s*\(/.test(line)) {
            findings.push({ file, kind: 'console-log', line: lineNum, detail: line.trim() });
        }
        if (/\b(?:TODO|FIXME)\b/.test(line)) {
            findings.push({ file, kind: 'todo', line: lineNum, detail: line.trim() });
        }
    }
}

function countBraces(line: string): number {
    let delta = 0;
    for (const ch of line) {
        if (ch === '{') delta++;
        else if (ch === '}') delta--;
    }
    return delta;
}

function checkLongFunction(
    file: string,
    functionStartLine: number,
    lineNum: number,
    findings: CodeFinding[],
): void {
    const length = lineNum - functionStartLine;
    if (length > LONG_FUNCTION_THRESHOLD) {
        findings.push({
            file,
            kind: 'long-function',
            line: functionStartLine,
            detail: `Function spans ${length} lines (threshold: ${LONG_FUNCTION_THRESHOLD})`,
        });
    }
}

function scanFunctionLengths(
    file: string,
    lines: readonly string[],
    findings: CodeFinding[],
): void {
    let functionStartLine = -1;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNum = i + 1;

        if (/\bfunction\b|\barrow\b|=>\s*\{/.test(line) && line.includes('{')) {
            functionStartLine = lineNum;
            braceDepth = 1;
        } else if (functionStartLine > 0) {
            braceDepth += countBraces(line);
            if (braceDepth <= 0) {
                checkLongFunction(file, functionStartLine, lineNum, findings);
                functionStartLine = -1;
                braceDepth = 0;
            }
        }
    }
}

function scanCodeFindings(file: string, lines: readonly string[]): readonly CodeFinding[] {
    const findings: CodeFinding[] = [];
    scanSimpleCodeFindings(file, lines, findings);
    scanFunctionLengths(file, lines, findings);
    return findings;
}

function scanSecurityFindings(file: string, lines: readonly string[]): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNum = i + 1;

        if (/\beval\s*\(/.test(line)) {
            findings.push({ file, kind: 'eval-usage', line: lineNum, detail: line.trim() });
        }

        if (SECRET_PATTERN.test(line)) {
            findings.push({
                file,
                kind: 'hardcoded-secret',
                line: lineNum,
                detail: line.trim().replace(/(['"])[^'"]{4}[^'"]*(['"])/g, '$1****$2'),
            });
        }
    }

    return findings;
}

function computeScore(
    files: readonly string[],
    codeFindings: readonly CodeFinding[],
    securityFindings: readonly SecurityFinding[],
): number {
    if (files.length === 0) return 100;
    const securityPenalty = securityFindings.length * 10;
    const codePenalty = Math.min(codeFindings.length * 2, 40);
    return Math.max(0, 100 - securityPenalty - codePenalty);
}

// ─── auditRun ─────────────────────────────────────────────────────────────────

export async function auditRun(input: RunInput): Promise<RunOutput> {
    const checks = resolveChecks(input.checks);
    const files = await collectFiles(input.dir);

    const allCodeFindings: CodeFinding[] = [];
    const allSecurityFindings: SecurityFinding[] = [];

    for (const file of files) {
        let content: string;
        try {
            content = await readFile(file, 'utf8');
        } catch {
            continue;
        }

        const lines = content.split('\n');

        if (checks.includes('code') || checks.includes('architecture')) {
            allCodeFindings.push(...scanCodeFindings(file, lines));
        }

        if (checks.includes('security')) {
            allSecurityFindings.push(...scanSecurityFindings(file, lines));
        }
    }

    const score = computeScore(files, allCodeFindings, allSecurityFindings);

    lastAudit = {
        dir: input.dir,
        files,
        checks,
        codeFindings: allCodeFindings,
        securityFindings: allSecurityFindings,
        score,
        scannedAt: new Date().toISOString(),
    };

    return {
        files,
        codeFindings: allCodeFindings,
        securityFindings: allSecurityFindings,
        score,
        checks,
    };
}

// ─── auditReport ──────────────────────────────────────────────────────────────

export function auditReport(input: ReportInput): ReportOutput {
    const format = input.format ?? 'markdown';

    if (lastAudit === null) {
        if (format === 'json') {
            return {
                report: JSON.stringify({ error: 'No audit data available. Run audit:run first.' }),
                format,
            };
        }
        return { report: 'No audit data available. Run `audit:run` first.', format };
    }

    const audit = lastAudit;

    if (format === 'json') {
        return { report: JSON.stringify(audit, null, 2), format };
    }

    if (format === 'summary') {
        const lines = [
            `Audit: ${audit.dir}`,
            `Score: ${audit.score}/100`,
            `Files: ${audit.files.length}`,
            `Code findings: ${audit.codeFindings.length}`,
            `Security findings: ${audit.securityFindings.length}`,
            `Scanned at: ${audit.scannedAt}`,
        ];
        return { report: lines.join('\n'), format };
    }

    // Default: markdown
    const sections: string[] = [
        `# Full Audit Report`,
        ``,
        `**Directory:** \`${audit.dir}\``,
        `**Score:** ${audit.score}/100`,
        `**Files scanned:** ${audit.files.length}`,
        `**Checks run:** ${audit.checks.join(', ')}`,
        `**Scanned at:** ${audit.scannedAt}`,
        ``,
    ];

    if (audit.codeFindings.length > 0) {
        sections.push(`## Code Quality Findings`);
        sections.push(``);
        sections.push(`| File | Kind | Line | Detail |`);
        sections.push(`|------|------|------|--------|`);
        for (const f of audit.codeFindings) {
            const shortFile = f.file.replace(audit.dir, '').replace(/^\//, '');
            sections.push(`| \`${shortFile}\` | ${f.kind} | ${f.line} | ${f.detail} |`);
        }
        sections.push(``);
    } else {
        sections.push(`## Code Quality Findings`);
        sections.push(``);
        sections.push(`No code quality issues found.`);
        sections.push(``);
    }

    if (audit.securityFindings.length > 0) {
        sections.push(`## Security Findings`);
        sections.push(``);
        sections.push(`| File | Kind | Line | Detail |`);
        sections.push(`|------|------|------|--------|`);
        for (const f of audit.securityFindings) {
            const shortFile = f.file.replace(audit.dir, '').replace(/^\//, '');
            sections.push(`| \`${shortFile}\` | ${f.kind} | ${f.line} | ${f.detail} |`);
        }
        sections.push(``);
    } else {
        sections.push(`## Security Findings`);
        sections.push(``);
        sections.push(`No security issues found.`);
        sections.push(``);
    }

    sections.push(`---`);
    sections.push(`*Generated by @focus-mcp/fullaudit*`);

    return { report: sections.join('\n'), format };
}

// ─── Re-export stat for testing convenience ───────────────────────────────────

export { stat };
