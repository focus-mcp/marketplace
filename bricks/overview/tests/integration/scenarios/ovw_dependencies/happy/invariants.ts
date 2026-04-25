/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'production'),
        inv.outputHasField(output, 'dev'),
        inv.outputHasField(output, 'framework'),
        inv.outputHasField(output, 'testRunner'),
        inv.outputHasField(output, 'linter'),
        inv.outputHasField(output, 'bundler'),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['production'])) {
                return { ok: false, reason: 'production must be an array' };
            }
            if (!Array.isArray(out['dev'])) {
                return { ok: false, reason: 'dev must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const prod = out['production'] as unknown[];
            if (prod.length === 0) {
                return {
                    ok: false,
                    reason: 'NestJS fixture should have non-empty production deps',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const prod = (out['production'] as unknown[]) ?? [];
            const bad = prod.filter((d) => {
                const entry = d as Record<string, unknown>;
                return typeof entry['name'] !== 'string' || typeof entry['version'] !== 'string';
            });
            if (bad.length > 0) {
                return { ok: false, reason: `malformed dep entries: ${bad.length}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
