/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        (() => {
            const o = output as { error: unknown };
            if (!(o.error instanceof Error)) {
                return {
                    ok: false,
                    reason: `expected an Error to be thrown for non-existent path, got ${typeof o.error}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
