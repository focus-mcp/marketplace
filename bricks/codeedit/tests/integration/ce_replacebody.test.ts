/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invariants as inv, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import {
    check as checkPhpSingleLine,
    type Output,
} from './scenarios/ce_replacebody/php-single-line/invariants.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(thisDir, 'fixtures/synthetic/single-line.php');

describe('ce_replacebody integration', () => {
    it('happy: replaces compact PHP function body correctly', async () => {
        const workDir = mkdtempSync(join(tmpdir(), 'ce-rep-'));
        const workFile = join(workDir, 'single-line.php');
        copyFileSync(FIXTURE, workFile);

        const output = await runTool<unknown, Output>(brick, 'replacebody', {
            path: workFile,
            name: 'hasAnyChange',
            newBody: '        return count($this->getChanges()) > 0;',
            apply: true,
        });

        for (const i of checkPhpSingleLine(output, workFile)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        const syntax = await inv.fileSyntaxValid(workFile, 'php');
        if (!syntax.ok) throw new Error(`post-edit syntax check failed: ${syntax.reason}`);
    });
});
