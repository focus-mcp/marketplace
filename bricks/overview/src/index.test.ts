// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ovwArchitecture, ovwConventions, ovwDependencies, ovwProject } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-overview-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── ovwProject ───────────────────────────────────────────────────────────────

describe('ovwProject', () => {
    it('detects name, framework, language, type from package.json', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({
                name: '@test/myapp',
                scripts: { build: 'tsc', test: 'vitest run' },
                dependencies: { fastify: '^4.0.0' },
                devDependencies: { typescript: '^5.0.0' },
            }),
        );
        const result = await ovwProject({ dir: testDir });
        expect(result.name).toBe('@test/myapp');
        expect(result.framework).toBe('fastify');
        expect(result.language).toBe('typescript');
        expect(result.type).toBe('app');
        expect(result.scripts['build']).toBe('tsc');
    });

    it('detects monorepo type when workspaces present', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({
                name: 'my-monorepo',
                workspaces: ['packages/*'],
            }),
        );
        const result = await ovwProject({ dir: testDir });
        expect(result.type).toBe('monorepo');
    });

    it('detects library type when no build script', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({ name: 'my-lib', scripts: { test: 'vitest run' } }),
        );
        const result = await ovwProject({ dir: testDir });
        expect(result.type).toBe('library');
    });

    it('detects package manager from packageManager field', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({ name: 'x', packageManager: 'pnpm@10.0.0' }),
        );
        const result = await ovwProject({ dir: testDir });
        expect(result.packageManager).toBe('pnpm');
    });

    it('falls back to npm when no packageManager field', async () => {
        await writeFile(join(testDir, 'package.json'), JSON.stringify({ name: 'x' }));
        const result = await ovwProject({ dir: testDir });
        expect(result.packageManager).toBe('npm');
    });

    it('uses dir basename when name missing from package.json', async () => {
        await writeFile(join(testDir, 'package.json'), JSON.stringify({}));
        const result = await ovwProject({ dir: testDir });
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
    });

    it('detects react framework', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({ dependencies: { react: '^18.0.0' } }),
        );
        const result = await ovwProject({ dir: testDir });
        expect(result.framework).toBe('react');
    });

    it('returns "none" framework when no known framework', async () => {
        await writeFile(join(testDir, 'package.json'), JSON.stringify({ name: 'x' }));
        const result = await ovwProject({ dir: testDir });
        expect(result.framework).toBe('none');
    });

    it('throws when no package.json', async () => {
        await expect(ovwProject({ dir: testDir })).rejects.toThrow();
    });
});

// ─── ovwArchitecture ─────────────────────────────────────────────────────────

describe('ovwArchitecture', () => {
    it('scans folders and counts files', async () => {
        await mkdir(join(testDir, 'src'));
        await writeFile(join(testDir, 'src', 'index.ts'), '');
        await writeFile(join(testDir, 'src', 'utils.ts'), '');
        const result = await ovwArchitecture({ dir: testDir });
        const src = result.folders.find((f) => f.path === 'src');
        expect(src).toBeDefined();
        expect(src?.fileCount).toBe(2);
    });

    it('detects src-layout pattern', async () => {
        await mkdir(join(testDir, 'src'));
        await writeFile(join(testDir, 'src', 'index.ts'), '');
        const result = await ovwArchitecture({ dir: testDir });
        expect(result.patterns).toContain('src-layout');
    });

    it('detects mvc pattern when controllers/models/views exist', async () => {
        for (const d of ['controllers', 'models', 'views']) {
            await mkdir(join(testDir, d));
        }
        const result = await ovwArchitecture({ dir: testDir });
        expect(result.patterns).toContain('mvc');
    });

    it('detects monorepo pattern when packages dir exists', async () => {
        await mkdir(join(testDir, 'packages'));
        const result = await ovwArchitecture({ dir: testDir });
        expect(result.patterns).toContain('monorepo');
    });

    it('detects entry points', async () => {
        await mkdir(join(testDir, 'src'));
        await writeFile(join(testDir, 'src', 'index.ts'), '');
        const result = await ovwArchitecture({ dir: testDir });
        expect(result.entryPoints).toContain('src/index.ts');
    });

    it('respects maxDepth', async () => {
        await mkdir(join(testDir, 'a'));
        await mkdir(join(testDir, 'a', 'b'));
        await mkdir(join(testDir, 'a', 'b', 'c'));
        await writeFile(join(testDir, 'a', 'b', 'c', 'deep.ts'), '');
        const result = await ovwArchitecture({ dir: testDir, maxDepth: 1 });
        const deep = result.folders.find((f) => f.path.includes('c'));
        expect(deep).toBeUndefined();
    });

    it('ignores node_modules', async () => {
        await mkdir(join(testDir, 'node_modules'));
        await writeFile(join(testDir, 'node_modules', 'pkg.js'), '');
        const result = await ovwArchitecture({ dir: testDir });
        const nm = result.folders.find((f) => f.path.includes('node_modules'));
        expect(nm).toBeUndefined();
    });

    it('returns empty folders on empty directory', async () => {
        const result = await ovwArchitecture({ dir: testDir });
        expect(result.folders).toEqual([]);
    });
});

