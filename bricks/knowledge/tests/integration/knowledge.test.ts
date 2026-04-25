/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetKnowledge } from '../../src/operations.js';
import { check as checkKbFetchHappy } from './scenarios/kb_fetch/happy/invariants.js';
import { check as checkKbFetchNonExistent } from './scenarios/kb_fetch/non-existent/invariants.js';
import { check as checkKbIndexHappy } from './scenarios/kb_index/happy/invariants.js';
import { check as checkKbPurgeHappy } from './scenarios/kb_purge/happy/invariants.js';
import { check as checkKbRankHappy } from './scenarios/kb_rank/happy/invariants.js';
import { check as checkKbSearchHappy } from './scenarios/kb_search/happy/invariants.js';

beforeEach(() => {
    resetKnowledge();
});

afterEach(() => {
    resetKnowledge();
});

// ─── kb_index ─────────────────────────────────────────────────────────────────

describe('kb_index integration', () => {
    it('happy: index doc → id returned, title matches, tokenCount > 0', async () => {
        const output = await runTool(brick, 'index', {
            title: 'Test Document',
            content: 'This is test content for indexing',
        });
        for (const i of checkKbIndexHappy(output, 'Test Document')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── kb_search ────────────────────────────────────────────────────────────────

describe('kb_search integration', () => {
    it('happy: index 3 docs sharing word, search → at least 1 result', async () => {
        await runTool(brick, 'index', { title: 'Doc A', content: 'The protocol is defined here' });
        await runTool(brick, 'index', {
            title: 'Doc B',
            content: 'Protocol design patterns explained',
        });
        await runTool(brick, 'index', { title: 'Doc C', content: 'Protocol version two released' });
        const output = await runTool(brick, 'search', { query: 'protocol' });
        for (const i of checkKbSearchHappy(output, 1)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── kb_fetch ─────────────────────────────────────────────────────────────────

describe('kb_fetch integration', () => {
    it('happy: index then fetch by id → full entry returned', async () => {
        const title = 'Fetch Me';
        const indexOutput = await runTool(brick, 'index', {
            title,
            content: 'Content to be fetched later',
        });
        const { id } = indexOutput as { id: string };
        const output = await runTool(brick, 'fetch', { id });
        for (const i of checkKbFetchHappy(output, id, title)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('non-existent: fetch unknown id → error field returned', async () => {
        const output = await runTool(brick, 'fetch', {
            id: '00000000-0000-0000-0000-000000000000',
        });
        for (const i of checkKbFetchNonExistent(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── kb_purge ─────────────────────────────────────────────────────────────────

describe('kb_purge integration', () => {
    it('happy: index 3 docs with tag, purge by tag → purged=3, remaining=0', async () => {
        await runTool(brick, 'index', { title: 'A', content: 'alpha content', tags: ['temp'] });
        await runTool(brick, 'index', { title: 'B', content: 'beta content', tags: ['temp'] });
        await runTool(brick, 'index', { title: 'C', content: 'gamma content', tags: ['temp'] });
        const purgeOutput = await runTool(brick, 'purge', { tags: ['temp'] });
        for (const i of checkKbPurgeHappy(purgeOutput, 3, 0)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── kb_rank ──────────────────────────────────────────────────────────────────

describe('kb_rank integration', () => {
    it('happy: index 3 docs sharing word, rank → ordered results', async () => {
        await runTool(brick, 'index', { title: 'Doc A', content: 'The protocol is defined here' });
        await runTool(brick, 'index', { title: 'Doc B', content: 'Protocol design patterns' });
        await runTool(brick, 'index', { title: 'Doc C', content: 'Protocol version two' });
        const output = await runTool(brick, 'rank', { query: 'protocol' });
        for (const i of checkKbRankHappy(output, 1)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
