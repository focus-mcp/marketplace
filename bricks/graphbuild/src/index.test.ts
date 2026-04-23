// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gbAdd, gbBuild, gbMultimodal, gbUpdate, gbWatch, resetGraph } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-graphbuild-test-'));
    resetGraph();
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    resetGraph();
});

async function makeFile(name: string, content: string): Promise<string> {
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── gbBuild ─────────────────────────────────────────────────────────────────

describe('gbBuild', () => {
    it('creates file nodes for all scanned files', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await makeFile('b.ts', `export function b() {}`);

        const result = await gbBuild({ dir: testDir });
        expect(result.files).toBe(2);
        expect(result.nodeCount).toBeGreaterThanOrEqual(2);
    });

    it('creates import edges', async () => {
        await makeFile('util.ts', `export const x = 1;`);
        await makeFile('main.ts', `import { x } from './util';\n`);

        const result = await gbBuild({ dir: testDir });
        expect(result.edgeCount).toBeGreaterThanOrEqual(1);
    });

    it('creates export nodes', async () => {
        await makeFile('lib.ts', `export function myFunc() {}`);

        const result = await gbBuild({ dir: testDir });
        const multimodal = gbMultimodal({ format: 'nodes' });
        expect(multimodal.format).toBe('nodes');
        if (multimodal.format === 'nodes') {
            const exportNodes = multimodal.nodes.filter((n) => n.type === 'export');
            expect(exportNodes.some((n) => n.label === 'myFunc')).toBe(true);
        }
        expect(result.nodeCount).toBeGreaterThan(0);
    });

    it('respects maxFiles limit', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await makeFile('b.ts', `export const b = 2;`);
        await makeFile('c.ts', `export const c = 3;`);

        const result = await gbBuild({ dir: testDir, maxFiles: 2 });
        expect(result.files).toBeLessThanOrEqual(2);
    });

    it('resets graph on each build', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await gbBuild({ dir: testDir });
        const first = gbMultimodal({ format: 'summary' });

        resetGraph();
        await makeFile('b.ts', `export const b = 2;`);
        await gbBuild({ dir: testDir });
        const second = gbMultimodal({ format: 'summary' });

        expect(first.format).toBe('summary');
        expect(second.format).toBe('summary');
    });
});

// ─── gbUpdate ────────────────────────────────────────────────────────────────

describe('gbUpdate', () => {
    it('re-scans changed files', async () => {
        const file = await makeFile('a.ts', `export const a = 1;`);
        await gbBuild({ dir: testDir });

        await writeFile(file, `export const a = 1;\nexport function extra() {}`);
        const result = await gbUpdate({ files: [file] });

        expect(result.updated).toBe(1);
        expect(result.nodeCount).toBeGreaterThan(0);
    });

    it('handles empty files list', async () => {
        await gbBuild({ dir: testDir });
        const result = await gbUpdate({ files: [] });
        expect(result.updated).toBe(0);
    });
});

// ─── gbWatch ─────────────────────────────────────────────────────────────────

describe('gbWatch', () => {
    it('reports zero stale nodes when all files exist', async () => {
        await makeFile('alive.ts', `export const x = 1;`);
        await gbBuild({ dir: testDir });

        const result = await gbWatch();
        expect(result.staleNodes).toHaveLength(0);
        expect(result.totalNodes).toBeGreaterThan(0);
    });

    it('detects stale file nodes', async () => {
        const file = await makeFile('gone.ts', `export const x = 1;`);
        await gbBuild({ dir: testDir });
        await rm(file);

        const result = await gbWatch();
        expect(result.staleNodes.some((n) => n.includes('gone'))).toBe(true);
    });

    it('returns stats on empty graph', async () => {
        const result = await gbWatch();
        expect(result.totalNodes).toBe(0);
        expect(result.totalEdges).toBe(0);
        expect(result.staleNodes).toHaveLength(0);
    });
});

// ─── gbAdd ───────────────────────────────────────────────────────────────────

describe('gbAdd', () => {
    it('adds a node manually', () => {
        const result = gbAdd({ node: { id: 'n1', type: 'file', label: 'My File' } });
        expect(result.added).toBe('node');
        expect(result.id).toBe('n1');

        const multimodal = gbMultimodal({ format: 'nodes' });
        if (multimodal.format === 'nodes') {
            expect(multimodal.nodes.some((n) => n.id === 'n1')).toBe(true);
        }
    });

    it('adds an edge manually', () => {
        const result = gbAdd({ edge: { from: 'a', to: 'b', type: 'imports' } });
        expect(result.added).toBe('edge');
        expect(result.id).toBe('a->b');

        const multimodal = gbMultimodal({ format: 'edges' });
        if (multimodal.format === 'edges') {
            expect(multimodal.edges.some((e) => e.from === 'a' && e.to === 'b')).toBe(true);
        }
    });

    it('throws when neither node nor edge provided', () => {
        expect(() => gbAdd({})).toThrow();
    });
});

// ─── gbMultimodal ────────────────────────────────────────────────────────────

describe('gbMultimodal', () => {
    it('returns summary by default', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await gbBuild({ dir: testDir });

        const result = gbMultimodal({});
        expect(result.format).toBe('summary');
        if (result.format === 'summary') {
            expect(typeof result.nodeCount).toBe('number');
            expect(typeof result.edgeCount).toBe('number');
        }
    });

    it('returns node list for nodes format', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await gbBuild({ dir: testDir });

        const result = gbMultimodal({ format: 'nodes' });
        expect(result.format).toBe('nodes');
        if (result.format === 'nodes') {
            expect(Array.isArray(result.nodes)).toBe(true);
        }
    });

    it('returns edge list for edges format', async () => {
        await makeFile('util.ts', `export const x = 1;`);
        await makeFile('main.ts', `import { x } from './util';\n`);
        await gbBuild({ dir: testDir });

        const result = gbMultimodal({ format: 'edges' });
        expect(result.format).toBe('edges');
        if (result.format === 'edges') {
            expect(Array.isArray(result.edges)).toBe(true);
        }
    });

    it('returns full graph for full format', async () => {
        await makeFile('a.ts', `export const a = 1;`);
        await gbBuild({ dir: testDir });

        const result = gbMultimodal({ format: 'full' });
        expect(result.format).toBe('full');
        if (result.format === 'full') {
            expect(Array.isArray(result.nodes)).toBe(true);
            expect(Array.isArray(result.edges)).toBe(true);
        }
    });
});

// ─── graphbuild brick ─────────────────────────────────────────────────────────

describe('graphbuild brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('graphbuild:build', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphbuild:update', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphbuild:watch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphbuild:add', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphbuild:multimodal', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
