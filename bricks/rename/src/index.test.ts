// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renBulk, renFile, renPreview, renSymbol } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-rename-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── renSymbol ────────────────────────────────────────────────────────────────

describe('renSymbol', () => {
    it('dry run by default: returns changes without writing', async () => {
        await makeFile('a.ts', `export function myFunc() {}\nmyFunc();\n`);

        const result = await renSymbol({ dir: testDir, oldName: 'myFunc', newName: 'renamedFunc' });

        expect(result.applied).toBe(false);
        expect(result.totalChanges).toBeGreaterThanOrEqual(2);
        expect(result.changes[0]?.before).toContain('myFunc');
        expect(result.changes[0]?.after).toContain('renamedFunc');

        // File must not be written in dry run
        const content = await readFile(join(testDir, 'a.ts'), 'utf-8');
        expect(content).toContain('myFunc');
    });

    it('apply=true writes changes to disk', async () => {
        await makeFile('b.ts', `export function myFunc() {}\n`);

        const result = await renSymbol({
            dir: testDir,
            oldName: 'myFunc',
            newName: 'newFunc',
            apply: true,
        });

        expect(result.applied).toBe(true);
        expect(result.totalChanges).toBeGreaterThanOrEqual(1);

        const content = await readFile(join(testDir, 'b.ts'), 'utf-8');
        expect(content).toContain('newFunc');
        expect(content).not.toContain('myFunc');
    });

    it('respects word boundaries (does not replace substrings)', async () => {
        await makeFile('c.ts', `const myFuncExtra = 1;\nconst myFunc = 2;\n`);

        const result = await renSymbol({ dir: testDir, oldName: 'myFunc', newName: 'renamed' });

        const onlyMyFunc = result.changes.filter((c) => c.before.includes('myFuncExtra'));
        expect(onlyMyFunc).toHaveLength(0);
        expect(result.totalChanges).toBeGreaterThanOrEqual(1);
    });

    it('returns empty when symbol not found', async () => {
        await makeFile('d.ts', `export const x = 1;\n`);

        const result = await renSymbol({ dir: testDir, oldName: 'notHere', newName: 'renamed' });

        expect(result.totalChanges).toBe(0);
        expect(result.totalFiles).toBe(0);
    });

    it('renames across multiple files', async () => {
        await makeFile('e1.ts', `export function shared() {}\n`);
        await makeFile('e2.ts', `import { shared } from './e1';\nshared();\n`);

        const result = await renSymbol({ dir: testDir, oldName: 'shared', newName: 'renamed' });

        expect(result.totalFiles).toBe(2);
        expect(result.totalChanges).toBeGreaterThanOrEqual(3);
    });

    it('includes correct line numbers', async () => {
        await makeFile('f.ts', `const x = 1;\nfunction myFunc() {}\nconst y = 2;\n`);

        const result = await renSymbol({ dir: testDir, oldName: 'myFunc', newName: 'bar' });

        expect(result.changes[0]?.line).toBe(2);
    });
});

// ─── renFile ──────────────────────────────────────────────────────────────────

describe('renFile', () => {
    it('dry run: does not rename or update imports', async () => {
        const oldPath = await makeFile('utils.ts', `export const x = 1;\n`);
        await makeFile('main.ts', `import { x } from './utils';\n`);

        const result = await renFile({ path: oldPath, newName: 'helpers.ts', dir: testDir });

        expect(result.applied).toBe(false);
        expect(result.renamed).toBe(false);
        expect(result.importsUpdated.length).toBeGreaterThanOrEqual(1);

        // Nothing written
        const main = await readFile(join(testDir, 'main.ts'), 'utf-8');
        expect(main).toContain('./utils');
    });

    it('apply=true renames file and updates imports', async () => {
        const oldPath = await makeFile('utils.ts', `export const x = 1;\n`);
        await makeFile('main.ts', `import { x } from './utils';\n`);

        const result = await renFile({
            path: oldPath,
            newName: 'helpers.ts',
            dir: testDir,
            apply: true,
        });

        expect(result.applied).toBe(true);
        expect(result.renamed).toBe(true);
        expect(result.importsUpdated.length).toBeGreaterThanOrEqual(1);

        const main = await readFile(join(testDir, 'main.ts'), 'utf-8');
        expect(main).toContain('./helpers');
        expect(main).not.toContain('./utils');
    });

    it('returns empty importsUpdated when no references', async () => {
        const oldPath = await makeFile('standalone.ts', `export const z = 99;\n`);

        const result = await renFile({
            path: oldPath,
            newName: 'solo.ts',
            dir: testDir,
        });

        expect(result.importsUpdated).toHaveLength(0);
    });

    it('handles files in subdirectories', async () => {
        const subDir = join(testDir, 'lib');
        await mkdir(subDir);
        const oldPath = join(subDir, 'util.ts');
        await writeFile(oldPath, `export const y = 2;\n`);
        await makeFile('index.ts', `import { y } from './lib/util';\n`);

        const result = await renFile({
            path: oldPath,
            newName: 'helper.ts',
            dir: testDir,
        });

        expect(result.importsUpdated.length).toBeGreaterThanOrEqual(1);
    });
});

