/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'renamed'),
        inv.outputHasField(output, 'oldPath'),
        inv.outputHasField(output, 'newPath'),
        inv.outputHasField(output, 'importsUpdated'),
        inv.outputHasField(output, 'applied'),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['renamed'] !== true) {
                return { ok: false, reason: 'renamed must be true when apply:true is passed' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['applied'] !== true) {
                return { ok: false, reason: 'applied must be true when apply:true is passed' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            const newPath = String(out['newPath'] ?? '');
            if (!newPath.includes('greet.service')) {
                return {
                    ok: false,
                    reason: `newPath must contain "greet.service", got: ${newPath}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (!Array.isArray(out['importsUpdated'])) {
                return { ok: false, reason: 'importsUpdated must be an array' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
