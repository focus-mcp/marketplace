/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSandbox, expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFdDelta } from './scenarios/fd_delta/happy/invariants.js';
import { check as checkFdDiff } from './scenarios/fd_diff/happy/invariants.js';
import { check as checkFdPatchHappy } from './scenarios/fd_patch/happy/invariants.js';
import { checkOutput as checkFdPatchInvalidOutput } from './scenarios/fd_patch/invalid-patch/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-fd-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

describe('fd_diff integration', () => {
    it('happy: returns unified diff between two file versions', async () => {
        const output = await runTool(brick, 'diff', {
            a: resolve(FIXTURES_DIR, 'version-a.ts'),
            b: resolve(FIXTURES_DIR, 'version-b.ts'),
        });
        for (const i of checkFdDiff(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // No golden for fd_diff/happy: diff contains absolute file paths (dynamic)
    });
});

describe('fd_delta integration', () => {
    it('happy: returns delta array for in-memory string comparison', async () => {
        const output = await runTool(brick, 'delta', {
            before: 'line1\nline2\nline3',
            after: 'line1\nline2b\nline3',
        });
        for (const i of checkFdDelta(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fd_delta/happy/brick.expected'),
        );
    });
});

describe('fd_patch integration', () => {
    it('happy: applies valid unified diff patch to sandbox file', async () => {
        const filePath = resolve(sandboxPath, 'patchable.ts');
        await writeFile(filePath, 'Hello World\n', 'utf-8');

        const patch = [
            '--- a/patchable.ts',
            '+++ b/patchable.ts',
            '@@ -1,1 +1,1 @@',
            '-Hello World',
            '+Hello FocusMCP',
        ].join('\n');

        const output = await runTool(brick, 'patch', {
            path: filePath,
            patch,
        });

        for (const i of checkFdPatchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('Hello FocusMCP');
        expect(content).not.toContain('Hello World');
    });

    it('adversarial: invalid patch — file content unchanged (fail-safe)', async () => {
        const filePath = resolve(sandboxPath, 'untouched.ts');
        const originalContent = "const stable = 'unchanged content';\n";
        await writeFile(filePath, originalContent, 'utf-8');

        // The tool does not throw on malformed patch (no @@ header recognized).
        // It silently returns the original content unchanged.
        const output = await runTool(brick, 'patch', {
            path: filePath,
            patch: 'this is not a valid patch at all @@@ garbage',
        });

        for (const i of checkFdPatchInvalidOutput(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // Smoking-gun: original file must not be corrupted
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(originalContent);
    });
});