// ─── renBulk ──────────────────────────────────────────────────────────────────

describe('renBulk', () => {
    it('applies multiple renames in sequence (dry run)', async () => {
        await makeFile('g.ts', `function alpha() {}\nfunction beta() {}\n`);

        const result = await renBulk({
            dir: testDir,
            renames: [
                { oldName: 'alpha', newName: 'a' },
                { oldName: 'beta', newName: 'b' },
            ],
        });

        expect(result.applied).toBe(false);
        expect(result.results).toHaveLength(2);
        expect(result.totalChanges).toBeGreaterThanOrEqual(2);
    });

    it('apply=true writes all renames', async () => {
        await makeFile('h.ts', `function alpha() {}\nfunction beta() {}\n`);

        await renBulk({
            dir: testDir,
            renames: [
                { oldName: 'alpha', newName: 'a' },
                { oldName: 'beta', newName: 'b' },
            ],
            apply: true,
        });

        const content = await readFile(join(testDir, 'h.ts'), 'utf-8');
        expect(content).toContain('function a()');
        expect(content).toContain('function b()');
    });

    it('returns empty results for empty renames list', async () => {
        const result = await renBulk({ dir: testDir, renames: [] });
        expect(result.results).toHaveLength(0);
        expect(result.totalChanges).toBe(0);
    });
});

// ─── renPreview ───────────────────────────────────────────────────────────────

describe('renPreview', () => {
    it('returns all occurrences with file and line', async () => {
        await makeFile('i.ts', `function myFn() {}\nmyFn();\nmyFn();\n`);

        const result = await renPreview({ dir: testDir, oldName: 'myFn' });

        expect(result.total).toBeGreaterThanOrEqual(3);
        expect(result.fileCount).toBe(1);
        expect(result.occurrences[0]?.file).toContain('i.ts');
        expect(result.occurrences[0]?.line).toBeTypeOf('number');
        expect(result.occurrences[0]?.context).toBeTypeOf('string');
    });

    it('returns empty when symbol not found', async () => {
        await makeFile('j.ts', `const x = 1;\n`);

        const result = await renPreview({ dir: testDir, oldName: 'ghost' });

        expect(result.total).toBe(0);
        expect(result.fileCount).toBe(0);
        expect(result.occurrences).toHaveLength(0);
    });

    it('counts occurrences across multiple files', async () => {
        await makeFile('k1.ts', `function shared() {}\n`);
        await makeFile('k2.ts', `shared();\nshared();\n`);

        const result = await renPreview({ dir: testDir, oldName: 'shared' });

        expect(result.fileCount).toBe(2);
        expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('does not mutate files (read-only)', async () => {
        const p = await makeFile('l.ts', `function check() {}\ncheck();\n`);
        const before = await readFile(p, 'utf-8');

        await renPreview({ dir: testDir, oldName: 'check' });

        const after = await readFile(p, 'utf-8');
        expect(after).toBe(before);
    });
});

// ─── brick integration ────────────────────────────────────────────────────────

describe('rename brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('rename:symbol', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('rename:file', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('rename:bulk', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('rename:preview', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('rename');
        expect(brick.manifest.prefix).toBe('ren');
        expect(brick.manifest.tools).toHaveLength(4);
    });
});
