/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * lastversion integration tests — these make real HTTP calls to npm registry.
 * They use stable, long-lived packages (react, lodash) to reduce flakiness.
 * If the npm registry is unavailable, tests will fail with a network error.
 *
 * Skipped scenarios (too flaky or require GitHub auth):
 *   - lv_diff: needs two dated versions → depends on npm time data consistency
 *   - lv_changelog: requires GitHub API (rate-limited without auth)
 *   - lv_audit: OSV.dev results vary over time (new advisories appear)
 */

import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { clearCache } from '../../src/operations.js';
import { check as checkLvCheckHappy } from './scenarios/lv_check/happy/invariants.js';
import { check as checkLvLatestHappy } from './scenarios/lv_latest/happy/invariants.js';
import { check as checkLvVersionsHappy } from './scenarios/lv_versions/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

afterEach(() => {
    clearCache();
});

// ─── lv_latest/happy ─────────────────────────────────────────────────────────

describe('lv_latest/happy integration', () => {
    it('fetch latest react from npm → semver string returned', async () => {
        const output = await runTool(brick, 'latest', { source: 'npm', target: 'react' });
        assertInvariants(checkLvLatestHappy(output));
    });
});

// ─── lv_versions/happy ───────────────────────────────────────────────────────

describe('lv_versions/happy integration', () => {
    it('list lodash versions from npm → array with total count', async () => {
        const output = await runTool(brick, 'versions', { source: 'npm', target: 'lodash' });
        assertInvariants(checkLvVersionsHappy(output));
    });
});

// ─── lv_check/happy ──────────────────────────────────────────────────────────

describe('lv_check/happy integration', () => {
    it('check react@17.0.0 → stale=true, bumpType=major', async () => {
        const output = await runTool(brick, 'check', {
            source: 'npm',
            target: 'react',
            current: '17.0.0',
        });
        assertInvariants(checkLvCheckHappy(output));
    });
});
