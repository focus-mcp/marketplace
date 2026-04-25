/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'version'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { version: unknown };
            if (typeof o.version !== 'string' || o.version.length === 0) {
                return { ok: false, reason: 'expected version to be a non-empty string' };
            }
            // Must look like a semver (starts with digit)
            if (!/^\d+\.\d+/.test(o.version)) {
                return {
                    ok: false,
                    reason: `expected version to look like semver, got "${o.version}"`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { url?: unknown };
            if (o.url !== undefined && typeof o.url !== 'string') {
                return { ok: false, reason: 'expected url to be a string when present' };
            }
            return { ok: true };
        })(),
    ];
}
