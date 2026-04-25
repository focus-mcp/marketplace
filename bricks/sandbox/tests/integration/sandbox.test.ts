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
import { check as checkBoxExprHappy } from './scenarios/box_eval/happy/invariants.js';
import { check as checkBoxFileHappy } from './scenarios/box_file/happy/invariants.js';
import { check as checkBoxLanguagesHappy } from './scenarios/box_languages/happy/invariants.js';
import { check as checkBoxReadHappy } from './scenarios/box_read/happy/invariants.js';
import { check as checkBoxRunHappy } from './scenarios/box_run/happy/invariants.js';
import { check as checkBoxRunSyntaxError } from './scenarios/box_run/syntax-error/invariants.js';

// Sandbox is stateless — each call creates a fresh vm.createContext. No reset needed.

// cwd captured once — used by box_read which needs a relative path within process.cwd()
const cwd = process.cwd();

// ─── box_run ─────────────────────────────────────────────────────────────────

describe('box_run integration', () => {
    it('happy: run({code: "1 + 1"}) → result="2", no error, size<=2048B', async () => {
        const output = await runTool(brick, 'run', { code: '1 + 1' });
        for (const inv of checkBoxRunHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });

    it('syntax-error: invalid code → error defined, result="undefined", size<=2048B', async () => {
        const output = await runTool(brick, 'run', { code: 'invalid {syntax {' });
        for (const inv of checkBoxRunSyntaxError(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── box_eval ────────────────────────────────────────────────────────────────

describe('box_eval integration', () => {
    it('happy: expression "2 + 2" → value="4", type="number", size<=2048B', async () => {
        const output = await runTool(brick, 'eval', { expression: '2 + 2' });
        for (const inv of checkBoxExprHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── box_languages ───────────────────────────────────────────────────────────

describe('box_languages integration', () => {
    it('happy: languages() → array non-empty with js+ts supported, size<=2048B', async () => {
        const output = await runTool(brick, 'languages', {});
        for (const inv of checkBoxLanguagesHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── box_read ────────────────────────────────────────────────────────────────

describe('box_read integration', () => {
    it('happy: read relative path within cwd → content matches, path resolved, size<=2048B', async () => {
        const relPath = 'sandbox-integ-read-test.txt';
        const absPath = join(cwd, relPath);
        const expectedContent = 'hello from box_read integration test';
        await writeFile(absPath, expectedContent, 'utf-8');
        try {
            const output = await runTool(brick, 'read', { path: relPath });
            for (const inv of checkBoxReadHappy(output, expectedContent)) {
                if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
            }
        } finally {
            await rm(absPath, { force: true });
        }
    });
});

// ─── box_file ────────────────────────────────────────────────────────────────

describe('box_file integration', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await mkdtemp(join(tmpdir(), 'focusmcp-sandbox-integ-'));
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    it('happy: file({path}) executes JS returning 42 → result="42", no error, size<=2048B', async () => {
        const filePath = join(testDir, 'script.js');
        await writeFile(filePath, '42', 'utf-8');
        const output = await runTool(brick, 'file', { path: filePath });
        for (const inv of checkBoxFileHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
