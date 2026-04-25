/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileSyntaxValid } from '../../src/invariants/post-mutation.js';

describe('invariant fileSyntaxValid', () => {
    it('returns ok when TS file is valid', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'inv-'));
        const file = join(dir, 'ok.ts');
        writeFileSync(file, 'export const x: number = 1;');
        const res = await fileSyntaxValid(file, 'typescript');
        expect(res.ok).toBe(true);
    });

    it('returns failure when TS file is syntactically invalid', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'inv-'));
        const file = join(dir, 'bad.ts');
        writeFileSync(file, 'export const x: = ;');
        const res = await fileSyntaxValid(file, 'typescript');
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/syntax/i);
    });

    it('returns skipped (ok=true with reason) when the checker binary is missing', async () => {
        // Simulate by asking for an unsupported language.
        const res = await fileSyntaxValid('/tmp/anything', 'cobol' as never);
        expect(res.ok).toBe(true);
        expect(res.reason).toMatch(/unsupported language/i);
    });
});
