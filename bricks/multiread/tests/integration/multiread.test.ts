/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { createSandbox, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkMrBatchHappy } from './scenarios/mr_batch/happy/invariants.js';
import { check as checkMrDedupHappy } from './scenarios/mr_dedup/happy/invariants.js';
import { check as checkMrMergeHappy } from './scenarios/mr_merge/happy/invariants.js';

function assertInvariants(results: { ok: boolean; reason?: string }[]): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason}`);
    }
}

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);

describe('mr_batch integration', () => {
    it('happy: batch 3 NestJS files → files record with non-empty content', async () => {
        const paths = [
            resolve(NESTJS_INJECTOR, 'compiler.ts'),
            resolve(NESTJS_INJECTOR, 'container.ts'),
            resolve(NESTJS_INJECTOR, 'constants.ts'),
        ];
        const output = await runTool(brick, 'batch', { paths });
        assertInvariants(checkMrBatchHappy(output));
    });

    describe('adversarial', () => {
        let sandboxPath: string;
        let cleanupSandbox: () => Promise<void>;

        beforeEach(async () => {
            const sb = await createSandbox('fmcp-mr-itest-');
            sandboxPath = sb.path;
            cleanupSandbox = sb.cleanup;
        });

        afterEach(async () => {
            await cleanupSandbox();
        });

        it('non-existent path → throws error', async () => {
            await expect(
                runTool(brick, 'batch', {
                    paths: [resolve(sandboxPath, 'does-not-exist.ts')],
                }),
            ).rejects.toThrow();
        });
    });
});

describe('mr_dedup integration', () => {
    it('happy: dedup 2 NestJS files → files record with sharedImports array', async () => {
        const paths = [
            resolve(NESTJS_INJECTOR, 'compiler.ts'),
            resolve(NESTJS_INJECTOR, 'container.ts'),
        ];
        const output = await runTool(brick, 'dedup', { paths });
        assertInvariants(checkMrDedupHappy(output));
    });
});

describe('mr_merge integration', () => {
    it('happy: merge 2 NestJS files → content with filename separators', async () => {
        const paths = [
            resolve(NESTJS_INJECTOR, 'compiler.ts'),
            resolve(NESTJS_INJECTOR, 'constants.ts'),
        ];
        const output = await runTool(brick, 'merge', { paths });
        assertInvariants(checkMrMergeHappy(output));
        const out = output as { content: string };
        expect(out.content).toContain('compiler.ts');
        expect(out.content).toContain('constants.ts');
    });
});
