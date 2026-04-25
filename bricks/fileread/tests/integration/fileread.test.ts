/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFrHead } from './scenarios/fr_head/happy/invariants.js';
import { check as checkFrRange } from './scenarios/fr_range/happy/invariants.js';
import { check as checkFrRead } from './scenarios/fr_read/happy/invariants.js';
import { check as checkFrTail } from './scenarios/fr_tail/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');
const SAMPLE = resolve(FIXTURES_DIR, 'sample.ts');

describe('fr_read integration', () => {
    it('happy: reads full file content', async () => {
        const output = await runTool(brick, 'read', { path: SAMPLE });
        for (const i of checkFrRead(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fr_read/happy/brick.expected'),
        );
    });
});

describe('fr_head integration', () => {
    it('happy: returns first 10 lines', async () => {
        const output = await runTool(brick, 'head', { path: SAMPLE, lines: 10 });
        for (const i of checkFrHead(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fr_head/happy/brick.expected'),
        );
    });
});

describe('fr_tail integration', () => {
    it('happy: returns last 5 lines', async () => {
        const output = await runTool(brick, 'tail', { path: SAMPLE, lines: 5 });
        for (const i of checkFrTail(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fr_tail/happy/brick.expected'),
        );
    });
});

describe('fr_range integration', () => {
    it('happy: returns lines 3..8', async () => {
        const output = await runTool(brick, 'range', { path: SAMPLE, from: 3, to: 8 });
        for (const i of checkFrRange(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fr_range/happy/brick.expected'),
        );
    });
});
