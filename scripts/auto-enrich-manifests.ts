// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * auto-enrich-manifests — heuristic draft generator for keywords + recommendedFor.
 *
 * Modes:
 *   --dry-run (default)  Print draft for each brick that lacks keywords/recommendedFor
 *   --apply              Write the generated fields to each mcp-brick.json
 *   --brick <name>       Process a single brick only
 *
 * NOTE: This script generates heuristic *drafts* from name tokens + README headings.
 * Quality review by a human (or Sonnet) is expected before final write.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Types ----------

interface BrickManifest {
    name: string;
    description?: string;
    tags?: string[];
    keywords?: string[];
    recommendedFor?: string[];
    [key: string]: unknown;
}

interface EnrichResult {
    brick: string;
    keywords: string[];
    recommendedFor: string[];
}

// ---------- Heuristics ----------

const LANG_TOKENS = new Set([
    'typescript',
    'javascript',
    'python',
    'go',
    'rust',
    'php',
    'java',
    'ruby',
    'swift',
    'kotlin',
    'csharp',
    'cpp',
]);

const USECASE_TOKENS = new Set([
    'refactoring',
    'testing',
    'analysis',
    'frontend',
    'backend',
    'devops',
    'security',
    'performance',
    'documentation',
    'debugging',
]);

const FRAMEWORK_TOKENS = new Set([
    'react',
    'vue',
    'angular',
    'next.js',
    'svelte',
    'nuxt',
    'express',
    'fastify',
    'django',
    'fastapi',
    'symfony',
    'laravel',
    'spring',
    'rails',
    'nest.js',
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[\s\-_/.,;:()[\]{}"'<>!?@#$%^&*=+|\\`~]+/)
        .filter((t) => t.length >= 3);
}

function extractReadmeKeywords(readme: string): string[] {
    const tokens: string[] = [];

    // Extract ## heading words
    const headings = readme.match(/^#{1,3}\s+(.+)$/gm) ?? [];
    for (const h of headings) {
        const words = tokenize(h.replace(/^#+\s+/, ''));
        tokens.push(...words);
    }

    // Extract tool names from | `name` | pattern
    const toolNames = readme.match(/\|\s*`(\w+)`\s*\|/g) ?? [];
    for (const t of toolNames) {
        const name = t.replace(/[|`\s]/g, '');
        if (name.length >= 3) tokens.push(name.toLowerCase());
    }

    return tokens;
}

function buildKeywords(
    name: string,
    tags: string[],
    description: string,
    readmeTokens: string[],
): string[] {
    const nameTokens = tokenize(name);
    const descTokens = tokenize(description);
    const allTokens = [...nameTokens, ...tags, ...descTokens, ...readmeTokens];

    // Count frequency
    const freq = new Map<string, number>();
    for (const t of allTokens) {
        if (t.length < 3 || LANG_TOKENS.has(t) || FRAMEWORK_TOKENS.has(t)) continue;
        freq.set(t, (freq.get(t) ?? 0) + 1);
    }

    // Sort by frequency, deduplicate
    const sorted = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t)
        .filter((t) => !['the', 'and', 'for', 'from', 'with', 'this', 'that', 'each'].includes(t));

    // Convert camelCase tokens to kebab-case
    const kebab = sorted.map((t) => t.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());

    return [...new Set(kebab)].slice(0, 7);
}

function buildRecommendedFor(
    tags: string[],
    description: string,
    readmeTokens: string[],
): string[] {
    const allTokens = new Set([
        ...tokenize(description),
        ...tags.map((t) => t.toLowerCase()),
        ...readmeTokens,
    ]);

    const langs: string[] = [];
    const usecases: string[] = [];
    const frameworks: string[] = [];

    for (const t of allTokens) {
        if (LANG_TOKENS.has(t)) langs.push(t);
        else if (USECASE_TOKENS.has(t)) usecases.push(t);
        else if (FRAMEWORK_TOKENS.has(t)) frameworks.push(t);
    }

    // Default languages when none detected
    if (langs.length === 0) langs.push('typescript', 'javascript');

    return [...new Set([...langs, ...usecases, ...frameworks])].slice(0, 7);
}

// ---------- Processing ----------

async function tryReadFile(path: string): Promise<string> {
    try {
        return await readFile(path, 'utf8');
    } catch {
        return '';
    }
}

async function processOneBrick(brickDir: string): Promise<EnrichResult | null> {
    const manifestPath = join(brickDir, 'mcp-brick.json');
    const raw = await tryReadFile(manifestPath);
    if (!raw) return null;

    const manifest: BrickManifest = JSON.parse(raw);

    // Skip already enriched
    if (manifest.keywords && manifest.recommendedFor) return null;

    const readmeRaw = await tryReadFile(join(brickDir, 'README.md'));
    const readmeTokens = extractReadmeKeywords(readmeRaw);

    const keywords = buildKeywords(
        manifest.name,
        manifest.tags ?? [],
        manifest.description ?? '',
        readmeTokens,
    );
    const recommendedFor = buildRecommendedFor(
        manifest.tags ?? [],
        manifest.description ?? '',
        readmeTokens,
    );

    return { brick: manifest.name, keywords, recommendedFor };
}

function insertFields(manifest: BrickManifest, result: EnrichResult): BrickManifest {
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(manifest)) {
        out[k] = v;

        // Insert after 'tags' (or after 'description' if no tags)
        if (k === 'tags' || (k === 'description' && !manifest.tags)) {
            if (!manifest.keywords) out['keywords'] = result.keywords;
            if (!manifest.recommendedFor) out['recommendedFor'] = result.recommendedFor;
        }
    }

    return out as BrickManifest;
}

// ---------- CLI ----------

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const isDryRun = !argv.includes('--apply');
    const singleBrick = argv.includes('--brick') ? argv[argv.indexOf('--brick') + 1] : null;

    const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const bricksDir = join(rootDir, 'bricks');

    const entries = singleBrick ? [singleBrick] : (await readdir(bricksDir)).sort();

    let processed = 0;

    for (const entry of entries) {
        const brickDir = join(bricksDir, entry);
        const result = await processOneBrick(brickDir);
        if (!result) continue;

        if (isDryRun) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            const manifestPath = join(brickDir, 'mcp-brick.json');
            const raw = await readFile(manifestPath, 'utf8');
            const manifest: BrickManifest = JSON.parse(raw);
            const updated = insertFields(manifest, result);
            await writeFile(manifestPath, `${JSON.stringify(updated, null, 4)}\n`, 'utf8');
            console.log(`✓ ${result.brick}`);
        }

        processed++;
    }

    if (processed === 0) {
        console.log('No bricks to enrich — all already have keywords + recommendedFor.');
    } else if (isDryRun) {
        console.error(`\n[dry-run] ${processed} brick(s) need enrichment. Use --apply to write.`);
    } else {
        console.log(`\nEnriched ${processed} brick(s).`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
