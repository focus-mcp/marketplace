/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { layers?: unknown };
    return [
        inv.outputHasField(output, 'layers'),
        (() => {
            if (!Array.isArray(o.layers) || o.layers.length === 0) {
                return {
                    ok: false,
                    reason: `expected layers to be a non-empty array, got ${JSON.stringify(o.layers)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const layers = o.layers as unknown[];
            for (const l of layers) {
                const layer = l as { name?: unknown; nodes?: unknown; dependsOn?: unknown };
                if (typeof layer.name !== 'string' || layer.name.length === 0) {
                    return { ok: false, reason: `layer.name must be a non-empty string` };
                }
                if (!Array.isArray(layer.nodes)) {
                    return { ok: false, reason: `layer.nodes must be an array` };
                }
                if (!Array.isArray(layer.dependsOn)) {
                    return { ok: false, reason: `layer.dependsOn must be an array` };
                }
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
