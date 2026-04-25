/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSandbox, expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFsrchReplaceHappy } from './scenarios/fsrch_replace/happy/invariants.js';
import { check as checkFsrchReplaceNoMatch } from './scenarios/fsrch_replace/no-match/invariants.js';
import { check as checkFsrchSearchHappy } from './scenarios/fsrch_search/happy/invariants.js';
import { check as checkFsrchSearchNoMatch } from './scenarios/fsrch_search/no-match/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-fsrch-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

describe('fsrch_search integration', () => {
    it('happy: finds @Injectable in synthetic fixtures', async () => {
        const output = await runTool(brick, 'search', {
            path: FIXTURES_DIR,
            pattern: '@Injectable',
        });
        for (const i of checkFsrchSearchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // No golden for happy: matches contain absolute paths (dynamic)
    });

    it('adversarial: no-match returns empty matches array', async () => {
        const output = await runTool(brick, 'search', {
            path: FIXTURES_DIR,
            pattern: 'XYZZY_NONEXISTENT_PATTERN_12345',
        });
        for (const i of checkFsrchSearchNoMatch(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fsrch_search/no-match/brick.expected'),
        );
    });
});

describe('fsrch_replace integration', () => {
    it('happy: replaces pattern in sandbox file', async () => {
        const filePath = resolve(sandboxPath, 'replace-me.ts');
        const originalContent = "const greeting = 'Hello World!';\nexport default greeting;\n";
        await writeFile(filePath, originalContent, 'utf-8');

        const output = await runTool(brick, 'replace', {
            path: filePath,
            pattern: 'Hello World!',
            replacement: 'Hello FocusMCP!',
        });

        for (const i of checkFsrchReplaceHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('Hello FocusMCP!');
        expect(content).not.toContain('Hello World!');
    });

    it('adversarial: no-match — file content unchanged (fail-safe)', async () => {
        const filePath = resolve(sandboxPath, 'unchanged.ts');
        const originalContent = "const value = 'stable content';\nexport default value;\n";
        await writeFile(filePath, originalContent, 'utf-8');

        const output = await runTool(brick, 'replace', {
            path: filePath,
            pattern: 'XYZZY_NONEXISTENT_12345',
            replacement: 'SHOULD_NEVER_APPEAR',
        });

        for (const i of checkFsrchReplaceNoMatch(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // Smoking-gun: file must not be modified
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe(originalContent);
        expect(content).not.toContain('SHOULD_NEVER_APPEAR');
    });
});
