// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL';

export interface RouteEntry {
    method: HttpMethod;
    path: string;
    file: string;
    line: number;
}

export interface RtScanInput {
    readonly dir: string;
    readonly framework?: string;
}

export interface RtScanOutput {
    routes: RouteEntry[];
    framework: string;
    total: number;
}

export interface RtSearchInput {
    readonly dir: string;
    readonly pattern?: string;
    readonly method?: string;
}

export interface RtSearchOutput {
    routes: RouteEntry[];
    total: number;
}

export interface RtListInput {
    readonly dir: string;
}

export interface RtListOutput {
    table: string;
    total: number;
}

export interface FrameworkEntry {
    name: string;
    version: string;
    detected: true;
}

export interface RtFrameworksInput {
    readonly dir: string;
}

export interface RtFrameworksOutput {
    frameworks: FrameworkEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

// Express/Fastify route regex: (app|router).(get|post|...)(path)
const rExpressRoute =
    /(?:app|router)\.(get|post|put|delete|patch|head|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

// Next.js / SvelteKit exported HTTP handlers (function or const arrow form)
const rExportedHandler =
    /export\s+(?:(?:async\s+)?function\s+|const\s+)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/g;

async function collectFiles(dir: string, results: string[]): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
        entries = (await readdir(dir, { withFileTypes: true })) as import('node:fs').Dirent[];
    } catch {
        return;
    }
    for (const entry of entries) {
        const name = entry.name.toString();
        if (
            name.startsWith('.') ||
            name === 'node_modules' ||
            name === 'dist' ||
            name === '.next'
        ) {
            continue;
        }
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, results);
        } else {
            const dotIdx = name.lastIndexOf('.');
            if (dotIdx !== -1 && SUPPORTED_EXTS.has(name.slice(dotIdx))) {
                results.push(full);
            }
        }
    }
}

function isNextJsRouteFile(filePath: string): boolean {
    return /[/\\]app[/\\].*route\.[cm]?[jt]sx?$/.test(filePath);
}

function isSvelteKitRouteFile(filePath: string): boolean {
    return /[/\\]src[/\\]routes[/\\].*\+server\.[cm]?[jt]sx?$/.test(filePath);
}

function filePathToApiPath(filePath: string, dir: string, framework: string): string {
    const rel = relative(dir, filePath);
    if (framework === 'nextjs') {
        const m = rel.replace(/\\/g, '/').match(/app\/(.+?)\/route\.[cm]?[jt]sx?$/);
        if (m?.[1]) return `/${m[1]}`;
    }
    if (framework === 'sveltekit') {
        const m = rel.replace(/\\/g, '/').match(/src\/routes\/(.+?)\/\+server\.[cm]?[jt]sx?$/);
        if (m?.[1]) return `/${m[1]}`;
        if (/src\/routes\/\+server\.[cm]?[jt]sx?$/.test(rel.replace(/\\/g, '/'))) return '/';
    }
    return rel;
}

async function scanExpressFile(filePath: string, dir: string): Promise<RouteEntry[]> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return [];
    try {
        const content = await fh.readFile('utf-8');
        const lines = content.split('\n');
        const routes: RouteEntry[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            rExpressRoute.lastIndex = 0;
            let m = rExpressRoute.exec(line);
            while (m !== null) {
                const method = m[1]?.toUpperCase() as HttpMethod;
                const path = m[2] ?? '';
                routes.push({ method, path, file: relative(dir, filePath), line: i + 1 });
                m = rExpressRoute.exec(line);
            }
        }
        return routes;
    } finally {
        await fh.close();
    }
}

async function scanFileSystemRoutes(
    filePath: string,
    dir: string,
    framework: string,
): Promise<RouteEntry[]> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return [];
    try {
        const content = await fh.readFile('utf-8');
        const lines = content.split('\n');
        const routes: RouteEntry[] = [];
        const apiPath = filePathToApiPath(filePath, dir, framework);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            rExportedHandler.lastIndex = 0;
            let m = rExportedHandler.exec(line);
            while (m !== null) {
                const method = m[1] as HttpMethod;
                routes.push({ method, path: apiPath, file: relative(dir, filePath), line: i + 1 });
                m = rExportedHandler.exec(line);
            }
        }
        return routes;
    } finally {
        await fh.close();
    }
}

