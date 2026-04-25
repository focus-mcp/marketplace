/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createSandbox, expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkRevArchitectureHappy } from './scenarios/rev_architecture/happy/invariants.js';
import { check as checkRevCodeHappy } from './scenarios/rev_code/happy/invariants.js';
import { check as checkRevCompareHappy } from './scenarios/rev_compare/happy/invariants.js';
import { check as checkRevSecurityClean } from './scenarios/rev_security/clean-file/invariants.js';
import { check as checkRevSecurityHappy } from './scenarios/rev_security/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

let sandboxPath: string;
let cleanupSandbox: () => Promise<void>;

beforeEach(async () => {
    const sb = await createSandbox('fmcp-rev-itest-');
    sandboxPath = sb.path;
    cleanupSandbox = sb.cleanup;
});

afterEach(async () => {
    await cleanupSandbox();
});

// ─── rev_code ─────────────────────────────────────────────────────────────────

describe('rev_code integration', () => {
    it('happy: reviews NestJS service — finds TODO and console.log', async () => {
        const output = await runTool(brick, 'code', {
            path: resolve(FIXTURES_DIR, 'nestjs-service.ts'),
        });
        for (const i of checkRevCodeHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── rev_security ─────────────────────────────────────────────────────────────

describe('rev_security integration', () => {
    it('happy: detects hardcoded API key (sk_test_xxx) in fixture', async () => {
        const output = await runTool(brick, 'security', {
            path: resolve(FIXTURES_DIR, 'secret-leak.ts'),
        });
        for (const i of checkRevSecurityHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('adversarial: clean file returns empty findings and riskLevel=low', async () => {
        const output = await runTool(brick, 'security', {
            path: resolve(FIXTURES_DIR, 'clean.ts'),
        });
        for (const i of checkRevSecurityClean(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'rev_security/clean-file/brick.expected'),
        );
    });
});

// ─── rev_architecture ─────────────────────────────────────────────────────────

describe('rev_architecture integration', () => {
    it('happy: detects MVC layers in sandbox with controllers/ services/ models/', async () => {
        await mkdir(join(sandboxPath, 'controllers'), { recursive: true });
        await mkdir(join(sandboxPath, 'services'), { recursive: true });
        await mkdir(join(sandboxPath, 'models'), { recursive: true });
        await writeFile(
            join(sandboxPath, 'controllers', 'user.controller.ts'),
            'export class UserController {}',
        );
        await writeFile(
            join(sandboxPath, 'services', 'user.service.ts'),
            'export class UserService {}',
        );
        await writeFile(
            join(sandboxPath, 'models', 'user.model.ts'),
            'export interface User { id: string; }',
        );

        const output = await runTool(brick, 'architecture', { dir: sandboxPath });
        for (const i of checkRevArchitectureHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── rev_compare ──────────────────────────────────────────────────────────────

describe('rev_compare integration', () => {
    it('happy: compares two file versions — detects additions and similarity < 1', async () => {
        // Use pre-built fixture files to avoid noTemplateCurlyInString lint rule
        const output = await runTool(brick, 'compare', {
            pathA: resolve(FIXTURES_DIR, 'greet-v1.ts'),
            pathB: resolve(FIXTURES_DIR, 'greet-v2.ts'),
        });
        for (const i of checkRevCompareHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
