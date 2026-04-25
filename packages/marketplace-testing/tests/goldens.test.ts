/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectMatchesGolden, readMetrics } from '../src/goldens.js';

describe('goldens', () => {
    it('expectMatchesGolden passes when actual equals committed file content', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'gold-'));
        const file = join(dir, 'expected.txt');
        writeFileSync(file, 'hello world');
        await expect(expectMatchesGolden('hello world', file)).resolves.toBeUndefined();
    });

    it('expectMatchesGolden throws detailed diff on mismatch', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'gold-'));
        const file = join(dir, 'expected.txt');
        writeFileSync(file, 'hello world');
        await expect(expectMatchesGolden('hola mundo', file)).rejects.toThrow(/golden mismatch/i);
    });

    it('readMetrics returns the parsed metrics.json object', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'gold-'));
        const file = join(dir, 'metrics.json');
        writeFileSync(file, JSON.stringify({ native: { tokens: 100 }, brick: { tokens: 50 } }));
        const m = await readMetrics(file);
        expect(m).toEqual({ native: { tokens: 100 }, brick: { tokens: 50 } });
    });
});
