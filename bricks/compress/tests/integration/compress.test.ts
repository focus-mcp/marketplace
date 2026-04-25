/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkCmpOutputEmpty } from './scenarios/cmp_output/empty-input/invariants.js';
import { check as checkCmpOutputHappy } from './scenarios/cmp_output/happy/invariants.js';
import { check as checkCmpResponseHappy } from './scenarios/cmp_response/happy/invariants.js';
import { check as checkCmpTerseHappy } from './scenarios/cmp_terse/happy/invariants.js';

const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

// ─── cmp_output ───────────────────────────────────────────────────────────────

describe('cmp_output integration', () => {
    it('happy: compresses TS snippet with comments + blank lines at level=medium', async () => {
        const text =
            '// This is a line comment\n/* Block comment */\nconst x = 1;\n\nconst y = 2;\n\nconsole.log(x + y);';
        const output = await runTool(brick, 'output', { text, level: 'medium' });

        for (const i of checkCmpOutputHappy(output, text.length)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'cmp_output/happy/brick.expected'),
        );
    });

    it('adversarial: empty string input returns empty compressed, no error', async () => {
        const output = await runTool(brick, 'output', { text: '' });

        for (const i of checkCmpOutputEmpty(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'cmp_output/empty-input/brick.expected'),
        );
    });
});

// ─── cmp_response ─────────────────────────────────────────────────────────────

describe('cmp_response integration', () => {
    it('happy: compresses JSON with null values — output shorter and null-free', async () => {
        const json =
            '{"status":"ok","error":null,"data":{"userId":"abc123","userDisplayName":"Alice","userEmail":null,"userAge":null,"result":"success"}}';
        const output = await runTool(brick, 'response', { json });

        for (const i of checkCmpResponseHappy(output, json.length)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'cmp_response/happy/brick.expected'),
        );
    });
});

// ─── cmp_terse ────────────────────────────────────────────────────────────────

describe('cmp_terse integration', () => {
    it('happy: terse a TS file — keeps identifiers and type names only', async () => {
        const text = [
            'export interface UserService {',
            '  findAll(): User[];',
            '}',
            'export const MAX_USERS = 100;',
            'export function createUser(name: string): User {',
            '  return { name };',
            '}',
            'type UserId = string;',
        ].join('\n');

        const output = await runTool(brick, 'terse', { text });

        for (const i of checkCmpTerseHappy(output, text.length)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'cmp_terse/happy/brick.expected'),
        );
    });
});
