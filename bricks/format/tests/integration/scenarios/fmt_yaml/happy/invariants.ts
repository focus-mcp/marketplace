/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'yaml'),
        (() => {
            const out = output as { yaml: unknown };
            if (typeof out.yaml !== 'string') {
                return { ok: false, reason: 'output.yaml must be a string' };
            }
            if (out.yaml.trim().length === 0) {
                return { ok: false, reason: 'output.yaml must not be empty' };
            }
            if (!out.yaml.includes('a:')) {
                return {
                    ok: false,
                    reason: `expected "a:" in YAML output, got: "${out.yaml}"`,
                };
            }
            if (!out.yaml.includes('b:')) {
                return {
                    ok: false,
                    reason: `expected "b:" in YAML output, got: "${out.yaml}"`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
