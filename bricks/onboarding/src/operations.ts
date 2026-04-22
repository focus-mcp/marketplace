// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScanInput {
    readonly dir: string;
    readonly budget?: number;
}

export interface ScanOutput {
    project: ProjectInfo;
    architecture: ArchitectureInfo;
    conventions: ConventionsInfo;
    keyFiles: string[];
    summary: string;
}

export interface GuideInput {
    readonly dir: string;
}

export interface GuideOutput {
    guide: string;
    sections: string[];
}

export interface OnboardingBus {
    request(target: string, data: unknown): Promise<unknown>;
}

// ─── Internal types ───────────────────────────────────────────────────────────

export interface ProjectInfo {
    name: string;
    framework: string;
    language: string;
    type: string;
    packageManager: string;
}

export interface ArchitectureInfo {
    folders: string[];
    patterns: string[];
    entryPoints: string[];
}

export interface ConventionsInfo {
    indent: string;
    quotes: string;
    semicolons: boolean;
    importStyle: string;
}

// ─── Internal state ───────────────────────────────────────────────────────────

interface SessionState {
    lastScan: ScanOutput | null;
}

const state: SessionState = {
    lastScan: null,
};

export function _resetState(): void {
    state.lastScan = null;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isProjectInfo(val: unknown): val is ProjectInfo {
    return val !== null && typeof val === 'object' && 'name' in (val as object);
}

interface RawArchitecture {
    folders?: Array<{ path?: string }>;
    patterns?: string[];
    entryPoints?: string[];
}

function isArchitectureOutput(val: unknown): val is RawArchitecture {
    return val !== null && typeof val === 'object' && 'folders' in (val as object);
}

interface RawConventions {
    indent?: string;
    quotes?: string;
    semicolons?: boolean;
    importStyle?: string;
}

function isConventionsOutput(val: unknown): val is RawConventions {
    return val !== null && typeof val === 'object' && 'indent' in (val as object);
}

// ─── Standalone helpers ───────────────────────────────────────────────────────

const KEY_FILE_NAMES = [
    'README.md',
    'CLAUDE.md',
    'AGENTS.md',
    'CONTRIBUTING.md',
    'package.json',
    'tsconfig.json',
    'biome.json',
    '.eslintrc',
    'vitest.config.ts',
    'vite.config.ts',
    'Makefile',
    'Dockerfile',
    'docker-compose.yml',
];

async function findKeyFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const name of KEY_FILE_NAMES) {
        const fullPath = join(dir, name);
        try {
            await stat(fullPath);
            found.push(fullPath);
        } catch {
            // file does not exist — skip
        }
    }
    return found;
}

async function readFileSafe(path: string): Promise<string> {
    try {
        return await readFile(path, 'utf8');
    } catch {
        return '';
    }
}

const FRAMEWORK_DEPS: Array<[string[], string]> = [
    [['next'], 'next'],
    [['nuxt', 'nuxt3'], 'nuxt'],
    [['@sveltejs/kit'], 'sveltekit'],
    [['svelte'], 'svelte'],
    [['react'], 'react'],
    [['vue'], 'vue'],
    [['express'], 'express'],
    [['fastify'], 'fastify'],
    [['koa'], 'koa'],
];

function detectFrameworkFromDeps(names: string[]): string {
    for (const [keys, name] of FRAMEWORK_DEPS) {
        if (keys.some((k) => names.includes(k))) return name;
    }
    return 'none';
}

async function detectFramework(dir: string): Promise<string> {
    const pkgPath = join(dir, 'package.json');
    const raw = await readFileSafe(pkgPath);
    if (!raw) return 'unknown';
    try {
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const deps = {
            ...(typeof pkg['dependencies'] === 'object' && pkg['dependencies'] !== null
                ? (pkg['dependencies'] as Record<string, unknown>)
                : {}),
            ...(typeof pkg['devDependencies'] === 'object' && pkg['devDependencies'] !== null
                ? (pkg['devDependencies'] as Record<string, unknown>)
                : {}),
        };
        return detectFrameworkFromDeps(Object.keys(deps));
    } catch {
        return 'unknown';
    }
}

