// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectInput {
    readonly dir: string;
}

export interface ProjectOutput {
    name: string;
    framework: string;
    language: string;
    type: string;
    scripts: Record<string, string>;
    packageManager: string;
}

export interface ArchitectureInput {
    readonly dir: string;
    readonly maxDepth?: number;
}

export interface FolderEntry {
    path: string;
    fileCount: number;
    extensions: string[];
}

export interface ArchitectureOutput {
    folders: FolderEntry[];
    patterns: string[];
    entryPoints: string[];
}

export interface ConventionsInput {
    readonly dir: string;
}

export interface ConventionsOutput {
    indent: string;
    quotes: string;
    semicolons: boolean;
    importStyle: string;
    lineEnding: string;
}

export interface DependenciesInput {
    readonly dir: string;
}

export interface DepEntry {
    name: string;
    version: string;
}

export interface DependenciesOutput {
    production: DepEntry[];
    dev: DepEntry[];
    framework: string;
    testRunner: string;
    linter: string;
    bundler: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface PackageJson {
    name?: unknown;
    scripts?: unknown;
    dependencies?: unknown;
    devDependencies?: unknown;
    packageManager?: unknown;
    workspaces?: unknown;
}

async function readPackageJson(dir: string): Promise<PackageJson> {
    const raw = await readFile(join(dir, 'package.json'), 'utf-8');
    return JSON.parse(raw) as PackageJson;
}

function toStringRecord(val: unknown): Record<string, string> {
    if (val === null || typeof val !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(val)) {
        if (typeof v === 'string') result[k] = v;
    }
    return result;
}

function detectFramework(deps: Record<string, string>): string {
    const known: Array<[string, string]> = [
        ['next', 'next'],
        ['nuxt', 'nuxt'],
        ['@sveltejs/kit', 'sveltekit'],
        ['svelte', 'svelte'],
        ['react', 'react'],
        ['vue', 'vue'],
        ['fastify', 'fastify'],
        ['express', 'express'],
        ['hono', 'hono'],
        ['koa', 'koa'],
    ];
    for (const [dep, name] of known) {
        if (dep in deps) return name;
    }
    return 'none';
}

function detectLanguage(deps: Record<string, string>, devDeps: Record<string, string>): string {
    if ('typescript' in deps || 'typescript' in devDeps) return 'typescript';
    return 'javascript';
}

function detectProjectType(pkg: PackageJson): string {
    if (pkg.workspaces !== undefined) return 'monorepo';
    const scripts = toStringRecord(pkg.scripts);
    if ('build' in scripts) return 'app';
    return 'library';
}

function detectPackageManager(pkg: PackageJson): string {
    if (typeof pkg.packageManager === 'string') {
        const pm = pkg.packageManager.split('@')[0] ?? '';
        if (pm) return pm;
    }
    return 'npm';
}

// ─── ovwProject ──────────────────────────────────────────────────────────────

export async function ovwProject(input: ProjectInput): Promise<ProjectOutput> {
    const pkg = await readPackageJson(input.dir);
    const deps = toStringRecord(pkg.dependencies);
    const devDeps = toStringRecord(pkg.devDependencies);
    const allDeps = { ...deps, ...devDeps };
    return {
        name: typeof pkg.name === 'string' ? pkg.name : basename(input.dir),
        framework: detectFramework(allDeps),
        language: detectLanguage(deps, devDeps),
        type: detectProjectType(pkg),
        scripts: toStringRecord(pkg.scripts),
        packageManager: detectPackageManager(pkg),
    };
}

// ─── ovwArchitecture ─────────────────────────────────────────────────────────

async function collectFolders(
    root: string,
    dir: string,
    depth: number,
    maxDepth: number,
    results: FolderEntry[],
): Promise<void> {
    if (depth > maxDepth) return;
    let entries: Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    const exts = new Set<string>();
    let fileCount = 0;
    const subdirs: string[] = [];
    for (const entry of entries) {
        const entryName = entry.name.toString();
        if (entryName.startsWith('.') || entryName === 'node_modules') continue;
        if (entry.isDirectory()) {
            subdirs.push(join(dir, entryName));
        } else {
            fileCount++;
            const ext = extname(entryName);
            if (ext) exts.add(ext);
        }
    }
    if (depth > 0) {
        results.push({
            path: relative(root, dir) || '.',
            fileCount,
            extensions: [...exts].sort(),
        });
    }
    for (const sub of subdirs) {
        await collectFolders(root, sub, depth + 1, maxDepth, results);
    }
}

function detectPatterns(folders: FolderEntry[]): string[] {
    const paths = folders.map((f) => f.path);
    const patterns: string[] = [];
    const hasSrc = paths.some((p) => p === 'src' || p.startsWith('src/'));
    const hasControllers = paths.some((p) => /controllers?/i.test(p));
    const hasModels = paths.some((p) => /models?/i.test(p));
    const hasViews = paths.some((p) => /views?/i.test(p));
    const hasPackages = paths.some((p) => p === 'packages' || p.startsWith('packages/'));
    const hasApps = paths.some((p) => p === 'apps' || p.startsWith('apps/'));
    if (hasPackages || hasApps) patterns.push('monorepo');
    if (hasControllers && hasModels && hasViews) patterns.push('mvc');
    if (hasSrc) patterns.push('src-layout');
    if (paths.some((p) => /modules?/i.test(p))) patterns.push('module-based');
    return patterns;
}

const ENTRY_CANDIDATES = [
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/main.js',
    'index.ts',
    'index.js',
    'main.ts',
    'main.js',
];

async function findEntryPoints(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const candidate of ENTRY_CANDIDATES) {
        try {
            await stat(join(dir, candidate));
            found.push(candidate);
        } catch {
            // not found
        }
    }
    return found;
}

