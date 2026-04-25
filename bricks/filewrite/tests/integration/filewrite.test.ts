/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSandbox, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFwAppend } from './scenarios/fw_append/happy/invariants.js';
import { checkError as checkFwCreateAlreadyExists } from './scenarios/fw_create/already-exists-no-force/invariants.js';
import { check as checkFwCreateHappy } from './scenarios/fw_create/happy/invariants.js';
import { check as checkFwWrite } from './scenarios/fw_write/happy/invariants.js';

// Golden files are kept as documentation of expected shape.
// expectMatchesGolden is intentionally skipped for filewrite tests because
// the `path` field in responses is dynamic (sandbox tmpdir). Invariants +
// direct readFile assertions are the source of truth.
const _GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-fw-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

describe('fw_create integration', () => {
    it('happy: creates new file in sandbox', async () => {
        const filePath = resolve(sandboxPath, 'new-file.txt');
        const output = await runTool(brick, 'create', {
            path: filePath,
            content: 'Hello from fw_create\n',
        });

        for (const i of checkFwCreateHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // Verify file actually exists and has correct content
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('Hello from fw_create\n');
    });

    it('adversarial: already-exists-no-force → throws with clear message', async () => {
        const filePath = resolve(sandboxPath, 'existing.txt');
        // Create the file first
        await writeFile(filePath, 'original content\n', 'utf-8');

        let caughtError: unknown;
        try {
            await runTool(brick, 'create', {
                path: filePath,
                content: 'NEW content that should NOT overwrite',
            });
        } catch (err) {
            caughtError = err;
        }

        // Must have thrown
        expect(caughtError).toBeDefined();
        for (const i of checkFwCreateAlreadyExists(caughtError)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        // Verify original content is intact (no silent overwrite)
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('original content\n');
    });
});

describe('fw_write integration', () => {
    it('happy: overwrites existing file', async () => {
        const filePath = resolve(sandboxPath, 'overwrite-me.txt');
        await writeFile(filePath, 'original content\n', 'utf-8');

        const output = await runTool(brick, 'write', {
            path: filePath,
            content: 'Overwritten content\n',
        });

        for (const i of checkFwWrite(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('Overwritten content\n');
    });
});

describe('fw_append integration', () => {
    it('happy: appends to existing file', async () => {
        const filePath = resolve(sandboxPath, 'append-me.txt');
        await writeFile(filePath, 'First line\n', 'utf-8');

        const output = await runTool(brick, 'append', {
            path: filePath,
            content: 'Appended line\n',
        });

        for (const i of checkFwAppend(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBe('First line\nAppended line\n');
    });
});
