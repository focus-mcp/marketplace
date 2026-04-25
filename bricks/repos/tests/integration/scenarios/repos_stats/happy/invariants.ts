/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedFiles: number, repoPath: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'lines'),
        inv.outputHasField(output, 'languages'),
        inv.outputSizeUnder(4096)(output),
        (() => {
            const o = output as { files: unknown };
            if (typeof o.files !== 'number' || o.files < 0) {
                return { ok: false, reason: `expected files>=0, got ${String(o.files)}` };
            }
            if (o.files !== expectedFiles) {
                return {
                    ok: false,
                    reason: `expected files=${expectedFiles} for ${repoPath}, got ${String(o.files)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { lines: unknown };
            if (typeof o.lines !== 'number' || o.lines < 0) {
                return { ok: false, reason: `expected lines>=0, got ${String(o.lines)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { languages: unknown };
            if (
                typeof o.languages !== 'object' ||
                o.languages === null ||
                Array.isArray(o.languages)
            ) {
                return { ok: false, reason: `expected languages to be an object` };
            }
            const langs = o.languages as Record<string, unknown>;
            if (!('ts' in langs) && !('.ts' in langs)) {
                return { ok: false, reason: `expected languages to contain ts entries` };
            }
            return { ok: true };
        })(),
    ];
}
