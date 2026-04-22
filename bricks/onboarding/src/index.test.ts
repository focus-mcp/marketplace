// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetState, onbGuide, onbScan } from './operations.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_PKG = JSON.stringify({
    name: 'my-project',
    version: '1.0.0',
    dependencies: { react: '^18.0.0' },
    devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
    scripts: { test: 'vitest run', build: 'tsc', start: 'node dist/index.js' },
});

const TEST_BIOME = JSON.stringify({
    formatter: { indentStyle: 'space', indentWidth: 4 },
    javascript: { formatter: { quoteStyle: 'single', semicolons: 'always' } },
});

let testDir: string;

beforeEach(async () => {
    _resetState();
    testDir = join(tmpdir(), `onboarding-test-${Date.now()}`);
    const { mkdir } = await import('node:fs/promises');
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'package.json'), TEST_PKG, 'utf8');
    await writeFile(join(testDir, 'biome.json'), TEST_BIOME, 'utf8');
    await writeFile(join(testDir, 'README.md'), '# My Project\n', 'utf8');
    await writeFile(join(testDir, 'tsconfig.json'), '{}', 'utf8');
    await writeFile(join(testDir, 'src', 'index.ts'), 'export {};\n', 'utf8');
});

afterEach(() => {
    _resetState();
});

// ─── Mocked bus ───────────────────────────────────────────────────────────────

function makeBusRequest(overrides: Record<string, unknown> = {}) {
    const defaults: Record<string, unknown> = {
        'overview:project': {
            name: 'bus-project',
            framework: 'react',
            language: 'typescript',
            type: 'application',
            packageManager: 'pnpm',
        },
        'overview:architecture': {
            folders: [{ path: 'src' }, { path: 'tests' }],
            patterns: ['src/ layout'],
            entryPoints: ['src/index.ts'],
        },
        'overview:conventions': {
            indent: 'spaces (4)',
            quotes: 'single',
            semicolons: true,
            importStyle: 'esm',
        },
    };
    const merged = { ...defaults, ...overrides };
    return vi.fn(async (target: string) => merged[target] ?? {});
}

// ─── onbScan — standalone (no bus) ───────────────────────────────────────────

describe('onbScan (standalone)', () => {
    it('returns a project name from package.json', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.project.name).toBe('my-project');
    });

    it('detects react framework', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.project.framework).toBe('react');
    });

    it('detects typescript language', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.project.language).toBe('typescript');
    });

    it('detects package manager from lock file presence', async () => {
        // No lock file → fallback to npm
        const result = await onbScan({ dir: testDir });
        expect(result.project.packageManager).toBe('npm');
    });

    it('lists top-level folders', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.architecture.folders).toContain('src');
    });

    it('includes README.md in keyFiles', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.keyFiles.some((f) => f.endsWith('README.md'))).toBe(true);
    });

    it('includes tsconfig.json in keyFiles', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.keyFiles.some((f) => f.endsWith('tsconfig.json'))).toBe(true);
    });

    it('returns a non-empty summary string', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.summary).toContain('my-project');
        expect(result.summary.length).toBeGreaterThan(20);
    });

    it('detects biome conventions', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.conventions.quotes).toBe('single');
    });

    it('returns entryPoints when src/index.ts exists', async () => {
        const result = await onbScan({ dir: testDir });
        expect(result.architecture.entryPoints).toContain('src/index.ts');
    });

    it('handles missing package.json gracefully', async () => {
        const { unlink } = await import('node:fs/promises');
        await unlink(join(testDir, 'package.json'));
        const result = await onbScan({ dir: testDir });
        expect(result.project.framework).toBeDefined();
    });

    it('handles non-existent directory gracefully', async () => {
        const result = await onbScan({ dir: '/nonexistent/path/xyz' });
        expect(result.project.name).toBeDefined();
        expect(result.architecture.folders).toEqual([]);
    });
});

// ─── onbScan — with bus ───────────────────────────────────────────────────────

describe('onbScan (with bus)', () => {
    it('calls overview:project with dir', async () => {
        const busRequest = makeBusRequest();
        await onbScan({ dir: testDir }, busRequest);
        expect(busRequest).toHaveBeenCalledWith('overview:project', { dir: testDir });
    });

    it('calls overview:architecture with dir', async () => {
        const busRequest = makeBusRequest();
        await onbScan({ dir: testDir }, busRequest);
        expect(busRequest).toHaveBeenCalledWith('overview:architecture', { dir: testDir });
    });

    it('calls overview:conventions with dir', async () => {
        const busRequest = makeBusRequest();
        await onbScan({ dir: testDir }, busRequest);
        expect(busRequest).toHaveBeenCalledWith('overview:conventions', { dir: testDir });
    });

    it('uses bus project name', async () => {
        const busRequest = makeBusRequest();
        const result = await onbScan({ dir: testDir }, busRequest);
        expect(result.project.name).toBe('bus-project');
    });

    it('uses bus architecture folders', async () => {
        const busRequest = makeBusRequest();
        const result = await onbScan({ dir: testDir }, busRequest);
        expect(result.architecture.folders).toContain('src');
        expect(result.architecture.folders).toContain('tests');
    });

    it('falls back to standalone when bus returns invalid data', async () => {
        const busRequest = makeBusRequest({
            'overview:project': null,
            'overview:architecture': null,
            'overview:conventions': null,
        });
        const result = await onbScan({ dir: testDir }, busRequest);
        expect(result.project.name).toBe('my-project');
    });
});

// ─── onbGuide — standalone ────────────────────────────────────────────────────

describe('onbGuide (standalone)', () => {
    it('returns a non-empty guide string', async () => {
        const result = await onbGuide({ dir: testDir });
        expect(result.guide.length).toBeGreaterThan(50);
    });

    it('includes project name in guide', async () => {
        const result = await onbGuide({ dir: testDir });
        expect(result.guide).toContain('my-project');
    });

    it('returns expected sections', async () => {
        const result = await onbGuide({ dir: testDir });
        expect(result.sections).toContain('What to read first');
        expect(result.sections).toContain('Project overview');
        expect(result.sections).toContain('Architecture');
        expect(result.sections).toContain('Coding standards');
        expect(result.sections).toContain('Key files');
        expect(result.sections).toContain('Getting started');
    });

    it('mentions README.md in "What to read first"', async () => {
        const result = await onbGuide({ dir: testDir });
        expect(result.guide).toContain('README.md');
    });

    it('includes package manager in guide', async () => {
        const result = await onbGuide({ dir: testDir });
        expect(result.guide).toContain('npm install');
    });

    it('reuses cached scan when called twice', async () => {
        await onbScan({ dir: testDir });
        const spy = vi.spyOn(await import('./operations.ts'), 'onbScan');
        await onbGuide({ dir: testDir });
        // onbGuide internally reuses cached state — onbScan should NOT be called again
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});

// ─── onboarding brick (index.ts) ─────────────────────────────────────────────

describe('onboarding brick', () => {
    it('registers 2 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubFns: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubFns.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(2);
        expect(bus.handle).toHaveBeenCalledWith('onboarding:scan', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('onboarding:guide', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubFns) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('manifest has correct name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('onboarding');
        expect(brick.manifest.prefix).toBe('onb');
    });

    it('manifest lists expected dependencies', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.dependencies).toContain('codebase');
        expect(brick.manifest.dependencies).toContain('smartcontext');
        expect(brick.manifest.dependencies).toContain('overview');
    });
});
