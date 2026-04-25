/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkFmtJsonHappy } from './scenarios/fmt_json/happy/invariants.js';
import { check as checkFmtMarkdownHappy } from './scenarios/fmt_markdown/happy/invariants.js';
import { check as checkFmtTableHappy } from './scenarios/fmt_table/happy/invariants.js';
import { check as checkFmtYamlHappy } from './scenarios/fmt_yaml/happy/invariants.js';

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

describe('fmt_json integration', () => {
    it('happy: pretty-print {"a":1,"b":[2,3]} → multi-line valid JSON', async () => {
        const output = await runTool(brick, 'json', { data: '{"a":1,"b":[2,3]}' });
        assertInvariants('fmt_json/happy', checkFmtJsonHappy(output));
    });
});

describe('fmt_yaml integration', () => {
    it('happy: {"a":1,"b":[2,3]} → YAML with keys a and b', async () => {
        const output = await runTool(brick, 'yaml', { data: '{"a":1,"b":[2,3]}' });
        assertInvariants('fmt_yaml/happy', checkFmtYamlHappy(output));
    });
});

describe('fmt_markdown integration', () => {
    it('happy: {"name":"Alice","role":"admin"} → markdown list with name and Alice', async () => {
        const output = await runTool(brick, 'markdown', {
            data: '{"name":"Alice","role":"admin"}',
            style: 'list',
        });
        assertInvariants('fmt_markdown/happy', checkFmtMarkdownHappy(output));
    });
});

describe('fmt_table integration', () => {
    it('happy: headers+rows → ASCII table with +--+ borders', async () => {
        const output = await runTool(brick, 'table', {
            headers: ['Name', 'Role'],
            rows: [
                ['Alice', 'admin'],
                ['Bob', 'user'],
            ],
        });
        assertInvariants('fmt_table/happy', checkFmtTableHappy(output));
    });
});
