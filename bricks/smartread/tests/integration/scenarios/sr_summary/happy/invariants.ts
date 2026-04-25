/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'entries'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['entries'])) {
                return { ok: false, reason: 'entries must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const entries = out['entries'];
            if (!Array.isArray(entries) || entries.length === 0) {
                return {
                    ok: false,
                    reason: 'entries must be non-empty — compiler.ts has class ModuleCompiler with methods',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const entries = (out['entries'] as unknown[]) ?? [];
            const bad = entries.filter((e) => {
                const entry = e as Record<string, unknown>;
                return (
                    typeof entry['name'] !== 'string' ||
                    typeof entry['startLine'] !== 'number' ||
                    typeof entry['endLine'] !== 'number' ||
                    typeof entry['lineCount'] !== 'number'
                );
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed summary entries: ${bad.length} missing name/startLine/endLine/lineCount`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const entries = (out['entries'] as unknown[]) ?? [];
            const hasCompiler = entries.some(
                (e) =>
                    typeof (e as Record<string, unknown>)['name'] === 'string' &&
                    (e as Record<string, unknown>)['name'] === 'ModuleCompiler',
            );
            if (!hasCompiler) {
                return {
                    ok: false,
                    reason: 'expected an entry with name "ModuleCompiler"',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
