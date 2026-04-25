/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkEchoSayEmptyMessage } from './scenarios/echo_say/empty-message/invariants.js';
import { check as checkEchoSayHappy } from './scenarios/echo_say/happy/invariants.js';

// ─── echo_say ─────────────────────────────────────────────────────────────────

describe('echo_say integration', () => {
    it('happy: message="hello" → output.message="hello"', async () => {
        const output = await runTool(brick, 'say', { message: 'hello' });
        for (const i of checkEchoSayHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('empty-message: message="" → output.message="" (no error)', async () => {
        const output = await runTool(brick, 'say', { message: '' });
        for (const i of checkEchoSayEmptyMessage(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
