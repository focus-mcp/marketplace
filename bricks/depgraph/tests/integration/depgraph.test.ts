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
import { check as checkDepCircularHappy } from './scenarios/dep_circular/happy/invariants.js';
import { check as checkDepExportsHappy } from './scenarios/dep_exports/happy/invariants.js';
import { check as checkDepFaninHappy } from './scenarios/dep_fanin/happy/invariants.js';
import { check as checkDepFanoutHappy } from './scenarios/dep_fanout/happy/invariants.js';
import { check as checkDepImportsHappy } from './scenarios/dep_imports/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-depgraph-integ-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── dep_imports ──────────────────────────────────────────────────────────────

describe('dep_imports integration', () => {
    it('happy: 2 ESM imports → imports array has 2 entries with from+kind, size<=4096B', async () => {
        const filePath = join(testDir, 'a.ts');
        await writeFile(
            filePath,
            [
                "import { foo } from './foo';",
                "import { bar } from './bar';",
                'export function main(): void {}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'imports', { file: filePath });
        for (const inv of checkDepImportsHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── dep_exports ──────────────────────────────────────────────────────────────

describe('dep_exports integration', () => {
    it('happy: 2 exported functions → exports contains both names, size<=4096B', async () => {
        const filePath = join(testDir, 'b.ts');
        await writeFile(
            filePath,
            ['export function alpha(): void {}', 'export function beta(): void {}'].join('\n'),
        );
        const output = await runTool(brick, 'exports', { file: filePath });
        for (const inv of checkDepExportsHappy(output, ['alpha', 'beta'])) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── dep_circular ─────────────────────────────────────────────────────────────

describe('dep_circular integration', () => {
    it('happy: two files importing each other → cycles array non-empty, size<=4096B', async () => {
        // c.ts imports d.ts, d.ts imports c.ts → circular
        await writeFile(
            join(testDir, 'c.ts'),
            "import { d } from './d';\nexport function c(): void {}",
        );
        await writeFile(
            join(testDir, 'd.ts'),
            "import { c } from './c';\nexport function d(): void {}",
        );
        const output = await runTool(brick, 'circular', { dir: testDir });
        for (const inv of checkDepCircularHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── dep_fanin ────────────────────────────────────────────────────────────────

describe('dep_fanin integration', () => {
    it('happy: 1 file imports target → fanin has 1 entry and count=1, size<=4096B', async () => {
        const targetPath = join(testDir, 'target.ts');
        await writeFile(targetPath, 'export function target(): void {}');
        await writeFile(
            join(testDir, 'consumer.ts'),
            "import { target } from './target';\nexport function consumer(): void { target(); }",
        );
        const output = await runTool(brick, 'fanin', { file: targetPath, dir: testDir });
        for (const inv of checkDepFaninHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── dep_fanout ───────────────────────────────────────────────────────────────

describe('dep_fanout integration', () => {
    it('happy: file with 2 ESM imports → fanout=2, imports has 2 entries, size<=4096B', async () => {
        const filePath = join(testDir, 'e.ts');
        await writeFile(
            filePath,
            [
                "import { foo } from './foo';",
                "import { bar } from './bar';",
                'export function e(): void {}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'fanout', { file: filePath });
        for (const inv of checkDepFanoutHappy(output, 2)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