// ─── ovwConventions ──────────────────────────────────────────────────────────

describe('ovwConventions', () => {
    it('detects 4-space indent', async () => {
        await writeFile(join(testDir, 'a.ts'), 'function x() {\n    return 1;\n}\n');
        const result = await ovwConventions({ dir: testDir });
        expect(result.indent).toBe('spaces:4');
    });

    it('detects tab indent', async () => {
        await writeFile(join(testDir, 'a.ts'), 'function x() {\n\treturn 1;\n}\n');
        const result = await ovwConventions({ dir: testDir });
        expect(result.indent).toBe('tabs');
    });

    it('detects single quotes', async () => {
        await writeFile(join(testDir, 'a.ts'), "import { x } from 'y';\n");
        const result = await ovwConventions({ dir: testDir });
        expect(result.quotes).toBe('single');
    });

    it('detects semicolons', async () => {
        await writeFile(join(testDir, 'a.ts'), 'const x = 1;\nconst y = 2;\n');
        const result = await ovwConventions({ dir: testDir });
        expect(result.semicolons).toBe(true);
    });

    it('detects node: import style', async () => {
        await writeFile(join(testDir, 'a.ts'), "import { readFile } from 'node:fs/promises';\n");
        const result = await ovwConventions({ dir: testDir });
        expect(result.importStyle).toBe('node-protocol');
    });

    it('detects commonjs require style', async () => {
        await writeFile(join(testDir, 'a.js'), "const fs = require('fs');\n");
        const result = await ovwConventions({ dir: testDir });
        expect(result.importStyle).toBe('commonjs');
    });

    it('detects line endings', async () => {
        await writeFile(join(testDir, 'a.ts'), 'const x = 1;\r\nconst y = 2;\r\n');
        const result = await ovwConventions({ dir: testDir });
        expect(result.lineEnding).toBe('crlf');
    });

    it('returns defaults when no source files found', async () => {
        const result = await ovwConventions({ dir: testDir });
        expect(result.indent).toBe('spaces:2');
        expect(result.quotes).toBe('single');
        expect(result.semicolons).toBe(true);
    });
});

// ─── ovwDependencies ─────────────────────────────────────────────────────────

describe('ovwDependencies', () => {
    it('categorizes production and dev dependencies', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({
                dependencies: { express: '^4.0.0' },
                devDependencies: { vitest: '^1.0.0', '@biomejs/biome': '^2.0.0' },
            }),
        );
        const result = await ovwDependencies({ dir: testDir });
        expect(result.production).toContainEqual({ name: 'express', version: '^4.0.0' });
        expect(result.dev).toContainEqual({ name: 'vitest', version: '^1.0.0' });
        expect(result.testRunner).toBe('vitest');
        expect(result.linter).toBe('biome');
        expect(result.framework).toBe('express');
    });

    it('detects vite bundler', async () => {
        await writeFile(
            join(testDir, 'package.json'),
            JSON.stringify({ devDependencies: { vite: '^5.0.0' } }),
        );
        const result = await ovwDependencies({ dir: testDir });
        expect(result.bundler).toBe('vite');
    });

    it('returns "none" for missing runners/linters/bundlers', async () => {
        await writeFile(join(testDir, 'package.json'), JSON.stringify({}));
        const result = await ovwDependencies({ dir: testDir });
        expect(result.testRunner).toBe('none');
        expect(result.linter).toBe('none');
        expect(result.bundler).toBe('none');
    });

    it('throws when no package.json', async () => {
        await expect(ovwDependencies({ dir: testDir })).rejects.toThrow();
    });
});

// ─── overview brick ───────────────────────────────────────────────────────────

describe('overview brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('overview:project', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('overview:architecture', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('overview:conventions', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('overview:dependencies', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
