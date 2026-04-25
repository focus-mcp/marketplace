/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { stat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createSandbox } from '../src/sandbox.js';

describe('createSandbox', () => {
    it('creates a temp directory', async () => {
        const sb = await createSandbox();
        const s = await stat(sb.path);
        expect(s.isDirectory()).toBe(true);
        await sb.cleanup();
    });

    it('file() returns path inside sandbox', async () => {
        const sb = await createSandbox();
        expect(sb.file('foo.txt')).toBe(`${sb.path}/foo.txt`);
        await sb.cleanup();
    });

    it('cleanup removes the directory', async () => {
        const sb = await createSandbox();
        await sb.cleanup();
        await expect(stat(sb.path)).rejects.toThrow();
    });
});
