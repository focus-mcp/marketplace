/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration tests for @focus-mcp/brick-fileops — Phase C3
 *
 * SMOKING GUN FINDINGS (Phase C3 investigation):
 * ----------------------------------------------
 * The +379% token regression seen in the sweep is NOT caused by payload bloat.
 * Each tool returns a compact object (< 200 B). The real cause is a PATH
 * RESOLUTION BUG:
 *
 *   `_workRoot` defaults to `resolve(process.cwd())` **at module load time**.
 *   In the benchmark harness the MCP server process is started from a
 *   directory that is NOT the task's test-repo root. The agent then calls
 *   fo_copy/fo_rename with paths relative to the test-repo, but the brick
 *   resolves them against the wrong CWD → ENOENT or silent wrong-dir ops.
 *   The agent retries, calls extra tools, and the total token + duration
 *   explodes (5.82× duration, only 1/4 coverage in the initial run).
 *
 *   Confirmed by the fileops.md observation:
 *   "brick answer lists 10 files in a wrong directory while native correctly
 *    lists 6 files in the right directory"
 *
 * Root cause: the brick does not accept a `cwd`/`root` parameter per-call,
 * and the global `_workRoot` is never set by the harness agent before use.
 * The `fileops:setRoot` tool exists but the agent doesn't know to call it.
 *
 * Flagged as P0 in benchmarks/PATCH_QUEUE.md.
 * NOT fixed in this PR — flag only.
 *
 * Payload size (confirmed here): all tools produce < 200 B.
 * The outputSizeUnder(2048) invariant would NOT have caught this bug.
 * A better sentinel: outputSizeUnder(512) + a setRoot pre-condition guard.
 */

import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createSandbox, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { setWorkRoot } from '../../src/operations.js';
import { check as checkFoCopyDestExists } from './scenarios/fo_copy/dest-exists/invariants.js';
import { check as checkFoCopyHappy } from './scenarios/fo_copy/happy/invariants.js';
import { check as checkFoDeleteHappy } from './scenarios/fo_delete/happy/invariants.js';
import { checkError as checkFoDeleteNonExistent } from './scenarios/fo_delete/non-existent/invariants.js';
import { check as checkFoMoveHappy } from './scenarios/fo_move/happy/invariants.js';
import { checkError as checkFoMoveSrcNotFound } from './scenarios/fo_move/src-not-found/invariants.js';
import { check as checkFoRenameHappy } from './scenarios/fo_rename/happy/invariants.js';
import { checkError as checkFoRenamePathTraversal } from './scenarios/fo_rename/path-traversal/invariants.js';

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;
let originalWorkRoot: string;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-fo-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
    // Pin workRoot to sandbox so all relative paths in tests resolve correctly.
    // This also exercises the setRoot mechanism used by the MCP harness.
    const { getWorkRoot } = await import('../../src/operations.js');
    originalWorkRoot = getWorkRoot();
    setWorkRoot(sandboxPath);
});

afterEach(async () => {
    setWorkRoot(originalWorkRoot);
    await cleanupSandbox();
});

// ─── fo_copy ──────────────────────────────────────────────────────────────────

