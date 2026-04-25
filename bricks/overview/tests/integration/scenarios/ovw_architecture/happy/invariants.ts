/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'folders'),
        inv.outputHasField(output, 'patterns'),
        inv.outputHasField(output, 'entryPoints'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['folders'])) {
                return { ok: false, reason: 'folders must be an array' };
            }
            if ((out['folders'] as unknown[]).length === 0) {
                return { ok: false, reason: 'expected non-empty folders for nestjs injector dir' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['patterns'])) {
                return { ok: false, reason: 'patterns must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const patterns = out['patterns'] as string[];
            if (!patterns.includes('module-based')) {
                return {
                    ok: false,
                    reason: `expected "module-based" in patterns for nestjs injector, got: ${patterns.join(', ')}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const folders = (output as Record<string, unknown[]>)['folders'] ?? [];
            const bad = folders.filter((f) => {
                const entry = f as Record<string, unknown>;
                return (
                    typeof entry['path'] !== 'string' ||
                    typeof entry['fileCount'] !== 'number' ||
                    !Array.isArray(entry['extensions'])
                );
            });
            if (bad.length > 0) {
                return { ok: false, reason: `malformed folder entries: ${bad.length}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
