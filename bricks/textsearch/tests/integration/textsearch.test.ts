/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSandbox, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkTxtGroupedHappy } from './scenarios/txt_grouped/happy/invariants.js';
import { check as checkTxtRegexHappy } from './scenarios/txt_regex/happy/invariants.js';
import { check as checkTxtReplaceHappy } from './scenarios/txt_replace/happy/invariants.js';
import { check as checkTxtSearchHappy } from './scenarios/txt_search/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-txt-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

describe('txt_search integration', () => {
    it('happy: search "Injectable" in fixtures → at least 1 match', async () => {
        const output = await runTool(brick, 'search', {
            dir: FIXTURES_DIR,
            pattern: 'Injectable',
        });
        for (const i of checkTxtSearchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('txt_regex integration', () => {
    it('happy: regex "class\\s+\\w+Service" in fixtures → Service class matches', async () => {
        const output = await runTool(brick, 'regex', {
            dir: FIXTURES_DIR,
            pattern: 'class\\s+\\w+Service',
            flags: 'i',
        });
        for (const i of checkTxtRegexHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('txt_replace integration', () => {
    it('happy: replace in sandbox file → changes recorded, file updated', async () => {
        const filePath = resolve(sandboxPath, 'replace-test.ts');
        await writeFile(
            filePath,
            "const greeting = 'Hello World!';\nexport default greeting;\n",
            'utf-8',
        );

        const output = await runTool(brick, 'replace', {
            dir: sandboxPath,
            pattern: 'Hello World!',
            replacement: 'Hello FocusMCP!',
            apply: true,
        });

        for (const i of checkTxtReplaceHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        const content = await readFile(filePath, 'utf-8');
        expect(content).toContain('Hello FocusMCP!');
        expect(content).not.toContain('Hello World!');
    });
});

describe('txt_grouped integration', () => {
    it('happy: grouped search "Injectable" in fixtures → groups per file', async () => {
        const output = await runTool(brick, 'grouped', {
            dir: FIXTURES_DIR,
            pattern: 'Injectable',
        });
        for (const i of checkTxtGroupedHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
