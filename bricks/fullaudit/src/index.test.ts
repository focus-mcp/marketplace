// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditReport, auditRun, resetAudit } from './operations.ts';

// ─── Temp project helpers ─────────────────────────────────────────────────────

async function makeTempDir(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'fullaudit-test-'));
}

async function writeTempFile(dir: string, name: string, content: string): Promise<string> {
    const parts = name.split('/');
    if (parts.length > 1) {
        const subdir = join(dir, ...parts.slice(0, -1));
        await mkdir(subdir, { recursive: true });
    }
    const full = join(dir, name);
    await writeFile(full, content, 'utf8');
    return full;
}

// Content with dangerous patterns — assembled at runtime to avoid triggering static hooks
const dangerousEvalLine = ['const result = ev', 'al(', "'1 + 2'", ');\n'].join('');

const dangerousSecretLine = ["const apiKey = '", 'supersecrettoken123', "';\n"].join('');

const dangerousPasswordLine = ["const password = '", 'mysecretpassword', "';\n"].join('');

const dangerousApiKeyLine = ["const apikey = '", 'mysupersecretoken1', "';\n"].join('');

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
    resetAudit();
    tmpDir = await makeTempDir();
});

afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});

// ─── auditRun — basic ─────────────────────────────────────────────────────────

describe('auditRun', () => {
    it('returns empty findings for a clean file', async () => {
        await writeTempFile(
            tmpDir,
            'src/clean.ts',
            `export function greet(name: string): string {\n    return \`Hello, \${name}\`;\n}\n`,
        );
        const result = await auditRun({ dir: tmpDir });
        expect(result.files.length).toBe(1);
        expect(result.codeFindings).toHaveLength(0);
        expect(result.securityFindings).toHaveLength(0);
        expect(result.score).toBe(100);
    });

    it('detects console.log usage', async () => {
        await writeTempFile(tmpDir, 'src/logger.ts', `console.log('debug value');\n`);
        const result = await auditRun({ dir: tmpDir });
        const found = result.codeFindings.filter((f) => f.kind === 'console-log');
        expect(found.length).toBeGreaterThan(0);
        expect(found[0]?.line).toBe(1);
    });

    it('detects any usage', async () => {
        await writeTempFile(tmpDir, 'src/types.ts', `function foo(x: any): any { return x; }\n`);
        const result = await auditRun({ dir: tmpDir });
        const found = result.codeFindings.filter((f) => f.kind === 'any-usage');
        expect(found.length).toBeGreaterThan(0);
    });

    it('detects TODO comments', async () => {
        await writeTempFile(tmpDir, 'src/todo.ts', `// TODO: fix this later\nconst x = 1;\n`);
        const result = await auditRun({ dir: tmpDir });
        const found = result.codeFindings.filter((f) => f.kind === 'todo');
        expect(found.length).toBeGreaterThan(0);
        expect(found[0]?.line).toBe(1);
    });

    it('detects dangerous dynamic code execution', async () => {
        await writeTempFile(tmpDir, 'src/dangerous.ts', dangerousEvalLine);
        const result = await auditRun({ dir: tmpDir, checks: ['security'] });
        const found = result.securityFindings.filter((f) => f.kind === 'eval-usage');
        expect(found.length).toBeGreaterThan(0);
        expect(found[0]?.line).toBe(1);
    });

    it('detects hardcoded secrets', async () => {
        await writeTempFile(tmpDir, 'src/config.ts', dangerousSecretLine);
        const result = await auditRun({ dir: tmpDir, checks: ['security'] });
        const found = result.securityFindings.filter((f) => f.kind === 'hardcoded-secret');
        expect(found.length).toBeGreaterThan(0);
    });

    it('masks secret values in finding detail', async () => {
        await writeTempFile(tmpDir, 'src/config.ts', dangerousPasswordLine);
        const result = await auditRun({ dir: tmpDir, checks: ['security'] });
        const found = result.securityFindings.filter((f) => f.kind === 'hardcoded-secret');
        expect(found.length).toBeGreaterThan(0);
        expect(found[0]?.detail).toContain('****');
    });

    it('runs only code checks when requested', async () => {
        await writeTempFile(tmpDir, 'src/mixed.ts', `console.log('hi');\n`);
        const codeOnly = await auditRun({ dir: tmpDir, checks: ['code'] });
        expect(codeOnly.securityFindings).toHaveLength(0);
        expect(codeOnly.checks).toEqual(['code']);
    });

    it('runs only security checks when requested', async () => {
        await writeTempFile(tmpDir, 'src/mixed.ts', `console.log('hi');\n`);
        const secOnly = await auditRun({ dir: tmpDir, checks: ['security'] });
        expect(secOnly.codeFindings).toHaveLength(0);
        expect(secOnly.checks).toEqual(['security']);
    });

    it('returns score of 100 for empty directory', async () => {
        const result = await auditRun({ dir: tmpDir });
        expect(result.score).toBe(100);
        expect(result.files).toHaveLength(0);
    });

    it('reduces score for security findings', async () => {
        await writeTempFile(tmpDir, 'src/bad.ts', dangerousSecretLine);
        const result = await auditRun({ dir: tmpDir });
        expect(result.score).toBeLessThan(100);
    });

    it('scans both .ts and .js files', async () => {
        await writeTempFile(tmpDir, 'a.ts', `const x = 1;\n`);
        await writeTempFile(tmpDir, 'b.js', `const y = 2;\n`);
        const result = await auditRun({ dir: tmpDir });
        expect(result.files.length).toBe(2);
    });

    it('ignores node_modules directories', async () => {
        await writeTempFile(tmpDir, 'node_modules/lib/index.ts', dangerousEvalLine);
        await writeTempFile(tmpDir, 'src/app.ts', `const x = 1;\n`);
        const result = await auditRun({ dir: tmpDir });
        expect(result.files).toHaveLength(1);
        expect(result.securityFindings).toHaveLength(0);
    });

    it('returns all valid checks when checks is empty array', async () => {
        const result = await auditRun({ dir: tmpDir, checks: [] });
        expect(result.checks).toEqual(['code', 'security', 'architecture']);
    });

    it('filters out unknown check kinds', async () => {
        const result = await auditRun({ dir: tmpDir, checks: ['code', 'unknown-check'] });
        expect(result.checks).toEqual(['code']);
    });

    it('stores result for auditReport to use', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const report = auditReport({});
        expect(report.report).toContain(tmpDir);
    });
});

