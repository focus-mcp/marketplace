// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rtFrameworks, rtList, rtScan, rtSearch } from './operations.ts';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-routes-test-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

async function makeFile(name: string, content: string): Promise<string> {
    const parts = name.split('/');
    if (parts.length > 1) {
        const dir = join(testDir, ...parts.slice(0, -1));
        await mkdir(dir, { recursive: true });
    }
    const p = join(testDir, name);
    await writeFile(p, content);
    return p;
}

// ─── rtScan ──────────────────────────────────────────────────────────────────

describe('rtScan — Express', () => {
    it('detects GET and POST routes', async () => {
        await makeFile(
            'routes.ts',
            [
                "import express from 'express';",
                'const app = express();',
                "app.get('/users', (req, res) => res.json([]));",
                "app.post('/users', (req, res) => res.sendStatus(201));",
            ].join('\n'),
        );

        const result = await rtScan({ dir: testDir, framework: 'express' });
        expect(result.total).toBe(2);
        expect(result.routes.some((r) => r.method === 'GET' && r.path === '/users')).toBe(true);
        expect(result.routes.some((r) => r.method === 'POST' && r.path === '/users')).toBe(true);
        expect(result.framework).toBe('express');
    });

    it('detects router-level routes', async () => {
        await makeFile(
            'api.ts',
            [
                "import { Router } from 'express';",
                'const router = Router();',
                "router.get('/items', (req, res) => res.json([]));",
                "router.delete('/items/:id', (req, res) => res.sendStatus(204));",
            ].join('\n'),
        );

        const result = await rtScan({ dir: testDir, framework: 'express' });
        expect(result.routes.some((r) => r.method === 'GET' && r.path === '/items')).toBe(true);
        expect(result.routes.some((r) => r.method === 'DELETE' && r.path === '/items/:id')).toBe(
            true,
        );
    });

    it('returns empty when no routes found', async () => {
        await makeFile('empty.ts', 'export const x = 1;');
        const result = await rtScan({ dir: testDir, framework: 'express' });
        expect(result.total).toBe(0);
    });

    it('includes file and line number', async () => {
        await makeFile(
            'server.ts',
            ['const app = {};', "app.get('/health', () => {});"].join('\n'),
        );

        const result = await rtScan({ dir: testDir, framework: 'express' });
        const route = result.routes.find((r) => r.path === '/health');
        expect(route).toBeDefined();
        expect(route?.line).toBe(2);
        expect(route?.file).toContain('server');
    });
});

describe('rtScan — Next.js App Router', () => {
    it('detects exported GET/POST from app/**/route.ts', async () => {
        await makeFile(
            'app/api/users/route.ts',
            [
                "import { NextResponse } from 'next/server';",
                'export async function GET() { return NextResponse.json([]); }',
                'export async function POST() { return NextResponse.json({}, { status: 201 }); }',
            ].join('\n'),
        );

        const result = await rtScan({ dir: testDir, framework: 'nextjs' });
        expect(result.routes.some((r) => r.method === 'GET' && r.path === '/api/users')).toBe(true);
        expect(result.routes.some((r) => r.method === 'POST' && r.path === '/api/users')).toBe(
            true,
        );
    });
});

describe('rtScan — SvelteKit', () => {
    it('detects exported GET/POST from src/routes/**/*+server.ts', async () => {
        await makeFile(
            'src/routes/api/items/+server.ts',
            [
                "import type { RequestHandler } from '@sveltejs/kit';",
                'export const GET: RequestHandler = async () => new Response("[]");',
            ].join('\n'),
        );

        const result = await rtScan({ dir: testDir, framework: 'sveltekit' });
        expect(result.routes.some((r) => r.method === 'GET' && r.path === '/api/items')).toBe(true);
    });
});

// ─── rtSearch ────────────────────────────────────────────────────────────────

