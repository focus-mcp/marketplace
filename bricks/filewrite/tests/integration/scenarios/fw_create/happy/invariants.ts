/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'created'),
        inv.outputHasField(output, 'path'),
        (() => {
            const created = (output as { created: unknown }).created;
            if (created !== true) {
                return {
                    ok: false,
                    reason: `expected created=true, got ${JSON.stringify(created)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
