/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { resetHeatmap } from '../../src/operations.js';
import { check as checkHmColdfilesHappy } from './scenarios/hm_coldfiles/happy/invariants.js';
import { check as checkHmHotfilesEmptyState } from './scenarios/hm_hotfiles/empty-state/invariants.js';
import { check as checkHmHotfilesHappy } from './scenarios/hm_hotfiles/happy/invariants.js';
import { check as checkHmPatternsHappy } from './scenarios/hm_patterns/happy/invariants.js';
import { check as checkHmTrackHappy } from './scenarios/hm_track/happy/invariants.js';

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

beforeEach(() => {
    resetHeatmap();
});

afterEach(() => {
    resetHeatmap();
});

describe('hm_track integration', () => {
    it('happy: track read access to "src/app.ts" → file + totalAccesses=1', async () => {
        const output = await runTool(brick, 'track', { file: 'src/app.ts', type: 'read' });
        assertInvariants('hm_track/happy', checkHmTrackHappy(output, 'src/app.ts'));
    });
});

describe('hm_hotfiles integration', () => {
    it('happy: track "src/app.ts" 3× then hotfiles → top file with count=3', async () => {
        await runTool(brick, 'track', { file: 'src/app.ts', type: 'read' });
        await runTool(brick, 'track', { file: 'src/app.ts', type: 'read' });
        await runTool(brick, 'track', { file: 'src/app.ts', type: 'read' });
        const output = await runTool(brick, 'hotfiles', {});
        assertInvariants('hm_hotfiles/happy', checkHmHotfilesHappy(output, 'src/app.ts', 3));
    });

    it('adversarial: empty-state — hotfiles with no prior tracking → empty array', async () => {
        const output = await runTool(brick, 'hotfiles', {});
        assertInvariants('hm_hotfiles/empty-state', checkHmHotfilesEmptyState(output));
    });
});

describe('hm_patterns integration', () => {
    it('happy: track "src/app.ts" + "src/main.ts" → coAccessed with both files', async () => {
        await runTool(brick, 'track', { file: 'src/app.ts', type: 'read' });
        await runTool(brick, 'track', { file: 'src/main.ts', type: 'read' });
        const output = await runTool(brick, 'patterns', {});
        assertInvariants(
            'hm_patterns/happy',
            checkHmPatternsHappy(output, ['src/app.ts', 'src/main.ts']),
        );
    });
});

describe('hm_coldfiles integration', () => {
    it('happy: track "src/old.ts", then coldfiles(threshold=1) → file in cold list', async () => {
        await runTool(brick, 'track', { file: 'src/old.ts', type: 'read' });
        // Wait 2ms so lastAccess < Date.now() - threshold (threshold=1)
        await new Promise<void>((resolve) => setTimeout(resolve, 2));
        const output = await runTool(brick, 'coldfiles', { threshold: 1 });
        assertInvariants('hm_coldfiles/happy', checkHmColdfilesHappy(output, 'src/old.ts'));
    });
});
