// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Cross-brick integration test: symbol brick + treesitter brick via in-process bus.
 *
 * Boots both bricks with a minimal in-process bus and verifies that symbol:find /
 * symbol:get work for multi-language files (TS, PHP, Python) through the
 * treesitter:extract-symbols service.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Import both bricks — treesitter is a devDependency of this test package
import treesitterBrick from '@focus-mcp/brick-treesitter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import symbolBrick from '../../src/index.js';

// ─── Minimal in-process bus ──────────────────────────────────────────────────

type Handler = (data: unknown) => Promise<unknown> | unknown;

interface MiniBus {
    handle(target: string, handler: Handler): () => void;
    on(event: string, handler: Handler): undefined | (() => void);
    request<T = unknown>(target: string, payload: unknown): Promise<T>;
}

function createMiniBus(): MiniBus {
    const handlers = new Map<string, Handler>();
    return {
        handle(target, handler) {
            handlers.set(target, handler);
            return (): void => {
                handlers.delete(target);
            };
        },
        on(_event, _handler) {
            return undefined;
        },
        async request<T>(target: string, payload: unknown): Promise<T> {
            const h = handlers.get(target);
            if (!h) throw new Error(`No handler registered for "${target}"`);
            return (await h(payload)) as T;
        },
    };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let testDir: string;
let bus: MiniBus;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-symbol-integ-'));
    bus = createMiniBus();
    // Boot order: treesitter first, then symbol (which depends on treesitter)
    // @ts-expect-error — MiniBus satisfies BrickBus (superset)
    await treesitterBrick.start({ bus });
    // @ts-expect-error — MiniBus satisfies BrickBus (superset)
    await symbolBrick.start({ bus });
});

afterEach(async () => {
    await symbolBrick.stop();
    await treesitterBrick.stop();
    await rm(testDir, { recursive: true, force: true });
});

// ─── Helper ──────────────────────────────────────────────────────────────────

async function callTool<T>(tool: string, input: unknown): Promise<T> {
    return bus.request<T>(`symbol:${tool}`, input);
}

// ─── TypeScript tests ────────────────────────────────────────────────────────

describe('symbol ← treesitter: TypeScript', () => {
    it('sym_find: finds exported TS function and class', async () => {
        await writeFile(
            join(testDir, 'service.ts'),
            'export function processOrder(id: number): void {}\nexport class OrderService {}',
        );
        const result = await callTool<{ symbols: Array<{ name: string; kind: string }> }>('find', {
            name: 'Order',
            dir: testDir,
        });
        expect(result.symbols.some((s) => s.name === 'processOrder')).toBe(true);
        expect(result.symbols.some((s) => s.name === 'OrderService')).toBe(true);
    });

    it('sym_get: returns exact TS match', async () => {
        await writeFile(
            join(testDir, 'utils.ts'),
            'export async function fetchData(): Promise<void> {}',
        );
        const result = await callTool<{ symbol: { name: string; kind: string } | null }>('get', {
            name: 'fetchData',
            dir: testDir,
        });
        expect(result.symbol?.name).toBe('fetchData');
        expect(result.symbol?.kind).toBe('function');
    });

    it('sym_bulk: resolves multiple symbols', async () => {
        await writeFile(
            join(testDir, 'multi.ts'),
            'export function alpha(): void {}\nexport function beta(): void {}',
        );
        const result = await callTool<{ results: Record<string, { name: string } | null> }>(
            'bulk',
            { names: ['alpha', 'beta', 'gamma'], dir: testDir },
        );
        expect(result.results['alpha']?.name).toBe('alpha');
        expect(result.results['beta']?.name).toBe('beta');
        expect(result.results['gamma']).toBeNull();
    });
});

// ─── PHP tests ───────────────────────────────────────────────────────────────

describe('symbol ← treesitter: PHP', () => {
    it('sym_find: finds PHP class (UserController)', async () => {
        await writeFile(
            join(testDir, 'UserController.php'),
            [
                '<?php',
                'namespace App\\Controller;',
                'class UserController {',
                '    public function index(): void {}',
                '    public function show(int $id): void {}',
                '}',
            ].join('\n'),
        );
        const result = await callTool<{ symbols: Array<{ name: string; kind: string }> }>('find', {
            name: 'UserController',
            dir: testDir,
        });
        expect(result.symbols.some((s) => s.name === 'UserController' && s.kind === 'class')).toBe(
            true,
        );
    });

    it('sym_get: finds PHP class method', async () => {
        await writeFile(
            join(testDir, 'Repo.php'),
            '<?php\nclass UserRepository {\n    public function findById(int $id): ?object { return null; }\n}\n',
        );
        const result = await callTool<{ symbol: { name: string; kind: string } | null }>('get', {
            name: 'UserRepository',
            dir: testDir,
        });
        expect(result.symbol?.name).toBe('UserRepository');
        expect(result.symbol?.kind).toBe('class');
    });
});

// ─── Python tests ─────────────────────────────────────────────────────────────

describe('symbol ← treesitter: Python', () => {
    it('sym_find: finds Python class', async () => {
        await writeFile(
            join(testDir, 'service.py'),
            'class DataService:\n    def process(self, items):\n        pass\n\ndef helper():\n    pass\n',
        );
        const result = await callTool<{ symbols: Array<{ name: string; kind: string }> }>('find', {
            name: 'Data',
            dir: testDir,
        });
        expect(result.symbols.some((s) => s.name === 'DataService' && s.kind === 'class')).toBe(
            true,
        );
    });

    it('sym_get: finds Python top-level function', async () => {
        await writeFile(
            join(testDir, 'utils.py'),
            'def calculate_total(items):\n    return sum(items)\n',
        );
        const result = await callTool<{ symbol: { name: string; kind: string } | null }>('get', {
            name: 'calculate_total',
            dir: testDir,
        });
        expect(result.symbol?.name).toBe('calculate_total');
        expect(result.symbol?.kind).toBe('function');
    });
});
