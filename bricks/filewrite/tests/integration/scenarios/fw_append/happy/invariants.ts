/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'appended'),
        inv.outputHasField(output, 'path'),
        (() => {
            const appended = (output as { appended: unknown }).appended;
            if (appended !== true) {
                return {
                    ok: false,
                    reason: `expected appended=true, got ${JSON.stringify(appended)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
