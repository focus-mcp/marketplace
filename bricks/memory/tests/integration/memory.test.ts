/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { _setMemoryDir } from '../../src/operations.js';
import { check as checkMemForgetHappy } from './scenarios/mem_forget/happy/invariants.js';
import { check as checkMemListHappy } from './scenarios/mem_list/happy/invariants.js';
import { check as checkMemRecallHappy } from './scenarios/mem_recall/happy/invariants.js';
import { check as checkMemRecallNonExistent } from './scenarios/mem_recall/non-existent/invariants.js';
import { check as checkMemSearchHappy } from './scenarios/mem_search/happy/invariants.js';
import { check as checkMemStoreHappy } from './scenarios/mem_store/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-memory-inttest-'));
    _setMemoryDir(testDir);
});

afterEach(async () => {
    _setMemoryDir(undefined);
    await rm(testDir, { recursive: true, force: true });
});

// ─── mem_store ────────────────────────────────────────────────────────────────

describe('mem_store integration', () => {
    it('happy: store key=value returns ok=true', async () => {
        const output = await runTool(brick, 'store', { key: 'test-key', value: 'test-value' });
        for (const i of checkMemStoreHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── mem_recall ───────────────────────────────────────────────────────────────

describe('mem_recall integration', () => {
    it('happy: store then recall, verify value matches', async () => {
        await runTool(brick, 'store', { key: 'recall-key', value: 'recall-value' });
        const output = await runTool(brick, 'recall', { key: 'recall-key' });
        for (const i of checkMemRecallHappy(output, 'recall-value')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('non-existent: recall key that does not exist → value null', async () => {
        const output = await runTool(brick, 'recall', { key: 'no-such-key' });
        for (const i of checkMemRecallNonExistent(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── mem_search ───────────────────────────────────────────────────────────────

describe('mem_search integration', () => {
    it('happy: store several keys with common prefix, search by prefix', async () => {
        await runTool(brick, 'store', { key: 'proj:alpha', value: 'value alpha' });
        await runTool(brick, 'store', { key: 'proj:beta', value: 'value beta' });
        await runTool(brick, 'store', { key: 'other:gamma', value: 'value gamma' });
        const output = await runTool(brick, 'search', { query: 'proj' });
        for (const i of checkMemSearchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── mem_forget ───────────────────────────────────────────────────────────────

describe('mem_forget integration', () => {
    it('happy: store, forget, recall → not found', async () => {
        await runTool(brick, 'store', { key: 'to-forget', value: 'bye' });
        const forgetOutput = await runTool(brick, 'forget', { key: 'to-forget' });
        const recallOutput = await runTool(brick, 'recall', { key: 'to-forget' });
        for (const i of checkMemForgetHappy(forgetOutput, recallOutput)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── mem_list ─────────────────────────────────────────────────────────────────

describe('mem_list integration', () => {
    it('happy: store 3 keys, list → 3 entries', async () => {
        await runTool(brick, 'store', { key: 'list-a', value: 'a' });
        await runTool(brick, 'store', { key: 'list-b', value: 'b' });
        await runTool(brick, 'store', { key: 'list-c', value: 'c' });
        const output = await runTool(brick, 'list', {});
        for (const i of checkMemListHappy(output, 3)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
