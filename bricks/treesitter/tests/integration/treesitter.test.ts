/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { indexStore } from '../../src/operations.js';
import { check as checkTsCleanupHappy } from './scenarios/ts_cleanup/happy/invariants.js';
import { check as checkTsIndexHappy } from './scenarios/ts_index/happy/invariants.js';
import { check as checkTsLangsHappy } from './scenarios/ts_langs/happy/invariants.js';
import { check as checkTsReindexHappy } from './scenarios/ts_reindex/happy/invariants.js';
import { check as checkTsStatusHappy } from './scenarios/ts_status/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-treesitter-integ-'));
    indexStore.clear();
});

afterEach(async () => {
    indexStore.clear();
    await rm(testDir, { recursive: true, force: true });
});

// ─── ts_index ─────────────────────────────────────────────────────────────────

describe('ts_index integration', () => {
    it('happy: index dir with 2-function TS file → files=1, symbols >= 2, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'mod.ts'),
            ['export function alpha(): void {}', 'export function beta(): void {}'].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        for (const inv of checkTsIndexHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_status ────────────────────────────────────────────────────────────────

describe('ts_status integration', () => {
    it('happy: status after indexing 1 file → files=1, symbols >= 2, langs non-empty, size<=2048B', async () => {
        await writeFile(
            join(testDir, 'mod.ts'),
            ['export function alpha(): void {}', 'export function beta(): void {}'].join('\n'),
        );
        await runTool(brick, 'index', { dir: testDir });
        const output = await runTool(brick, 'status', {});
        for (const inv of checkTsStatusHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_reindex ───────────────────────────────────────────────────────────────

describe('ts_reindex integration', () => {
    it('happy: reindex a single file with 1 exported function → symbols >= 1, size<=2048B', async () => {
        const filePath = join(testDir, 'single.ts');
        await writeFile(filePath, 'export function hello(): void {}');
        const output = await runTool(brick, 'reindex', { path: filePath });
        for (const inv of checkTsReindexHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_cleanup ───────────────────────────────────────────────────────────────

describe('ts_cleanup integration', () => {
    it('happy: cleanup after indexing 1 file → removed >= 1, size<=1024B', async () => {
        await writeFile(join(testDir, 'mod.ts'), 'export function alpha(): void {}');
        await runTool(brick, 'index', { dir: testDir });
        const output = await runTool(brick, 'cleanup', {});
        for (const inv of checkTsCleanupHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── ts_langs ─────────────────────────────────────────────────────────────────

describe('ts_langs integration', () => {
    it('happy: langs() → array with typescript+javascript+yaml+html+json, size<=1024B', async () => {
        const output = await runTool(brick, 'langs', {});
        for (const inv of checkTsLangsHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── YAML indexing ────────────────────────────────────────────────────────────

describe('ts_index YAML integration', () => {
    it('happy: index a YAML k8s manifest → extracts top-level keys as symbols', async () => {
        await writeFile(
            join(testDir, 'deployment.yaml'),
            [
                'apiVersion: apps/v1',
                'kind: Deployment',
                'metadata:',
                '  name: my-app',
                'spec:',
                '  replicas: 3',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 4)
            throw new Error(
                `expected symbols>=4 (apiVersion, kind, metadata, spec), got ${String(o.symbols)}`,
            );
    });
});

// ─── HTML indexing ────────────────────────────────────────────────────────────

describe('ts_index HTML integration', () => {
    it('happy: index HTML5 with headings and sections → extracts heading symbols', async () => {
        await writeFile(
            join(testDir, 'index.html'),
            [
                '<!DOCTYPE html>',
                '<html>',
                '<head><title>Test</title></head>',
                '<body>',
                '<h1>Main Title</h1>',
                '<h2>Section One</h2>',
                '<p id="intro">Hello</p>',
                '<h2>Section Two</h2>',
                '</body>',
                '</html>',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 1)
            throw new Error(`expected symbols>=1 from HTML headings/ids, got ${String(o.symbols)}`);
    });
});

// ─── Markdown indexing ────────────────────────────────────────────────────────

describe('ts_index Markdown integration', () => {
    it('happy: index Markdown with headings → extracts heading symbols', async () => {
        await writeFile(
            join(testDir, 'README.md'),
            [
                '# Project Title',
                '',
                'Some intro text.',
                '',
                '## Installation',
                '',
                'Run npm install.',
                '',
                '## Usage',
                '',
                '```typescript',
                'const x = 1;',
                '```',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 1)
            throw new Error(`expected symbols>=1 from Markdown headings, got ${String(o.symbols)}`);
    });
});

// ─── SCSS indexing ────────────────────────────────────────────────────────────

describe('ts_index SCSS integration', () => {
    it('happy: index SCSS with mixin and variables → extracts symbols', async () => {
        await writeFile(
            join(testDir, 'styles.scss'),
            [
                '$primary-color: #333;',
                '$font-size: 16px;',
                '',
                '@mixin flex-center {',
                '    display: flex;',
                '    align-items: center;',
                '}',
                '',
                '.container {',
                '    @include flex-center;',
                '    color: $primary-color;',
                '}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 1)
            throw new Error(`expected symbols>=1 from SCSS, got ${String(o.symbols)}`);
    });
});

// ─── JSON indexing ────────────────────────────────────────────────────────────

describe('ts_index JSON integration', () => {
    it('happy: index JSON object → extracts top-level keys as symbols', async () => {
        await writeFile(
            join(testDir, 'config.json'),
            JSON.stringify(
                {
                    name: 'my-app',
                    version: '1.0.0',
                    description: 'Test app',
                    scripts: { test: 'vitest' },
                    dependencies: {},
                },
                null,
                2,
            ),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 3)
            throw new Error(`expected symbols>=3 from JSON keys, got ${String(o.symbols)}`);
    });
});

// ─── TOML indexing ────────────────────────────────────────────────────────────

describe('ts_index TOML integration', () => {
    it('happy: index TOML with sections → extracts section and key symbols', async () => {
        await writeFile(
            join(testDir, 'Cargo.toml'),
            [
                '[package]',
                'name = "my-crate"',
                'version = "0.1.0"',
                'edition = "2021"',
                '',
                '[dependencies]',
                'serde = { version = "1.0", features = ["derive"] }',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 1)
            throw new Error(`expected symbols>=1 from TOML, got ${String(o.symbols)}`);
    });
});

// ─── Twig indexing ────────────────────────────────────────────────────────────

describe('ts_index Twig integration', () => {
    it('happy: index Twig template with blocks → extracts block symbols', async () => {
        await writeFile(
            join(testDir, 'template.twig'),
            [
                "{% extends 'base.html.twig' %}",
                '',
                '{% block title %}My Page{% endblock %}',
                '',
                '{% block body %}',
                '    <h1>Hello {{ name }}</h1>',
                '    {% for item in items %}',
                '        <li>{{ item }}</li>',
                '    {% endfor %}',
                '{% endblock %}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'index', { dir: testDir });
        const o = output as { files?: number; symbols?: number };
        if (o.files !== 1) throw new Error(`expected files=1, got ${String(o.files)}`);
        if (typeof o.symbols !== 'number' || o.symbols < 1)
            throw new Error(`expected symbols>=1 from Twig blocks, got ${String(o.symbols)}`);
    });
});
