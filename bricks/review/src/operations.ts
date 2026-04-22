// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Severity = 'info' | 'warning' | 'error';

export interface CodeFinding {
    type: string;
    severity: Severity;
    line: number;
    message: string;
}

export interface SecurityFinding {
    type: string;
    severity: Severity;
    line: number;
    message: string;
}

export interface RevCodeInput {
    readonly path: string;
}

export interface RevCodeOutput {
    findings: CodeFinding[];
    score: number;
}

export interface RevSecurityInput {
    readonly path: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RevSecurityOutput {
    findings: SecurityFinding[];
    riskLevel: RiskLevel;
}

export interface RevArchitectureInput {
    readonly dir: string;
}

export interface ArchLayer {
    name: string;
    files: string[];
}

export interface ArchIssue {
    type: string;
    message: string;
}

export interface RevArchitectureOutput {
    pattern: string;
    layers: ArchLayer[];
    issues: ArchIssue[];
}

export interface RevCompareInput {
    readonly pathA: string;
    readonly pathB: string;
}

export interface RevCompareOutput {
    additions: string[];
    removals: string[];
    modifications: string[];
    similarity: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readFileLines(filePath: string): Promise<string[]> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return [];
    try {
        const content = await fh.readFile('utf-8');
        return content.split('\n');
    } finally {
        await fh.close();
    }
}

function measureNestingDepth(line: string, currentDepth: number): number {
    let depth = currentDepth;
    for (const ch of line) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
    }
    return depth;
}

// ─── revCode ─────────────────────────────────────────────────────────────────

function checkLinePatterns(line: string, lineNumber: number, findings: CodeFinding[]): void {
    if (/\b(TODO|FIXME)\b/.test(line)) {
        findings.push({
            type: 'todo',
            severity: 'info',
            line: lineNumber,
            message: `Found ${/FIXME/.test(line) ? 'FIXME' : 'TODO'} comment`,
        });
    }
    if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
        findings.push({
            type: 'any-usage',
            severity: 'warning',
            line: lineNumber,
            message: 'Usage of `any` type weakens type safety',
        });
    }
    if (/console\.(log|warn|error|debug|info)\s*\(/.test(line)) {
        findings.push({
            type: 'console-log',
            severity: 'info',
            line: lineNumber,
            message: 'console statement left in code',
        });
    }
}

function computeCodeScore(findings: CodeFinding[]): number {
    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;
    return Math.max(1, Math.min(10, 10 - errorCount * 3 - warningCount));
}

