/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * onboarding integration tests — exercises onbScan and onbGuide operations directly.
 * The brick wires operations via bus.request for cross-brick calls (overview:*), but at
 * test time we invoke operations directly without busRequest so that standalone fallbacks
 * are used (no external brick dependencies needed).
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { _resetState, onbGuide, onbScan } from '../../src/operations.js';
import { check as checkOnbGuideHappy } from './scenarios/onb_guide/happy/invariants.js';
import { check as checkOnbScanEmptyDir } from './scenarios/onb_scan/empty-dir/invariants.js';
import { check as checkOnbScanHappy } from './scenarios/onb_scan/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

let testDir: string;
let emptyDir: string;

beforeEach(async () => {
    _resetState();
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-onb-int-'));
    emptyDir = await mkdtemp(join(tmpdir(), 'focusmcp-onb-empty-'));

    // Populate testDir with a minimal project
    await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { build: 'tsc', test: 'vitest' } }),
    );
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    await writeFile(join(testDir, 'README.md'), '# Test Project\n');
    await mkdir(join(testDir, 'src'));
    await writeFile(join(testDir, 'src', 'index.ts'), 'export const x = 1;\n');
    await writeFile(join(testDir, 'pnpm-lock.yaml'), '');
});

afterEach(async () => {
    _resetState();
    await rm(testDir, { recursive: true, force: true });
    await rm(emptyDir, { recursive: true, force: true });
});

// ─── onb_scan/happy ──────────────────────────────────────────────────────────

describe('onb_scan/happy integration', () => {
    it('scan a project dir → structure discovered', async () => {
        const output = await onbScan({ dir: testDir });
        assertInvariants(checkOnbScanHappy(output));
    });
});

// ─── onb_scan/empty-dir (adversarial) ────────────────────────────────────────

describe('onb_scan/empty-dir integration', () => {
    it('adversarial: scan empty dir → coherent output, keyFiles=[]', async () => {
        const output = await onbScan({ dir: emptyDir });
        assertInvariants(checkOnbScanEmptyDir(output));
    });
});

// ─── onb_guide/happy ─────────────────────────────────────────────────────────

describe('onb_guide/happy integration', () => {
    it('sequenced: scan + guide → markdown guide with expected sections', async () => {
        // scan first to populate state (used by guide via cache)
        await onbScan({ dir: testDir });
        const output = await onbGuide({ dir: testDir });
        assertInvariants(checkOnbGuideHappy(output));
    });
});
