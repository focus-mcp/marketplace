// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * build-docs — generates `dist/bricks.md` from all `bricks/<name>/mcp-brick.json` manifests.
 *
 * Produces a comprehensive Markdown catalog of all bricks, sorted alphabetically.
 * Run via: pnpm build:docs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

// ---------- Types ----------

interface BrickTool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties?: Record<
            string,
            { type?: string; description?: string; [key: string]: unknown }
        >;
        required?: string[];
        [key: string]: unknown;
    };
}

interface BrickManifest {
    name: string;
    prefix: string;
    version?: string;
    description: string;
    dependencies?: string[];
    tools?: BrickTool[];
    tags?: string[];
    license?: string;
}

// ---------- Helpers ----------

async function readJson<T>(path: string): Promise<T> {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
}

function detectType(manifest: BrickManifest): 'atomic' | 'composite' {
    return manifest.dependencies && manifest.dependencies.length > 0 ? 'composite' : 'atomic';
}

function formatDeps(deps: string[] | undefined): string {
    if (!deps || deps.length === 0) return 'none';
    return deps.map((d) => `\`${d}\``).join(', ');
}

function formatInputSchema(schema: BrickTool['inputSchema']): string {
    const props = schema.properties;
    if (!props || Object.keys(props).length === 0) {
        return '```json\n{}\n```';
    }

    const formatted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
        formatted[key] = {
            type: val.type ?? 'unknown',
            description: val.description ?? '',
        };
    }

    return `\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\``;
}

function generateBrickSection(manifest: BrickManifest): string {
    const type = detectType(manifest);
    const tools = manifest.tools ?? [];
    const lines: string[] = [];

    lines.push(`### ${manifest.name}`);
    lines.push('');
    lines.push(`> ${manifest.description}`);
    lines.push('');
    lines.push(`- **Prefix**: \`${manifest.prefix}\``);
    lines.push(`- **Version**: ${manifest.version ?? '0.0.0'}`);
    lines.push(`- **Dependencies**: ${formatDeps(manifest.dependencies)}`);
    lines.push(`- **Type**: ${type}`);
    lines.push('');

    if (tools.length > 0) {
        lines.push('#### Tools');
        lines.push('');

        for (const tool of tools) {
            lines.push(`##### \`${manifest.prefix}_${tool.name}\``);
            lines.push('');
            lines.push(tool.description);
            lines.push('');
            lines.push('**Input:**');
            lines.push(formatInputSchema(tool.inputSchema));
            lines.push('');
        }
    }

    lines.push('---');
    lines.push('');

    return lines.join('\n');
}

// ---------- Core ----------

export interface BuildDocsOptions {
    rootDir: string;
    now?: () => Date;
}

export interface BuildDocsResult {
    content: string;
    brickCount: number;
}

export async function buildDocs(options: BuildDocsOptions): Promise<BuildDocsResult> {
    const { rootDir } = options;
    const now = options.now ?? (() => new Date());

    const manifestPaths = await glob('bricks/*/mcp-brick.json', {
        cwd: rootDir,
        absolute: true,
        nodir: true,
    });

    const manifests: BrickManifest[] = [];
    for (const manifestPath of manifestPaths.sort()) {
        const brickDir = dirname(manifestPath);
        const manifest = await readJson<BrickManifest>(manifestPath);

        // Try to read version from package.json as source of truth
        try {
            const pkg = await readJson<{ version?: string }>(join(brickDir, 'package.json'));
            if (pkg.version) {
                manifest.version = pkg.version;
            }
        } catch {
            // version stays undefined, will default to 0.0.0 in output
        }

        manifests.push(manifest);
    }

    // Sort alphabetically by name
    manifests.sort((a, b) => a.name.localeCompare(b.name));

    const dateStr = now().toISOString().split('T')[0];
    const lines: string[] = [];

    // Header
    lines.push('# FocusMCP Bricks Catalog');
    lines.push('');
    lines.push('> Auto-generated from `mcp-brick.json` manifests. Do not edit manually.');
    lines.push(`> Generated: ${dateStr}`);
    lines.push('');

    // Summary table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Brick | Prefix | Tools | Type |');
    lines.push('|-------|--------|-------|------|');
    for (const manifest of manifests) {
        const toolCount = manifest.tools?.length ?? 0;
        const type = detectType(manifest);
        lines.push(`| ${manifest.name} | \`${manifest.prefix}\` | ${toolCount} | ${type} |`);
    }
    lines.push('');

    // Brick details
    lines.push('## Bricks');
    lines.push('');
    for (const manifest of manifests) {
        lines.push(generateBrickSection(manifest));
    }

    const content = lines.join('\n');

    return { content, brickCount: manifests.length };
}

// ---------- CLI ----------

/* v8 ignore start -- CLI glue, exercised end-to-end via `pnpm build:docs` */
async function main(): Promise<number> {
    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

    const { content, brickCount } = await buildDocs({ rootDir });

    const outPath = join(rootDir, 'dist/bricks.md');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, content, 'utf8');
    console.log(`Wrote ${outPath} (${brickCount} bricks)`);
    return 0;
}

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
/* v8 ignore stop */