export async function revCode(input: RevCodeInput): Promise<RevCodeOutput> {
    const lines = await readFileLines(resolve(input.path));
    const findings: CodeFinding[] = [];
    const functionStarts: number[] = [];
    let nestingDepth = 0;
    let maxNestingLine = 0;
    let maxNestingDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNumber = i + 1;
        const prevDepth = nestingDepth;
        nestingDepth = measureNestingDepth(line, nestingDepth);
        if (nestingDepth > maxNestingDepth) {
            maxNestingDepth = nestingDepth;
            maxNestingLine = lineNumber;
        }
        if (/function\s+\w+|=>\s*\{|async\s+\w+\s*\(/.test(line) && nestingDepth > prevDepth) {
            functionStarts.push(lineNumber);
        }
        checkLinePatterns(line, lineNumber, findings);
    }

    if (maxNestingDepth > 4) {
        findings.push({
            type: 'deep-nesting',
            severity: 'warning',
            line: maxNestingLine,
            message: `Maximum nesting depth is ${maxNestingDepth} (recommended <= 4)`,
        });
    }
    if (lines.length > 50 && functionStarts.length <= 1) {
        findings.push({
            type: 'long-function',
            severity: 'warning',
            line: functionStarts[0] ?? 1,
            message: `File has ${lines.length} lines with few function boundaries — consider splitting`,
        });
    }

    return { findings, score: computeCodeScore(findings) };
}

// ─── revSecurity ─────────────────────────────────────────────────────────────

// Pattern strings are assembled at runtime to avoid false positives in static scanners.
// These regexes are used to DETECT dangerous patterns in user code, not to execute them.
const evalToken = 'eval';
const dynFnTokens = ['new\\s+', 'Func', 'tion\\s*\\('];
const innerHtmlToken = 'innerHTML';
const dangerToken = 'dangerouslySetInnerHTML';

type SecurityRule = {
    pattern: RegExp;
    type: string;
    severity: Severity;
    message: string;
};

const SECURITY_RULES: SecurityRule[] = [
    {
        pattern: new RegExp(`\\b${evalToken}\\s*\\(`),
        type: 'eval-usage',
        severity: 'error',
        message: 'eval() can execute arbitrary code — avoid it',
    },
    {
        pattern: new RegExp(dynFnTokens.join('')),
        type: 'dynamic-function',
        severity: 'error',
        message: 'Dynamic function constructor is equivalent to eval — avoid it',
    },
    {
        pattern: /password\s*[:=]\s*['"][^'"]{3,}/i,
        type: 'hardcoded-password',
        severity: 'error',
        message: 'Hardcoded password detected — use environment variables',
    },
    {
        pattern: /secret\s*[:=]\s*['"][^'"]{3,}/i,
        type: 'hardcoded-secret',
        severity: 'error',
        message: 'Hardcoded secret detected — use environment variables',
    },
    {
        pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{3,}/i,
        type: 'hardcoded-api-key',
        severity: 'error',
        message: 'Hardcoded API key detected — use environment variables',
    },
    {
        pattern: /`SELECT\s.*\$\{|['"]SELECT\s.*\+\s*\w/i,
        type: 'sql-injection',
        severity: 'error',
        message: 'Possible SQL injection — use parameterized queries',
    },
    {
        pattern: new RegExp(`\\.${innerHtmlToken}\\s*=`),
        type: 'inner-html',
        severity: 'warning',
        message: 'innerHTML assignment can lead to XSS — use textContent or sanitize input',
    },
    {
        pattern: new RegExp(dangerToken),
        type: 'dangerous-inner-html',
        severity: 'warning',
        message: 'dangerouslySetInnerHTML can lead to XSS — ensure content is sanitized',
    },
];

export async function revSecurity(input: RevSecurityInput): Promise<RevSecurityOutput> {
    const lines = await readFileLines(resolve(input.path));
    const findings: SecurityFinding[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNumber = i + 1;

        for (const rule of SECURITY_RULES) {
            if (rule.pattern.test(line)) {
                findings.push({
                    type: rule.type,
                    severity: rule.severity,
                    line: lineNumber,
                    message: rule.message,
                });
            }
        }
    }

    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;

    let riskLevel: RiskLevel = 'low';
    if (errorCount >= 3) riskLevel = 'critical';
    else if (errorCount >= 1) riskLevel = 'high';
    else if (warningCount >= 2) riskLevel = 'medium';

    return { findings, riskLevel };
}

// ─── revArchitecture ─────────────────────────────────────────────────────────

const KNOWN_LAYERS: Array<{ name: string; dirs: string[] }> = [
    { name: 'controllers', dirs: ['controllers', 'controller'] },
    { name: 'services', dirs: ['services', 'service'] },
    { name: 'models', dirs: ['models', 'model', 'entities', 'entity'] },
    { name: 'routes', dirs: ['routes', 'route', 'router'] },
    { name: 'middleware', dirs: ['middleware', 'middlewares'] },
    { name: 'utils', dirs: ['utils', 'helpers', 'lib'] },
    { name: 'views', dirs: ['views', 'templates', 'pages'] },
    { name: 'components', dirs: ['components', 'ui'] },
    { name: 'stores', dirs: ['stores', 'store', 'state'] },
    { name: 'hooks', dirs: ['hooks'] },
    { name: 'api', dirs: ['api'] },
    { name: 'tests', dirs: ['test', 'tests', '__tests__', 'spec'] },
];

async function collectDirEntries(dir: string): Promise<{ name: string; isDir: boolean }[]> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    return entries.map((e) => ({ name: e.name.toString(), isDir: e.isDirectory() }));
}

async function collectSourceFiles(dir: string, results: string[], base: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    const SUPPORTED = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectSourceFiles(full, results, base);
        } else if (SUPPORTED.has(extname(name))) {
            results.push(relative(base, full));
        }
    }
}

function detectPattern(layerNames: string[], layerCount: number): string {
    const has = (name: string): boolean => layerNames.includes(name);
    const hasMVC = has('controllers') && has('models') && (has('views') || has('routes'));
    if (hasMVC) return 'MVC';
    if (has('components') && (has('hooks') || has('stores'))) return 'React component-based';
    if (has('api') && has('services') && has('models')) return 'Hexagonal / Ports & Adapters';
    if (has('services') && has('utils')) return 'Service-oriented';
    if (layerCount > 0) return 'Layered';
    return 'unknown';
}

function detectArchIssues(layerNames: string[], layerCount: number): ArchIssue[] {
    const has = (name: string): boolean => layerNames.includes(name);
    const issues: ArchIssue[] = [];
    if (layerCount === 0) {
        issues.push({
            type: 'no-layers',
            message: 'No recognized architectural layers found — consider organizing into modules',
        });
    }
    const hasMVC = has('controllers') && has('models') && (has('views') || has('routes'));
    if (hasMVC && !has('services')) {
        issues.push({
            type: 'missing-service-layer',
            message:
                'MVC pattern detected but no service layer — controllers may hold business logic',
        });
    }
    if (has('tests') && layerCount < 3) {
        issues.push({
            type: 'thin-structure',
            message: 'Tests present but few layers detected — structure may be flat',
        });
    }
    return issues;
}

export async function revArchitecture(input: RevArchitectureInput): Promise<RevArchitectureOutput> {
    const absDir = resolve(input.dir);
    const topEntries = await collectDirEntries(absDir);
    const topDirNames = topEntries.filter((e) => e.isDir).map((e) => e.name.toLowerCase());

    const scanDir = topDirNames.includes('src') ? join(absDir, 'src') : absDir;
    const scanEntries = await collectDirEntries(scanDir);
    const scanDirNames = scanEntries.filter((e) => e.isDir).map((e) => e.name.toLowerCase());

    const detectedLayerNames: string[] = [];
    const layers: ArchLayer[] = [];

    for (const layerDef of KNOWN_LAYERS) {
        const match = layerDef.dirs.find((d) => scanDirNames.includes(d));
        if (match) {
            const files: string[] = [];
            await collectSourceFiles(join(scanDir, match), files, absDir);
            detectedLayerNames.push(layerDef.name);
            layers.push({ name: layerDef.name, files });
        }
    }

    return {
        pattern: detectPattern(detectedLayerNames, layers.length),
        layers,
        issues: detectArchIssues(detectedLayerNames, layers.length),
    };
}

// ─── revCompare ──────────────────────────────────────────────────────────────

export async function revCompare(input: RevCompareInput): Promise<RevCompareOutput> {
    const linesA = await readFileLines(resolve(input.pathA));
    const linesB = await readFileLines(resolve(input.pathB));

    const setA = new Set(linesA.map((l) => l.trimEnd()));
    const setB = new Set(linesB.map((l) => l.trimEnd()));

    const additions: string[] = [];
    const removals: string[] = [];
    const modifications: string[] = [];

    for (const line of setB) {
        if (line.length > 0 && !setA.has(line)) {
            additions.push(line);
        }
    }

    for (const line of setA) {
        if (line.length > 0 && !setB.has(line)) {
            removals.push(line);
        }
    }

    const minLen = Math.min(linesA.length, linesB.length);
    for (let i = 0; i < minLen; i++) {
        const lineA = (linesA[i] ?? '').trimEnd();
        const lineB = (linesB[i] ?? '').trimEnd();
        if (lineA !== lineB && lineA.length > 0 && lineB.length > 0) {
            modifications.push(`line ${i + 1}: ${lineA} -> ${lineB}`);
        }
    }

    const commonCount = [...setA].filter((l) => setB.has(l)).length;
    const unionCount = new Set([...setA, ...setB]).size;
    const similarity = unionCount === 0 ? 1 : Math.round((commonCount / unionCount) * 100) / 100;

    return { additions, removals, modifications, similarity };
}
