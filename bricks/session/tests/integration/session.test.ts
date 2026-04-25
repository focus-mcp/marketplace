/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { _resetSession, _setSessionsDir } from '../../src/operations.js';
import { check as checkSesContextHappy } from './scenarios/ses_context/happy/invariants.js';
import { check as checkSesHistoryHappy } from './scenarios/ses_history/happy/invariants.js';
import { check as checkSesRestoreHappy } from './scenarios/ses_restore/happy/invariants.js';
import { check as checkSesRestoreNonExistent } from './scenarios/ses_restore/non-existent/invariants.js';
import { check as checkSesSaveHappy } from './scenarios/ses_save/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-session-inttest-'));
    _resetSession();
    _setSessionsDir(testDir);
});

afterEach(async () => {
    _resetSession();
    _setSessionsDir(undefined);
    await rm(testDir, { recursive: true, force: true });
});

// ─── ses_save ─────────────────────────────────────────────────────────────────

describe('ses_save integration', () => {
    it('happy: save({name, data}) returns ok=true and path', async () => {
        const output = await runTool(brick, 'save', { name: 'test', data: { context: 'hello' } });
        for (const i of checkSesSaveHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── ses_restore ──────────────────────────────────────────────────────────────

describe('ses_restore integration', () => {
    it('happy: save then restore → data identical', async () => {
        const data = { context: 'restore-test', notes: 'some notes' };
        await runTool(brick, 'save', { name: 'restore-me', data });
        const output = await runTool(brick, 'restore', { name: 'restore-me' });
        for (const i of checkSesRestoreHappy(output, data)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('non-existent: restore unknown name → data=null, savedAt=null', async () => {
        const output = await runTool(brick, 'restore', { name: 'no-such-session' });
        for (const i of checkSesRestoreNonExistent(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── ses_context ──────────────────────────────────────────────────────────────

describe('ses_context integration', () => {
    it('happy: get current context shape', async () => {
        const output = await runTool(brick, 'context', {});
        for (const i of checkSesContextHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── ses_history ──────────────────────────────────────────────────────────────

describe('ses_history integration', () => {
    it('happy: 3× save then history → 3 entries', async () => {
        await runTool(brick, 'save', { name: 'session-a', data: { files: ['a.ts'] } });
        await runTool(brick, 'save', { name: 'session-b', data: { files: ['b.ts'] } });
        await runTool(brick, 'save', { name: 'session-c', data: { files: ['c.ts'] } });
        const output = await runTool(brick, 'history', {});
        for (const i of checkSesHistoryHappy(output, 3)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
