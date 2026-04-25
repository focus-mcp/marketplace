/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { describe, expect, it } from 'vitest';
import { insertedNearAnchor } from '../../src/invariants/inserted-near-anchor.js';

const SAMPLE = [
    'class Foo {',
    '    public function hasAnyChange(): bool {',
    '        return true;',
    '    }',
    '    // INSERT MARKER',
    '    public function commit(): void {',
    '    }',
    '}',
].join('\n');

describe('invariant insertedNearAnchor', () => {
    it('passes when the inserted line is within max distance of anchor function', () => {
        const res = insertedNearAnchor({
            fileContent: SAMPLE,
            insertedLine: 5, // the "// INSERT MARKER" line (1-based)
            anchorFunctionName: 'hasAnyChange',
            maxDistance: 5,
            language: 'php',
        });
        expect(res.ok).toBe(true);
    });

    it('fails when the inserted line is too far from the anchor function', () => {
        const far = SAMPLE + '\n' + '\n'.repeat(100) + '// FAR INSERT\n';
        const res = insertedNearAnchor({
            fileContent: far,
            insertedLine: far.split('\n').length - 1,
            anchorFunctionName: 'hasAnyChange',
            maxDistance: 5,
            language: 'php',
        });
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/too far/i);
    });

    it('fails when the anchor function is not found', () => {
        const res = insertedNearAnchor({
            fileContent: SAMPLE,
            insertedLine: 5,
            anchorFunctionName: 'doesNotExist',
            maxDistance: 5,
            language: 'php',
        });
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/not found/i);
    });
});