export async function ovwArchitecture(input: ArchitectureInput): Promise<ArchitectureOutput> {
    const maxDepth = input.maxDepth ?? 3;
    const folders: FolderEntry[] = [];
    await collectFolders(input.dir, input.dir, 0, maxDepth, folders);
    const patterns = detectPatterns(folders);
    const entryPoints = await findEntryPoints(input.dir);
    return { folders, patterns, entryPoints };
}

// ─── ovwConventions ──────────────────────────────────────────────────────────

function detectIndent(lines: string[]): string {
    for (const line of lines) {
        if (line.startsWith('\t')) return 'tabs';
        const match = /^( +)/.exec(line);
        if (match) {
            const count = match[1]?.length ?? 2;
            return `spaces:${count}`;
        }
    }
    return 'spaces:2';
}

function detectQuotes(content: string): string {
    const single = (content.match(/'/g) ?? []).length;
    const double = (content.match(/"/g) ?? []).length;
    return single >= double ? 'single' : 'double';
}

function detectSemicolons(lines: string[]): boolean {
    let withSemi = 0;
    let withoutSemi = 0;
    for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed.endsWith(';')) withSemi++;
        else if (trimmed.length > 0 && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
            withoutSemi++;
        }
    }
    return withSemi >= withoutSemi;
}

function detectImportStyle(content: string): string {
    if (/from ['"]node:/.test(content)) return 'node-protocol';
    if (/from ['"]\..*\.js['"]/.test(content)) return 'relative-js-extensions';
    if (/require\(/.test(content)) return 'commonjs';
    return 'esm';
}

function detectLineEnding(content: string): string {
    return content.includes('\r\n') ? 'crlf' : 'lf';
}

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

async function findSampleFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    const checkDirs = [dir, join(dir, 'src')];
    for (const d of checkDirs) {
        let entries: Dirent[];
        try {
            entries = await readdir(d, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            const entryName = entry.name.toString();
            if (TS_EXTENSIONS.has(extname(entryName))) {
                found.push(join(d, entryName));
                if (found.length >= 5) return found;
            }
        }
    }
    return found;
}

export async function ovwConventions(input: ConventionsInput): Promise<ConventionsOutput> {
    const files = await findSampleFiles(input.dir);
    if (files.length === 0) {
        return {
            indent: 'spaces:2',
            quotes: 'single',
            semicolons: true,
            importStyle: 'esm',
            lineEnding: 'lf',
        };
    }
    const contents: string[] = [];
    for (const f of files) {
        try {
            contents.push(await readFile(f, 'utf-8'));
        } catch {
            // skip unreadable
        }
    }
    const combined = contents.join('\n');
    const lines = combined.split('\n');
    return {
        indent: detectIndent(lines),
        quotes: detectQuotes(combined),
        semicolons: detectSemicolons(lines),
        importStyle: detectImportStyle(combined),
        lineEnding: detectLineEnding(combined),
    };
}

// ─── ovwDependencies ─────────────────────────────────────────────────────────

function toDeps(val: unknown): DepEntry[] {
    if (val === null || typeof val !== 'object') return [];
    return Object.entries(val)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([name, version]) => ({ name, version }));
}

function detectTestRunner(deps: Record<string, string>): string {
    if ('vitest' in deps) return 'vitest';
    if ('jest' in deps) return 'jest';
    if ('mocha' in deps) return 'mocha';
    if ('jasmine' in deps) return 'jasmine';
    return 'none';
}

function detectLinter(deps: Record<string, string>): string {
    if ('@biomejs/biome' in deps) return 'biome';
    if ('eslint' in deps) return 'eslint';
    if ('oxlint' in deps) return 'oxlint';
    return 'none';
}

function detectBundler(deps: Record<string, string>): string {
    if ('vite' in deps) return 'vite';
    if ('webpack' in deps) return 'webpack';
    if ('esbuild' in deps) return 'esbuild';
    if ('rollup' in deps) return 'rollup';
    if ('parcel' in deps) return 'parcel';
    if ('tsup' in deps) return 'tsup';
    return 'none';
}

export async function ovwDependencies(input: DependenciesInput): Promise<DependenciesOutput> {
    const pkg = await readPackageJson(input.dir);
    const deps = toStringRecord(pkg.dependencies);
    const devDeps = toStringRecord(pkg.devDependencies);
    const allDeps = { ...deps, ...devDeps };
    return {
        production: toDeps(pkg.dependencies),
        dev: toDeps(pkg.devDependencies),
        framework: detectFramework(allDeps),
        testRunner: detectTestRunner(allDeps),
        linter: detectLinter(allDeps),
        bundler: detectBundler(allDeps),
    };
}