async function detectLanguage(dir: string): Promise<string> {
    const tsconfigPath = join(dir, 'tsconfig.json');
    try {
        await stat(tsconfigPath);
        return 'typescript';
    } catch {
        // no tsconfig
    }
    try {
        const entries = await readdir(dir);
        if (entries.some((e) => e.endsWith('.ts') || e.endsWith('.tsx'))) return 'typescript';
        if (entries.some((e) => e.endsWith('.js') || e.endsWith('.mjs'))) return 'javascript';
        if (entries.some((e) => e.endsWith('.py'))) return 'python';
        if (entries.some((e) => e.endsWith('.go'))) return 'go';
        if (entries.some((e) => e.endsWith('.rs'))) return 'rust';
    } catch {
        // ignore
    }
    return 'unknown';
}

async function detectPackageManager(dir: string): Promise<string> {
    const checks: Array<[string, string]> = [
        ['pnpm-lock.yaml', 'pnpm'],
        ['yarn.lock', 'yarn'],
        ['bun.lockb', 'bun'],
        ['package-lock.json', 'npm'],
    ];
    for (const [file, pm] of checks) {
        try {
            await stat(join(dir, file));
            return pm;
        } catch {
            // not found
        }
    }
    return 'npm';
}

async function listTopDirs(dir: string): Promise<string[]> {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries
            .filter(
                (e) =>
                    e.isDirectory() &&
                    !e.name.startsWith('.') &&
                    e.name !== 'node_modules' &&
                    e.name !== 'dist' &&
                    e.name !== '.git',
            )
            .map((e) => e.name);
    } catch {
        return [];
    }
}

function detectPatterns(folders: string[]): string[] {
    const patterns: string[] = [];
    if (folders.includes('src')) patterns.push('src/ layout');
    if (folders.includes('lib')) patterns.push('lib/ layout');
    if (folders.includes('packages')) patterns.push('monorepo');
    if (folders.includes('apps')) patterns.push('monorepo (apps/)');
    if (folders.includes('test') || folders.includes('tests') || folders.includes('__tests__')) {
        patterns.push('dedicated test folder');
    }
    if (folders.includes('docs')) patterns.push('docs/ folder');
    if (folders.includes('scripts')) patterns.push('scripts/ folder');
    if (folders.includes('.github')) patterns.push('GitHub Actions CI');
    return patterns;
}

async function standaloneProjectInfo(dir: string): Promise<ProjectInfo> {
    const pkgPath = join(dir, 'package.json');
    const raw = await readFileSafe(pkgPath);
    let name = dir.split('/').at(-1) ?? dir;
    let type = 'library';
    const scripts: string[] = [];

    if (raw) {
        try {
            const pkg = JSON.parse(raw) as Record<string, unknown>;
            if (typeof pkg['name'] === 'string') name = pkg['name'];
            const pkgScripts =
                typeof pkg['scripts'] === 'object' && pkg['scripts'] !== null
                    ? (pkg['scripts'] as Record<string, unknown>)
                    : {};
            scripts.push(...Object.keys(pkgScripts));
            if ('build' in pkgScripts) type = 'application';
        } catch {
            // ignore parse errors
        }
    }

    const framework = await detectFramework(dir);
    const language = await detectLanguage(dir);
    const packageManager = await detectPackageManager(dir);

    if (scripts.includes('start') || scripts.includes('serve')) type = 'application';

    return { name, framework, language, type, packageManager };
}

async function standaloneArchitectureInfo(dir: string): Promise<ArchitectureInfo> {
    const folders = await listTopDirs(dir);
    const patterns = detectPatterns(folders);

    const entryPoints: string[] = [];
    const entryNames = [
        'src/index.ts',
        'src/index.js',
        'index.ts',
        'index.js',
        'main.ts',
        'main.js',
    ];
    for (const entry of entryNames) {
        try {
            await stat(join(dir, entry));
            entryPoints.push(entry);
        } catch {
            // not found
        }
    }

    return { folders, patterns, entryPoints };
}