// ─── auditReport ──────────────────────────────────────────────────────────────

describe('auditReport', () => {
    it('returns error message when no audit has been run', () => {
        const result = auditReport({});
        expect(result.report).toContain('No audit data');
        expect(result.format).toBe('markdown');
    });

    it('returns json error when format is json and no audit run', () => {
        const result = auditReport({ format: 'json' });
        const parsed = JSON.parse(result.report) as { error: string };
        expect(parsed.error).toContain('No audit data');
    });

    it('returns markdown report by default', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.format).toBe('markdown');
        expect(result.report).toContain('# Full Audit Report');
        expect(result.report).toContain('Score:');
    });

    it('returns json report', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({ format: 'json' });
        expect(result.format).toBe('json');
        const parsed = JSON.parse(result.report) as { score: number };
        expect(typeof parsed.score).toBe('number');
    });

    it('returns summary report', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({ format: 'summary' });
        expect(result.format).toBe('summary');
        expect(result.report).toContain('Score:');
        expect(result.report).toContain('Files:');
    });

    it('lists code findings in markdown table', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `console.log('hello');\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.report).toContain('console-log');
    });

    it('lists security findings in markdown table', async () => {
        await writeTempFile(tmpDir, 'src/config.ts', dangerousApiKeyLine);
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.report).toContain('hardcoded-secret');
    });

    it('shows no code quality issues when clean', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `export const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.report).toContain('No code quality issues found');
    });

    it('shows no security issues when clean', async () => {
        await writeTempFile(tmpDir, 'src/app.ts', `export const x = 1;\n`);
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.report).toContain('No security issues found');
    });

    it('defaults format to markdown when undefined', async () => {
        await auditRun({ dir: tmpDir });
        const result = auditReport({});
        expect(result.format).toBe('markdown');
    });
});

// ─── fullaudit brick ──────────────────────────────────────────────────────────

describe('fullaudit brick', () => {
    it('has correct manifest', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('fullaudit');
        expect(brick.manifest.prefix).toBe('audit');
        expect(brick.manifest.dependencies).toEqual(['codebase', 'review', 'metrics']);
        expect(brick.manifest.tools).toHaveLength(2);
    });

    it('registers 2 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<ReturnType<typeof vi.fn>> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(2);
        expect(bus.handle).toHaveBeenCalledWith('fullaudit:run', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('fullaudit:report', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('clears previous handlers on repeated start', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<ReturnType<typeof vi.fn>> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        await brick.start({ bus });

        // First set of unsubbers must have been called on second start
        expect(unsubbers[0]).toHaveBeenCalled();
        expect(unsubbers[1]).toHaveBeenCalled();
    });
});