describe('fo_copy/happy', () => {
    it('copies a file to a new path (sandbox)', async () => {
        await writeFile(join(sandboxPath, 'original.txt'), 'hello world\n', 'utf-8');

        const output = await runTool(brick, 'copy', {
            from: join(sandboxPath, 'original.txt'),
            to: join(sandboxPath, 'copy.txt'),
        });

        for (const inv of checkFoCopyHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        // Both files must exist
        const content = await readFile(join(sandboxPath, 'copy.txt'), 'utf-8');
        expect(content).toBe('hello world\n');
        await expect(access(join(sandboxPath, 'original.txt'))).resolves.toBeUndefined();
    });
});

describe('fo_copy/dest-exists', () => {
    it('copies over existing destination (Node copyFile overwrites by default)', async () => {
        await writeFile(join(sandboxPath, 'src.txt'), 'new content\n', 'utf-8');
        await writeFile(join(sandboxPath, 'dst.txt'), 'old content\n', 'utf-8');

        const output = await runTool(brick, 'copy', {
            from: join(sandboxPath, 'src.txt'),
            to: join(sandboxPath, 'dst.txt'),
        });

        // Document behaviour: copyFile silently overwrites (no COPYFILE_EXCL flag)
        for (const inv of checkFoCopyDestExists(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        // Dest now has src content
        const content = await readFile(join(sandboxPath, 'dst.txt'), 'utf-8');
        expect(content).toBe('new content\n');
    });
});

// ─── fo_move ──────────────────────────────────────────────────────────────────

describe('fo_move/happy', () => {
    it('moves a file: src gone, dest present', async () => {
        await writeFile(join(sandboxPath, 'to-move.txt'), 'move me\n', 'utf-8');

        const output = await runTool(brick, 'move', {
            from: join(sandboxPath, 'to-move.txt'),
            to: join(sandboxPath, 'moved.txt'),
        });

        for (const inv of checkFoMoveHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        // Src must be gone
        await expect(access(join(sandboxPath, 'to-move.txt'))).rejects.toThrow();
        // Dest must exist with correct content
        const content = await readFile(join(sandboxPath, 'moved.txt'), 'utf-8');
        expect(content).toBe('move me\n');
    });
});

describe('fo_move/src-not-found', () => {
    it('adversarial: move from missing src → throws ENOENT, dest not created', async () => {
        let caughtError: unknown;
        try {
            await runTool(brick, 'move', {
                from: join(sandboxPath, 'does-not-exist.txt'),
                to: join(sandboxPath, 'dest.txt'),
            });
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).toBeDefined();
        for (const inv of checkFoMoveSrcNotFound(caughtError)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        // Dest must NOT have been created
        await expect(access(join(sandboxPath, 'dest.txt'))).rejects.toThrow();
    });
});

// ─── fo_delete ────────────────────────────────────────────────────────────────

describe('fo_delete/happy', () => {
    it('deletes a file', async () => {
        const filePath = join(sandboxPath, 'to-delete.txt');
        await writeFile(filePath, 'delete me\n', 'utf-8');

        const output = await runTool(brick, 'delete', { path: filePath });

        for (const inv of checkFoDeleteHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        await expect(access(filePath)).rejects.toThrow();
    });
});

describe('fo_delete/non-existent', () => {
    it('adversarial: delete missing path → throws clear error', async () => {
        let caughtError: unknown;
        try {
            await runTool(brick, 'delete', {
                path: join(sandboxPath, 'ghost.txt'),
            });
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).toBeDefined();
        for (const inv of checkFoDeleteNonExistent(caughtError)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── fo_rename ────────────────────────────────────────────────────────────────

describe('fo_rename/happy', () => {
    it('renames file within its parent directory', async () => {
        const filePath = join(sandboxPath, 'original-name.txt');
        await writeFile(filePath, 'rename me\n', 'utf-8');

        const output = await runTool(brick, 'rename', {
            path: filePath,
            name: 'new-name.txt',
        });

        for (const inv of checkFoRenameHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        await expect(access(filePath)).rejects.toThrow();
        const content = await readFile(join(sandboxPath, 'new-name.txt'), 'utf-8');
        expect(content).toBe('rename me\n');
    });
});

describe('fo_rename/path-traversal', () => {
    it('adversarial: name="../escape" must be rejected (workRoot escape)', async () => {
        const filePath = join(sandboxPath, 'victim.txt');
        await writeFile(filePath, 'victim\n', 'utf-8');

        let caughtError: unknown;
        try {
            await runTool(brick, 'rename', {
                path: filePath,
                name: '../escape',
            });
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).toBeDefined();
        for (const inv of checkFoRenamePathTraversal(caughtError)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }

        // Original file must still be there (rename must not have happened)
        await expect(access(filePath)).resolves.toBeUndefined();
    });
});
