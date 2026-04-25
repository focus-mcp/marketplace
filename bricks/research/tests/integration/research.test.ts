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
import { check as checkRshMultisourceHappy } from './scenarios/rsh_multisource/happy/invariants.js';
import { check as checkRshSynthesizeHappy } from './scenarios/rsh_synthesize/happy/invariants.js';
import { check as checkRshValidateHappy } from './scenarios/rsh_validate/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

// Fixture TypeScript file contents
const FILE_A_CONTENT = `
export interface Config {
    host: string;
    port: number;
}

export function createServer(config: Config): void {
    console.log(config.host);
}

import { EventEmitter } from 'node:events';
`.trim();

const FILE_B_CONTENT = `
export interface Config {
    debug: boolean;
}

export function startApp(name: string): void {
    console.log(name);
}

import { EventEmitter } from 'node:events';
`.trim();

let testDir: string;
let fileA: string;
let fileB: string;

beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'focusmcp-research-int-'));
    fileA = join(testDir, 'module-a.ts');
    fileB = join(testDir, 'module-b.ts');
    await writeFile(fileA, FILE_A_CONTENT, 'utf-8');
    await writeFile(fileB, FILE_B_CONTENT, 'utf-8');
});

afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
});

// ─── rsh_multisource/happy ───────────────────────────────────────────────────

describe('rsh_multisource/happy integration', () => {
    it('paths=[2 files] → sources[2] with exports/imports/types/functions', async () => {
        const output = await runTool(brick, 'multisource', { paths: [fileA, fileB] });
        assertInvariants(checkRshMultisourceHappy(output, [fileA, fileB]));
    });
});

// ─── rsh_synthesize/happy ────────────────────────────────────────────────────

describe('rsh_synthesize/happy integration', () => {
    it('sequenced: multisource + synthesize → sharedTypes/commonDeps/apiSurface/connections', async () => {
        const multisourceOut = await runTool(brick, 'multisource', { paths: [fileA, fileB] });
        const { sources } = multisourceOut as { sources: unknown[] };

        if (sources.length === 0) {
            throw new Error('multisource returned empty sources — prerequisite failed');
        }

        const output = await runTool(brick, 'synthesize', { sources });
        assertInvariants(checkRshSynthesizeHappy(output));

        // Both files share 'Config' type and 'node:events' import — verify sharedTypes/commonDeps
        const synth = output as {
            sharedTypes: string[];
            commonDeps: string[];
            apiSurface: string[];
        };
        if (!synth.sharedTypes.includes('Config')) {
            throw new Error(
                `expected sharedTypes to include 'Config', got [${synth.sharedTypes.join(', ')}]`,
            );
        }
        if (!synth.commonDeps.includes('node:events')) {
            throw new Error(
                `expected commonDeps to include 'node:events', got [${synth.commonDeps.join(', ')}]`,
            );
        }
        if (synth.apiSurface.length === 0) {
            throw new Error('expected apiSurface to be non-empty');
        }
    });
});

// ─── rsh_validate/happy ──────────────────────────────────────────────────────

describe('rsh_validate/happy integration', () => {
    it('sequenced: multisource + validate → issues[], valid boolean', async () => {
        const multisourceOut = await runTool(brick, 'multisource', { paths: [fileA, fileB] });
        const { sources } = multisourceOut as { sources: unknown[] };

        if (sources.length === 0) {
            throw new Error('multisource returned empty sources — prerequisite failed');
        }

        const output = await runTool(brick, 'validate', { sources });
        assertInvariants(checkRshValidateHappy(output));
    });
});
