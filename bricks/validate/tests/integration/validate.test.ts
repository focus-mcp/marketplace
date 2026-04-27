/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkValJsonHappy } from './scenarios/val_json/happy/invariants.js';
import { check as checkValLintHappy } from './scenarios/val_lint/happy/invariants.js';
import { check as checkValSchemaHappy } from './scenarios/val_schema/happy/invariants.js';
import { check as checkValTypesHappy } from './scenarios/val_types/happy/invariants.js';

let testDir: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-validate-integ-'));
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── val_json ─────────────────────────────────────────────────────────────────

describe('val_json integration', () => {
    it('happy: valid JSON string → valid=true, parsed defined, no error, size<=2048B', async () => {
        const output = await runTool(brick, 'json', { text: '{"name":"test","value":42}' });
        for (const inv of checkValJsonHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── val_schema ───────────────────────────────────────────────────────────────

describe('val_schema integration', () => {
    it('happy: valid data against simple schema → valid=true, errors=[], size<=2048B', async () => {
        const output = await runTool(brick, 'schema', {
            data: '{"name":"Alice"}',
            schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
            },
        });
        for (const inv of checkValSchemaHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── val_types ────────────────────────────────────────────────────────────────

describe('val_types integration', () => {
    it('happy: well-typed TS file → issues=[], score=100, size<=2048B', async () => {
        const filePath = join(testDir, 'clean.ts');
        await writeFile(
            filePath,
            ['export function add(a: number, b: number): number {', '    return a + b;', '}'].join(
                '\n',
            ),
        );
        const output = await runTool(brick, 'types', { path: filePath });
        for (const inv of checkValTypesHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});

// ─── val_lint ─────────────────────────────────────────────────────────────────

describe('val_lint integration', () => {
    it('happy: clean TS file → findings=[], clean=true, size<=2048B', async () => {
        const filePath = join(testDir, 'clean.ts');
        await writeFile(
            filePath,
            [
                'export function greet(name: string): string {',
                // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional — writing TS source code that contains a template literal
                '    return `Hello, ${name}`;',
                '}',
            ].join('\n'),
        );
        const output = await runTool(brick, 'lint', { path: filePath });
        for (const inv of checkValLintHappy(output)) {
            if (!inv.ok) throw new Error(`Invariant violated: ${inv.reason}`);
        }
    });
});