describe('rtSearch', () => {
    beforeEach(async () => {
        await makeFile(
            'api.ts',
            [
                "app.get('/users', () => {});",
                "app.post('/users', () => {});",
                "app.get('/posts', () => {});",
                "app.delete('/posts/:id', () => {});",
            ].join('\n'),
        );
    });

    it('filters by path pattern', async () => {
        const result = await rtSearch({ dir: testDir, pattern: '/users' });
        expect(result.routes.every((r) => r.path.includes('/users'))).toBe(true);
        expect(result.total).toBe(2);
    });

    it('filters by HTTP method', async () => {
        const result = await rtSearch({ dir: testDir, method: 'GET' });
        expect(result.routes.every((r) => r.method === 'GET')).toBe(true);
        expect(result.total).toBe(2);
    });

    it('combines pattern and method filters', async () => {
        const result = await rtSearch({ dir: testDir, pattern: '/posts', method: 'DELETE' });
        expect(result.total).toBe(1);
        expect(result.routes[0]?.path).toBe('/posts/:id');
    });

    it('returns all routes when no filter given', async () => {
        const result = await rtSearch({ dir: testDir });
        expect(result.total).toBe(4);
    });
});

// ─── rtList ──────────────────────────────────────────────────────────────────

describe('rtList', () => {
    it('returns formatted table with routes', async () => {
        await makeFile(
            'routes.ts',
            ["app.get('/health', () => {});", "app.post('/data', () => {});"].join('\n'),
        );

        const result = await rtList({ dir: testDir });
        expect(result.total).toBe(2);
        expect(result.table).toContain('METHOD');
        expect(result.table).toContain('PATH');
        expect(result.table).toContain('GET');
        expect(result.table).toContain('/health');
        expect(result.table).toContain('POST');
        expect(result.table).toContain('/data');
    });

    it('returns "No routes found." when empty', async () => {
        await makeFile('empty.ts', 'export const x = 1;');
        const result = await rtList({ dir: testDir });
        expect(result.total).toBe(0);
        expect(result.table).toBe('No routes found.');
    });
});

// ─── rtFrameworks ────────────────────────────────────────────────────────────

describe('rtFrameworks', () => {
    it('detects express in package.json', async () => {
        await makeFile(
            'package.json',
            JSON.stringify({
                dependencies: { express: '^4.18.0' },
            }),
        );

        const result = await rtFrameworks({ dir: testDir });
        expect(result.frameworks.some((f) => f.name === 'express')).toBe(true);
        expect(result.frameworks.find((f) => f.name === 'express')?.version).toBe('^4.18.0');
        expect(result.frameworks.find((f) => f.name === 'express')?.detected).toBe(true);
    });

    it('detects next.js', async () => {
        await makeFile(
            'package.json',
            JSON.stringify({
                dependencies: { next: '^14.0.0', react: '^18.0.0' },
            }),
        );

        const result = await rtFrameworks({ dir: testDir });
        expect(result.frameworks.some((f) => f.name === 'nextjs')).toBe(true);
    });

    it('detects sveltekit from devDependencies', async () => {
        await makeFile(
            'package.json',
            JSON.stringify({
                devDependencies: { '@sveltejs/kit': '^2.0.0' },
            }),
        );

        const result = await rtFrameworks({ dir: testDir });
        expect(result.frameworks.some((f) => f.name === 'sveltekit')).toBe(true);
    });

    it('returns empty when no package.json', async () => {
        const result = await rtFrameworks({ dir: testDir });
        expect(result.frameworks).toHaveLength(0);
    });

    it('detects multiple frameworks', async () => {
        await makeFile(
            'package.json',
            JSON.stringify({
                dependencies: { express: '^4.18.0', fastify: '^4.0.0' },
            }),
        );

        const result = await rtFrameworks({ dir: testDir });
        expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
    });
});

// ─── brick integration ───────────────────────────────────────────────────────

describe('routes brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('routes:scan', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('routes:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('routes:list', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('routes:frameworks', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
