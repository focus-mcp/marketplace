/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getRealFixture, getSyntheticFixture } from '../src/fixtures.js';

describe('fixtures', () => {
    it('getRealFixture returns an absolute path that exists for nestjs', () => {
        const p = getRealFixture('nestjs');
        expect(p).toMatch(/\/fixtures\/nestjs$/);
        expect(existsSync(p)).toBe(true);
    });

    it('getRealFixture throws with a submodule hint when missing', () => {
        expect(() => getRealFixture('nonexistent' as never)).toThrow(/submodule/i);
    });

    it('getSyntheticFixture returns an absolute path under the brick tests dir', () => {
        const p = getSyntheticFixture('marketplace-testing', 'sample.txt');
        expect(p).toContain('/packages/marketplace-testing/');
        expect(p).toContain('synthetic/sample.txt');
    });
});
