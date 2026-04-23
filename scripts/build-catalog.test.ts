// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog } from './build-catalog.ts';

const schemaSourcePath = fileURLToPath(new URL('../schemas/catalog/v1.json', import.meta.url));

const frozenNow = () => new Date('2026-04-15T12:00:00.000Z');

async function scaffoldRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'focusmcp-marketplace-'));
    await mkdir(join(root, 'schemas/catalog'), { recursive: true });
    // Copy schema so validator resolves it via the rootDir.
    const { readFile } = await import('node:fs/promises');
    const schema = await readFile(schemaSourcePath, 'utf8');
    await writeFile(join(root, 'schemas/catalog/v1.json'), schema, 'utf8');
    return root;
}

async function writeJson(path: string, data: unknown): Promise<void> {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

describe('buildCatalog', () => {
    let root: string;

    beforeEach(async () => {
        root = await scaffoldRoot();
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it('produces a valid empty catalog when there are no bricks', async () => {
        const { catalog, errors } = await buildCatalog({ rootDir: root, now: frozenNow });
        expect(errors).toEqual([]);
        expect(catalog.bricks).toEqual([]);
        expect(catalog.$schema).toMatch(/schemas\/catalog\/v1\.json$/);
        expect(catalog.updated).toBe('2026-04-15T12:00:00.000Z');
        expect(catalog.owner.name).toBe('FocusMCP contributors');
    });

    it('includes a valid local brick from its manifest and package.json', async () => {
        await writeJson(join(root, 'bricks/indexer/mcp-brick.json'), {
            name: 'indexer',
            description: 'Indexe un codebase.',
            dependencies: [],
            tools: [
                {
                    name: 'search',
                    description: 'Recherche dans l’index.',
                    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
                },
            ],
            license: 'MIT',
        });
        await writeJson(join(root, 'bricks/indexer/package.json'), {
            name: 'focus-indexer',
            version: '0.2.1',
        });

        const { catalog, errors } = await buildCatalog({ rootDir: root, now: frozenNow });
        expect(errors).toEqual([]);
        expect(catalog.bricks).toHaveLength(1);
        const brick = catalog.bricks[0];
        expect(brick).toBeDefined();
        if (!brick) throw new Error('brick[0] missing');
        expect(brick.name).toBe('indexer');
        expect(brick.version).toBe('0.2.1');
        expect(brick.source).toEqual({
            type: 'npm',
            package: 'focus-indexer',
        });
        expect(brick.license).toBe('MIT');
    });

    it('merges external bricks from external_bricks.json', async () => {
        await writeJson(join(root, 'external_bricks.json'), {
            bricks: [
                {
                    name: 'memory',
                    version: '1.0.0',
                    description: 'Brique de mémoire externe.',
                    dependencies: [],
                    tools: [],
                    source: {
                        type: 'url',
                        url: 'https://example.com/memory-1.0.0.tgz',
                        sha: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
                    },
                },
            ],
        });

        const { catalog, errors } = await buildCatalog({ rootDir: root, now: frozenNow });
        expect(errors).toEqual([]);
        expect(catalog.bricks.map((b) => b.name)).toEqual(['memory']);
    });

    it('returns validation errors for a brick with an invalid name', async () => {
        await writeJson(join(root, 'bricks/BadBrick/mcp-brick.json'), {
            name: 'BadName',
            description: 'Nom en CamelCase, invalide.',
            dependencies: [],
            tools: [],
        });
        await writeJson(join(root, 'bricks/BadBrick/package.json'), {
            name: 'bad',
            version: '0.1.0',
        });

        const { errors } = await buildCatalog({ rootDir: root, now: frozenNow });
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.includes('pattern'))).toBe(true);
    });

    it('throws when a brick is missing version in package.json', async () => {
        await writeJson(join(root, 'bricks/no-version/mcp-brick.json'), {
            name: 'no-version',
            description: 'Brique sans version dans son package.json.',
            dependencies: [],
            tools: [],
        });
        await writeJson(join(root, 'bricks/no-version/package.json'), { name: 'no-version' });

        await expect(buildCatalog({ rootDir: root, now: frozenNow })).rejects.toThrow(
            /Missing version/i,
        );
    });

    it('rethrows non-ENOENT errors when reading a brick package.json', async () => {
        await writeJson(join(root, 'bricks/bad-pkg/mcp-brick.json'), {
            name: 'bad-pkg',
            description: 'Brique avec package.json malformé.',
            dependencies: [],
            tools: [],
        });
        await writeFile(join(root, 'bricks/bad-pkg/package.json'), '{ not valid json', 'utf8');

        await expect(buildCatalog({ rootDir: root, now: frozenNow })).rejects.toThrow();
    });

    it('sorts bricks alphabetically by name', async () => {
        await writeJson(join(root, 'bricks/zeta/mcp-brick.json'), {
            name: 'zeta',
            description: 'Z brick.',
            dependencies: [],
            tools: [],
        });
        await writeJson(join(root, 'bricks/zeta/package.json'), { name: 'zeta', version: '0.1.0' });
        await writeJson(join(root, 'bricks/alpha/mcp-brick.json'), {
            name: 'alpha',
            description: 'A brick.',
            dependencies: [],
            tools: [],
        });
        await writeJson(join(root, 'bricks/alpha/package.json'), {
            name: 'alpha',
            version: '0.1.0',
        });

        const { catalog, errors } = await buildCatalog({ rootDir: root, now: frozenNow });
        expect(errors).toEqual([]);
        expect(catalog.bricks.map((b) => b.name)).toEqual(['alpha', 'zeta']);
    });
});
