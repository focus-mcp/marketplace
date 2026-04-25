/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createSandbox, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkInlExtractHappy } from './scenarios/inl_extract/happy/invariants.js';
import { check as checkInlExtractNotFound } from './scenarios/inl_extract/not-found/invariants.js';
import { check as checkInlInlineHappy } from './scenarios/inl_inline/happy/invariants.js';
import { check as checkInlMoveHappy } from './scenarios/inl_move/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-inl-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

describe('inl_extract integration', () => {
    it('happy: extracts lines from sandbox file into a new function', async () => {
        const srcFile = resolve(FIXTURES_DIR, 'extract-target.ts');
        const destFile = join(sandboxPath, 'extract-target.ts');
        await writeFile(destFile, await readFile(srcFile, 'utf-8'), 'utf-8');

        // Extract lines 5-8 (the for-loop body: lines 5..8 in the file)
        const output = await runTool(brick, 'extract', {
            path: destFile,
            startLine: 5,
            endLine: 8,
            functionName: 'processLoop',
            apply: true,
        });

        for (const i of checkInlExtractHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Post-mutation: the extracted function name should appear in the file
        const content = await readFile(destFile, 'utf-8');
        expect(content).toContain('processLoop');
    });

    it('adversarial: invalid line range returns extracted=false with error message, file unchanged', async () => {
        const srcFile = resolve(FIXTURES_DIR, 'extract-target.ts');
        const destFile = join(sandboxPath, 'extract-target.ts');
        const originalContent = await readFile(srcFile, 'utf-8');
        await writeFile(destFile, originalContent, 'utf-8');

        // Line 9999 does not exist in the file
        const output = await runTool(brick, 'extract', {
            path: destFile,
            startLine: 9999,
            endLine: 10000,
            functionName: 'ghostFn',
            apply: true,
        });

        for (const i of checkInlExtractNotFound(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // File must be unchanged
        const content = await readFile(destFile, 'utf-8');
        expect(content).toBe(originalContent);
        expect(content).not.toContain('ghostFn');
    });
});

describe('inl_inline integration', () => {
    it('happy: inlines a const into its usage site, removes the definition', async () => {
        const srcFile = resolve(FIXTURES_DIR, 'inline-target.ts');
        const destFile = join(sandboxPath, 'inline-target.ts');
        await writeFile(destFile, await readFile(srcFile, 'utf-8'), 'utf-8');

        const output = await runTool(brick, 'inline', {
            path: destFile,
            name: 'GREETING',
            apply: true,
        });

        for (const i of checkInlInlineHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Post-mutation: definition must be gone, value must appear inlined
        const content = await readFile(destFile, 'utf-8');
        expect(content).not.toContain('const GREETING');
        expect(content).toContain('Hello FocusMCP');
    });
});

describe('inl_move integration', () => {
    it('happy: moves a function from source file to target file', async () => {
        const srcFile = resolve(FIXTURES_DIR, 'move-source.ts');
        const sourceFile = join(sandboxPath, 'move-source.ts');
        const targetFile = join(sandboxPath, 'move-dest.ts');

        await writeFile(sourceFile, await readFile(srcFile, 'utf-8'), 'utf-8');
        // Target starts empty (new file scenario)
        await writeFile(targetFile, '', 'utf-8');

        const output = await runTool(brick, 'move', {
            sourcePath: sourceFile,
            targetPath: targetFile,
            name: 'helperFn',
            apply: true,
        });

        for (const i of checkInlMoveHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Post-mutation checks
        const sourceContent = await readFile(sourceFile, 'utf-8');
        const targetContent = await readFile(targetFile, 'utf-8');

        // helperFn must be in target
        expect(targetContent).toContain('helperFn');
        // helperFn definition must not be in source anymore (import is ok, not the def)
        expect(sourceContent).not.toMatch(/^(?:export\s+)?function helperFn/m);
    });
});
