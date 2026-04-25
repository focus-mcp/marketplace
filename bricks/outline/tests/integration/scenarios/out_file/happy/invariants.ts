/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'symbols'),
        inv.outputHasField(output, 'imports'),
        inv.outputHasField(output, 'lineCount'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['symbols'])) {
                return { ok: false, reason: 'symbols must be an array' };
            }
            if ((out['symbols'] as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'symbols must be non-empty — compiler.ts exports ModuleFactory and ModuleCompiler',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['imports'])) {
                return { ok: false, reason: 'imports must be an array' };
            }
            if ((out['imports'] as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'imports must be non-empty — compiler.ts has import statements',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['lineCount'] !== 'number' || out['lineCount'] <= 0) {
                return { ok: false, reason: 'lineCount must be a positive number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const symbols = (out['symbols'] as unknown[]) ?? [];
            const bad = symbols.filter((s) => {
                const sym = s as Record<string, unknown>;
                return (
                    typeof sym['name'] !== 'string' ||
                    typeof sym['kind'] !== 'string' ||
                    typeof sym['line'] !== 'number' ||
                    typeof sym['signature'] !== 'string' ||
                    typeof sym['exported'] !== 'boolean'
                );
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed symbol entries: ${bad.length} missing name/kind/line/signature/exported`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const symbols = (out['symbols'] as unknown[]) ?? [];
            const hasCompiler = symbols.some(
                (s) => (s as Record<string, unknown>)['name'] === 'ModuleCompiler',
            );
            if (!hasCompiler) {
                return {
                    ok: false,
                    reason: 'expected "ModuleCompiler" in symbols — compiler.ts exports this class',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
