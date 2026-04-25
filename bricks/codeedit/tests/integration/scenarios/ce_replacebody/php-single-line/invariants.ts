/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFileSync } from 'node:fs';
import { type InvariantResult, invariants as inv } from '@focus-mcp/marketplace-testing';

export interface Output {
    found: boolean;
    startLine?: number;
    endLine?: number;
    preview?: { before: string; after: string };
    error?: string;
    syntaxError?: string;
}

export function check(output: Output, fixtureFile: string): InvariantResult[] {
    const results: InvariantResult[] = [];
    results.push(inv.outputHasField(output, 'found'));

    if (output.found !== true) {
        results.push({
            ok: false,
            reason: 'expected found=true for compact one-line PHP function',
        });
        return results;
    }

    // Must have a non-zero start/end line range
    if (!output.startLine || !output.endLine || output.endLine < output.startLine) {
        results.push({
            ok: false,
            reason: `invalid line range: start=${output.startLine}, end=${output.endLine}`,
        });
    }

    // Updated file must contain the new body
    const content = readFileSync(fixtureFile, 'utf-8');
    if (!content.includes('return count($this->getChanges()) > 0')) {
        results.push({ ok: false, reason: 'new body not present in file after replacement' });
    }

    results.push({ ok: true });
    return results;
}
