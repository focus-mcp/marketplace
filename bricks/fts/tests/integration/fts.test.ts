/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFtsIndexHappy } from './scenarios/fts_index/happy/invariants.js';
import { check as checkFtsRankHappy } from './scenarios/fts_rank/happy/invariants.js';
import { check as checkFtsSearchHappy } from './scenarios/fts_search/happy/invariants.js';
import { check as checkFtsSearchNoMatch } from './scenarios/fts_search/no-match/invariants.js';
import { check as checkFtsSuggestHappy } from './scenarios/fts_suggest/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

describe('fts_index integration', () => {
    it('happy: indexes synthetic fixtures directory', async () => {
        const output = await runTool(brick, 'index', { dir: FIXTURES_DIR });
        for (const i of checkFtsIndexHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('fts_search integration', () => {
    it('happy: finds "Injectable" in indexed fixtures', async () => {
        // Must index first — fts uses module-level in-memory state
        await runTool(brick, 'index', { dir: FIXTURES_DIR });

        const output = await runTool(brick, 'search', { query: 'Injectable' });
        for (const i of checkFtsSearchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('adversarial: no-match term returns empty results, no error', async () => {
        await runTool(brick, 'index', { dir: FIXTURES_DIR });

        const output = await runTool(brick, 'search', {
            query: 'XYZZY_NONEXISTENT_TERM_12345',
        });
        for (const i of checkFtsSearchNoMatch(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'fts_search/no-match/brick.expected'),
        );
    });
});

describe('fts_rank integration', () => {
    it('happy: ranks a list of files by query relevance', async () => {
        await runTool(brick, 'index', { dir: FIXTURES_DIR });

        const files = [resolve(FIXTURES_DIR, 'app.service.ts'), resolve(FIXTURES_DIR, 'utils.ts')];
        const output = await runTool(brick, 'rank', { query: 'Injectable', files });
        for (const i of checkFtsRankHappy(output, files)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('fts_suggest integration', () => {
    it('happy: suggests completions for prefix "inj"', async () => {
        await runTool(brick, 'index', { dir: FIXTURES_DIR });

        const output = await runTool(brick, 'suggest', { prefix: 'inj' });
        for (const i of checkFtsSuggestHappy(output, 'inj')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
