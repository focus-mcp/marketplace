/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'name'),
        inv.outputHasField(output, 'framework'),
        inv.outputHasField(output, 'language'),
        inv.outputHasField(output, 'type'),
        inv.outputHasField(output, 'scripts'),
        inv.outputHasField(output, 'packageManager'),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['language'] !== 'typescript') {
                return {
                    ok: false,
                    reason: `NestJS fixture should be detected as TypeScript, got: ${String(out['language'])}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['name'] !== 'string' || out['name'].length === 0) {
                return { ok: false, reason: 'name must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (typeof out['scripts'] !== 'object' || out['scripts'] === null) {
                return { ok: false, reason: 'scripts must be an object' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
