/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { readFileSync } from 'node:fs';
import { type InvariantResult, invariants as inv } from '@focus-mcp/marketplace-testing';

export interface Output {
    inserted: boolean;
    atLine?: number;
    matches?: Array<{ line: number; contextSnippet: string }>;
    error?: string;
}

export function check(output: Output, fixtureFile: string): InvariantResult[] {
    const results: InvariantResult[] = [];
    results.push(inv.outputHasField(output, 'inserted'));

    if (output.inserted === false) {
        // Refusal is valid — must come with matches list so caller can disambiguate.
        results.push(
            !Array.isArray(output.matches) || output.matches.length < 2
                ? { ok: false, reason: 'inserted=false must return matches[] with >= 2 entries' }
                : { ok: true },
        );
        return results;
    }

    // inserted === true — position must be within 5 lines of the function definition
    const fileContent = readFileSync(fixtureFile, 'utf-8');
    if (typeof output.atLine !== 'number') {
        results.push({ ok: false, reason: 'inserted=true but no `atLine` in output' });
        return results;
    }
    results.push(
        inv.insertedNearAnchor({
            fileContent,
            insertedLine: output.atLine,
            anchorFunctionName: 'hasAnyChange',
            maxDistance: 5,
            language: 'php',
        }),
    );
    return results;
}