// ─── Framework detection ──────────────────────────────────────────────────────

const FRAMEWORK_KEYS: Record<string, string[]> = {
    express: ['express'],
    fastify: ['fastify'],
    nextjs: ['next'],
    sveltekit: ['@sveltejs/kit'],
};

interface PackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

async function readPackageJson(dir: string): Promise<PackageJson | null> {
    try {
        const raw = await readFile(join(dir, 'package.json'), 'utf-8');
        return JSON.parse(raw) as PackageJson;
    } catch {
        return null;
    }
}

async function autoDetectFramework(dir: string): Promise<string> {
    const pkg = await readPackageJson(dir);
    if (pkg) {
        const allDeps: Record<string, string> = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
            ...pkg.peerDependencies,
        };
        for (const [framework, keys] of Object.entries(FRAMEWORK_KEYS)) {
            if (keys.some((k) => k in allDeps)) return framework;
        }
    }
    return 'express';
}

// ─── rtScan ──────────────────────────────────────────────────────────────────

export async function rtScan(input: RtScanInput): Promise<RtScanOutput> {
    const dir = resolve(input.dir);
    const framework = input.framework ?? (await autoDetectFramework(dir));

    const files: string[] = [];
    await collectFiles(dir, files);

    const routes: RouteEntry[] = [];

    for (const file of files) {
        if (framework === 'nextjs' && isNextJsRouteFile(file)) {
            routes.push(...(await scanFileSystemRoutes(file, dir, 'nextjs')));
        } else if (framework === 'sveltekit' && isSvelteKitRouteFile(file)) {
            routes.push(...(await scanFileSystemRoutes(file, dir, 'sveltekit')));
        } else if (framework === 'express' || framework === 'fastify') {
            routes.push(...(await scanExpressFile(file, dir)));
        } else {
            // unknown/auto: try express patterns on all files
            routes.push(...(await scanExpressFile(file, dir)));
        }
    }

    return { routes, framework, total: routes.length };
}

// ─── rtSearch ────────────────────────────────────────────────────────────────

export async function rtSearch(input: RtSearchInput): Promise<RtSearchOutput> {
    const scan = await rtScan({ dir: input.dir });
    let routes = scan.routes;

    if (input.pattern) {
        const lower = input.pattern.toLowerCase();
        routes = routes.filter((r) => r.path.toLowerCase().includes(lower));
    }

    if (input.method) {
        const upper = input.method.toUpperCase();
        routes = routes.filter((r) => r.method === upper);
    }

    return { routes, total: routes.length };
}

// ─── rtList ──────────────────────────────────────────────────────────────────

export async function rtList(input: RtListInput): Promise<RtListOutput> {
    const scan = await rtScan({ dir: input.dir });
    const { routes } = scan;

    if (routes.length === 0) {
        return { table: 'No routes found.', total: 0 };
    }

    const colMethod = Math.max(6, ...routes.map((r) => r.method.length));
    const colPath = Math.max(4, ...routes.map((r) => r.path.length));

    const pad = (s: string, n: number): string => s.padEnd(n);
    const sep = `${'-'.repeat(colMethod + 2)}-${'-'.repeat(colPath + 2)}-${'-'.repeat(8)}`;

    const header = `${pad('METHOD', colMethod)}  ${pad('PATH', colPath)}  FILE`;
    const rows = routes.map(
        (r) => `${pad(r.method, colMethod)}  ${pad(r.path, colPath)}  ${r.file}:${r.line}`,
    );

    const table = [header, sep, ...rows].join('\n');
    return { table, total: routes.length };
}

// ─── rtFrameworks ────────────────────────────────────────────────────────────

export async function rtFrameworks(input: RtFrameworksInput): Promise<RtFrameworksOutput> {
    const dir = resolve(input.dir);
    const pkg = await readPackageJson(dir);
    if (!pkg) return { frameworks: [] };

    const allDeps: Record<string, string> = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
    };

    const frameworks: FrameworkEntry[] = [];
    for (const [framework, keys] of Object.entries(FRAMEWORK_KEYS)) {
        for (const key of keys) {
            if (key in allDeps) {
                frameworks.push({
                    name: framework,
                    version: allDeps[key] ?? 'unknown',
                    detected: true,
                });
                break;
            }
        }
    }

    return { frameworks };
}
