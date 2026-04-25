/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'totalFiles'),
        inv.outputHasField(output, 'totalSymbols'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['files'])) {
                return { ok: false, reason: 'files must be an array' };
            }
            if ((out['files'] as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'files must be non-empty — NestJS injector dir has many TS files',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['totalFiles'] !== 'number' || out['totalFiles'] <= 0) {
                return { ok: false, reason: 'totalFiles must be a positive number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['totalSymbols'] !== 'number' || out['totalSymbols'] < 0) {
                return { ok: false, reason: 'totalSymbols must be a non-negative number' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const files = (out['files'] as unknown[]) ?? [];
            const bad = files.filter((f) => {
                const entry = f as Record<string, unknown>;
                return (
                    typeof entry['path'] !== 'string' ||
                    typeof entry['symbols'] !== 'number' ||
                    typeof entry['exports'] !== 'number' ||
                    typeof entry['imports'] !== 'number' ||
                    typeof entry['lines'] !== 'number'
                );
            });
            if (bad.length > 0) {
                return {
                    ok: false,
                    reason: `malformed file entries: ${bad.length} missing path/symbols/exports/imports/lines`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