function parseBiomeConventions(raw: string): ConventionsInfo {
    const cfg = JSON.parse(raw) as Record<string, unknown>;
    const formatter =
        typeof cfg['formatter'] === 'object' && cfg['formatter'] !== null
            ? (cfg['formatter'] as Record<string, unknown>)
            : {};
    const indent =
        typeof formatter['indentStyle'] === 'string' ? formatter['indentStyle'] : 'spaces';
    const indentWidth =
        typeof formatter['indentWidth'] === 'number'
            ? `${indent} (${formatter['indentWidth']})`
            : indent;
    const js =
        typeof cfg['javascript'] === 'object' && cfg['javascript'] !== null
            ? (cfg['javascript'] as Record<string, unknown>)
            : {};
    const jsFormatter =
        typeof js['formatter'] === 'object' && js['formatter'] !== null
            ? (js['formatter'] as Record<string, unknown>)
            : {};
    const quotes =
        typeof jsFormatter['quoteStyle'] === 'string' ? jsFormatter['quoteStyle'] : 'single';
    const semicolons = jsFormatter['semicolons'] !== 'asNeeded';
    return { indent: indentWidth, quotes, semicolons, importStyle: 'esm' };
}

async function standaloneConventionsInfo(dir: string): Promise<ConventionsInfo> {
    const biomePath = join(dir, 'biome.json');
    try {
        await stat(biomePath);
        const raw = await readFileSafe(biomePath);
        if (raw) {
            return parseBiomeConventions(raw);
        }
    } catch {
        // no biome.json
    }

    // Fallback: check .editorconfig or tsconfig
    const tsconfigPath = join(dir, 'tsconfig.json');
    try {
        await stat(tsconfigPath);
        return { indent: 'spaces (4)', quotes: 'single', semicolons: true, importStyle: 'esm' };
    } catch {
        return { indent: 'spaces (2)', quotes: 'double', semicolons: true, importStyle: 'cjs' };
    }
}

function buildSummary(
    project: ProjectInfo,
    architecture: ArchitectureInfo,
    keyFiles: string[],
): string {
    const lines: string[] = [
        `# Project: ${project.name}`,
        '',
        `- **Language**: ${project.language}`,
        `- **Framework**: ${project.framework}`,
        `- **Type**: ${project.type}`,
        `- **Package manager**: ${project.packageManager}`,
        '',
        '## Architecture',
        `- Top-level folders: ${architecture.folders.join(', ') || 'none'}`,
    ];

    if (architecture.patterns.length > 0) {
        lines.push(`- Patterns detected: ${architecture.patterns.join(', ')}`);
    }
    if (architecture.entryPoints.length > 0) {
        lines.push(`- Entry points: ${architecture.entryPoints.join(', ')}`);
    }

    if (keyFiles.length > 0) {
        lines.push('', '## Key files');
        for (const f of keyFiles) {
            lines.push(`- ${f}`);
        }
    }

    return lines.join('\n');
}

// ─── onbScan ──────────────────────────────────────────────────────────────────

async function fetchProject(
    dir: string,
    busRequest: OnboardingBus['request'],
): Promise<ProjectInfo> {
    const rawProject = await busRequest('overview:project', { dir });
    if (!isProjectInfo(rawProject)) return standaloneProjectInfo(dir);
    const raw = rawProject as unknown as Record<string, unknown>;
    return {
        name: String(raw['name'] ?? dir),
        framework: String(raw['framework'] ?? 'unknown'),
        language: String(raw['language'] ?? 'unknown'),
        type: String(raw['type'] ?? 'library'),
        packageManager: String(raw['packageManager'] ?? 'npm'),
    };
}

async function fetchArchitecture(
    dir: string,
    busRequest: OnboardingBus['request'],
): Promise<ArchitectureInfo> {
    const rawArch = await busRequest('overview:architecture', { dir });
    if (!isArchitectureOutput(rawArch)) return standaloneArchitectureInfo(dir);
    return {
        folders: (rawArch.folders ?? []).map((f) => f.path ?? '').filter(Boolean),
        patterns: rawArch.patterns ?? [],
        entryPoints: rawArch.entryPoints ?? [],
    };
}

async function fetchConventions(
    dir: string,
    busRequest: OnboardingBus['request'],
): Promise<ConventionsInfo> {
    const rawConv = await busRequest('overview:conventions', { dir });
    if (!isConventionsOutput(rawConv)) return standaloneConventionsInfo(dir);
    return {
        indent: rawConv.indent ?? 'spaces (4)',
        quotes: rawConv.quotes ?? 'single',
        semicolons: rawConv.semicolons ?? true,
        importStyle: rawConv.importStyle ?? 'esm',
    };
}

