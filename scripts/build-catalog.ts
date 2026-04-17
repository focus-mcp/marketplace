// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * build-catalog — génère `dist/catalog.json` à partir :
 *   - des manifestes locaux `bricks/<name>/mcp-brick.json` + `bricks/<name>/package.json`
 *   - du fichier `external_bricks.json` (briques référencées externes)
 *
 * Le résultat est validé contre `schemas/catalog/v1.json` (ajv) et écrit sur disque.
 * Exit code non-zéro si validation échoue.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { glob } from 'glob';

// ---------- Types ----------

export interface CatalogOwner {
    name: string;
    url: string;
    email?: string;
}

export interface CatalogTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export type CatalogSource =
    | { type: 'local'; path: string }
    | { type: 'url'; url: string; sha?: string }
    | { type: 'git-subdir'; url: string; path: string; ref: string };

export interface CatalogBrick {
    name: string;
    version: string;
    description: string;
    tags?: string[];
    dependencies: string[];
    tools: CatalogTool[];
    source: CatalogSource;
    tarballUrl?: string;
    integrity?: string;
    publishedAt?: string;
    license?: string;
    homepage?: string;
    publisher?: string;
}

export interface Catalog {
    $schema?: string;
    name: string;
    description: string;
    owner: CatalogOwner;
    updated: string;
    bricks: CatalogBrick[];
}

export interface BrickManifest {
    name: string;
    description: string;
    tags?: string[];
    dependencies?: string[];
    tools?: CatalogTool[];
    license?: string;
    homepage?: string;
    publisher?: string;
}

export interface ExternalBricksFile {
    bricks: CatalogBrick[];
}

export interface BuildCatalogOptions {
    rootDir: string;
    schemaPath?: string;
    catalogMeta?: Partial<Pick<Catalog, 'name' | 'description' | 'owner'>>;
    schemaPublicUrl?: string;
    now?: () => Date;
}

export interface BuildCatalogResult {
    catalog: Catalog;
    errors: string[];
}

// ---------- Constantes ----------

const DEFAULT_SCHEMA_URL = 'https://focus-mcp.github.io/marketplace/schemas/catalog/v1.json';
const DEFAULT_CATALOG_META: Required<Pick<Catalog, 'name' | 'description' | 'owner'>> = {
    name: 'FocusMCP Marketplace',
    description: 'Catalogue officiel des briques MCP FocusMCP.',
    owner: {
        name: 'FocusMCP contributors',
        url: 'https://github.com/focus-mcp',
        email: 'contact@focusmcp.dev',
    },
};

// ---------- Core ----------

async function readJson<T>(path: string): Promise<T> {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
}

async function tryReadJson<T>(path: string): Promise<T | undefined> {
    try {
        return await readJson<T>(path);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw err;
    }
}

export async function collectLocalBricks(rootDir: string): Promise<CatalogBrick[]> {
    const manifests = await glob('bricks/*/mcp-brick.json', {
        cwd: rootDir,
        absolute: true,
        nodir: true,
    });
    const bricks: CatalogBrick[] = [];
    for (const manifestPath of manifests.sort()) {
        const brickDir = dirname(manifestPath);
        const manifest = await readJson<BrickManifest>(manifestPath);
        const pkg = await tryReadJson<{ version?: string }>(join(brickDir, 'package.json'));
        if (!pkg?.version) {
            throw new Error(
                `Missing version in ${join(brickDir, 'package.json')} (required for brick ${manifest.name})`,
            );
        }
        const relPath = `bricks/${brickDir.split(/[\\/]/).pop() ?? ''}`;
        bricks.push({
            name: manifest.name,
            version: pkg.version,
            description: manifest.description,
            ...(manifest.tags ? { tags: manifest.tags } : {}),
            dependencies: manifest.dependencies ?? [],
            tools: manifest.tools ?? [],
            source: { type: 'local', path: relPath },
            ...(manifest.license ? { license: manifest.license } : {}),
            ...(manifest.homepage ? { homepage: manifest.homepage } : {}),
            ...(manifest.publisher ? { publisher: manifest.publisher } : {}),
        });
    }
    return bricks;
}

export async function collectExternalBricks(rootDir: string): Promise<CatalogBrick[]> {
    const file = await tryReadJson<ExternalBricksFile>(join(rootDir, 'external_bricks.json'));
    return file?.bricks ?? [];
}

export async function buildCatalog(options: BuildCatalogOptions): Promise<BuildCatalogResult> {
    const { rootDir } = options;
    const schemaPath = options.schemaPath ?? join(rootDir, 'schemas/catalog/v1.json');
    const schemaUrl = options.schemaPublicUrl ?? DEFAULT_SCHEMA_URL;
    const meta = { ...DEFAULT_CATALOG_META, ...(options.catalogMeta ?? {}) };
    const now = options.now ?? (() => new Date());

    const [local, external] = await Promise.all([
        collectLocalBricks(rootDir),
        collectExternalBricks(rootDir),
    ]);

    const catalog: Catalog = {
        $schema: schemaUrl,
        name: meta.name,
        description: meta.description,
        owner: meta.owner,
        updated: now().toISOString(),
        bricks: [...local, ...external].sort((a, b) => a.name.localeCompare(b.name)),
    };

    const schema = await readJson<Record<string, unknown>>(schemaPath);
    // biome-ignore lint/suspicious/noExplicitAny: Ajv2020 default export typing mismatch in NodeNext ESM
    const AjvCtor = (Ajv2020 as any).default ?? Ajv2020;
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    // biome-ignore lint/suspicious/noExplicitAny: addFormats default export typing mismatch in NodeNext ESM
    const addFormatsFn = (addFormats as any).default ?? addFormats;
    addFormatsFn(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(catalog);
    const errors = ok
        ? []
        : (validate.errors ?? []).map(
              (e: ErrorObject) => `${e.instancePath || '/'} ${e.message ?? 'validation error'}`,
          );

    return { catalog, errors };
}

// ---------- CLI ----------

async function main(): Promise<number> {
    const argv = process.argv.slice(2);
    const toStdout = argv.includes('--stdout');
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

    const { catalog, errors } = await buildCatalog({ rootDir });

    if (errors.length > 0) {
        console.error('Catalog validation failed:');
        for (const err of errors) console.error(`  - ${err}`);
        return 1;
    }

    const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
    if (toStdout) {
        process.stdout.write(serialized);
        return 0;
    }

    const outPath = join(rootDir, 'dist/catalog.json');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, serialized, 'utf8');
    console.log(`Wrote ${outPath} (${catalog.bricks.length} bricks)`);
    return 0;
}

// Run only when executed directly (not when imported from tests).
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
    main().then(
        (code) => process.exit(code),
        (err) => {
            console.error(err);
            process.exit(1);
        },
    );
}
