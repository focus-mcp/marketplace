/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

// Shape: reposUnregister returns { ok: boolean } only.
// ok=true means the repo was found and removed; ok=false means it was not found.
// This invariant is intentionally distinct from repos_register/happy:
// it asserts ok=true (repo existed and was successfully removed),
// which is only reachable when a prior register succeeded.
export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'ok'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { ok: unknown };
            // ok=true confirms the repo was found and removed (not a no-op).
            // ok=false would mean the repo was never registered — unexpected in happy path.
            if (o.ok !== true) {
                return {
                    ok: false,
                    reason: `expected ok=true (repo removed), got ${String(o.ok)} — repo may not have been registered`,
                };
            }
            return { ok: true };
        })(),
    ];
}
