/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * shell integration tests — executes real shell commands in a sandbox.
 * Only safe, inoffensive commands are used: echo, printf, false, sleep.
 * No rm, curl, npm install, or any destructive/network commands.
 */

import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { killAllBackground } from '../../src/operations.js';
import { check as checkShBackgroundHappy } from './scenarios/sh_background/happy/invariants.js';
import { check as checkShCompressHappy } from './scenarios/sh_compress/happy/invariants.js';
import { check as checkShExecHappy } from './scenarios/sh_exec/happy/invariants.js';
import { check as checkShExecNonZeroExit } from './scenarios/sh_exec/non-zero-exit/invariants.js';
import { check as checkShKillHappy } from './scenarios/sh_kill/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

afterEach(() => {
    killAllBackground();
});

// ─── sh_exec/happy ───────────────────────────────────────────────────────────

describe('sh_exec/happy integration', () => {
    it('echo hello → stdout contains "hello", exitCode=0', async () => {
        const output = await runTool(brick, 'exec', { command: 'echo hello' });
        assertInvariants(checkShExecHappy(output));
    });
});

// ─── sh_exec/non-zero-exit (adversarial) ─────────────────────────────────────

describe('sh_exec/non-zero-exit integration', () => {
    it('adversarial: "false" → exitCode=1, no exception thrown', async () => {
        const output = await runTool(brick, 'exec', { command: 'false' });
        assertInvariants(checkShExecNonZeroExit(output));
    });
});

// ─── sh_compress/happy ───────────────────────────────────────────────────────

describe('sh_compress/happy integration', () => {
    it('printf 3 lines → compressed output, lines=3, truncated=false', async () => {
        const output = await runTool(brick, 'compress', { command: "printf 'a\nb\nc\n'" });
        assertInvariants(checkShCompressHappy(output));
    });
});

// ─── sh_background/happy + sh_kill/happy (sequenced) ─────────────────────────

describe('sh_background/happy + sh_kill/happy integration', () => {
    it('sequenced: background sleep + kill → killed=true', async () => {
        const bgOutput = await runTool(brick, 'background', { command: 'sleep 60' });
        assertInvariants(checkShBackgroundHappy(bgOutput));

        const bg = bgOutput as { id: string };
        const killOutput = await runTool(brick, 'kill', { id: bg.id });
        assertInvariants(checkShKillHappy(killOutput, bg.id));
    });
});