export async function onbScan(
    input: ScanInput,
    busRequest?: OnboardingBus['request'],
): Promise<ScanOutput> {
    const { dir } = input;

    let project: ProjectInfo;
    let architecture: ArchitectureInfo;
    let conventions: ConventionsInfo;

    if (busRequest) {
        project = await fetchProject(dir, busRequest);
        architecture = await fetchArchitecture(dir, busRequest);
        conventions = await fetchConventions(dir, busRequest);
    } else {
        project = await standaloneProjectInfo(dir);
        architecture = await standaloneArchitectureInfo(dir);
        conventions = await standaloneConventionsInfo(dir);
    }

    const keyFiles = await findKeyFiles(dir);
    const summary = buildSummary(project, architecture, keyFiles);

    const output: ScanOutput = { project, architecture, conventions, keyFiles, summary };
    state.lastScan = output;
    return output;
}

// ─── onbGuide ─────────────────────────────────────────────────────────────────

export async function onbGuide(
    input: GuideInput,
    busRequest?: OnboardingBus['request'],
): Promise<GuideOutput> {
    // Use cached scan or run a new one
    const scan = state.lastScan ?? (await onbScan({ dir: input.dir }, busRequest));

    const { project, architecture, conventions, keyFiles } = scan;

    const sections: string[] = [];
    const parts: string[] = [];

    // Section 1: What to read first
    sections.push('What to read first');
    const readFirst: string[] = [];
    const readFirstNames = ['README.md', 'CLAUDE.md', 'AGENTS.md', 'CONTRIBUTING.md'];
    for (const name of readFirstNames) {
        const match = keyFiles.find((f) => f.endsWith(name));
        if (match) readFirst.push(`- \`${match}\``);
    }
    parts.push(
        `## What to read first\n\n${readFirst.length > 0 ? readFirst.join('\n') : '_No standard docs found._'}`,
    );

    // Section 2: Project overview
    sections.push('Project overview');
    parts.push(
        [
            '## Project overview',
            '',
            `- **Name**: ${project.name}`,
            `- **Language**: ${project.language}`,
            `- **Framework**: ${project.framework !== 'none' && project.framework !== 'unknown' ? project.framework : 'none / vanilla'}`,
            `- **Type**: ${project.type}`,
            `- **Package manager**: ${project.packageManager}`,
        ].join('\n'),
    );

    // Section 3: Architecture
    sections.push('Architecture');
    const archLines = [
        '## Architecture',
        '',
        `Top-level folders: \`${architecture.folders.join('`, `') || 'none'}\``,
    ];
    if (architecture.patterns.length > 0) {
        archLines.push(`Patterns: ${architecture.patterns.join(', ')}`);
    }
    if (architecture.entryPoints.length > 0) {
        archLines.push(
            `Entry points: ${architecture.entryPoints.map((e) => `\`${e}\``).join(', ')}`,
        );
    }
    parts.push(archLines.join('\n'));

    // Section 4: Coding standards
    sections.push('Coding standards');
    parts.push(
        [
            '## Coding standards',
            '',
            `- **Indent**: ${conventions.indent}`,
            `- **Quotes**: ${conventions.quotes}`,
            `- **Semicolons**: ${conventions.semicolons ? 'yes' : 'no'}`,
            `- **Import style**: ${conventions.importStyle}`,
        ].join('\n'),
    );

    // Section 5: Key files
    sections.push('Key files');
    const keyFileLines = ['## Key files', ''];
    if (keyFiles.length > 0) {
        for (const f of keyFiles) {
            keyFileLines.push(`- \`${f}\``);
        }
    } else {
        keyFileLines.push('_No standard key files detected._');
    }
    parts.push(keyFileLines.join('\n'));

    // Section 6: Getting started
    sections.push('Getting started');
    parts.push(
        [
            '## Getting started',
            '',
            `1. Install dependencies: \`${project.packageManager} install\``,
            '2. Run tests: check `package.json` scripts for `test`',
            '3. Explore entry points listed above',
            '4. Read the docs in "What to read first"',
        ].join('\n'),
    );

    const guide = `# Contributor guide — ${project.name}\n\n${parts.join('\n\n')}`;

    return { guide, sections };
}
