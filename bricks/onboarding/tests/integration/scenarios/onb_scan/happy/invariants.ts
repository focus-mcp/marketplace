/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'project'),
        inv.outputHasField(output, 'architecture'),
        inv.outputHasField(output, 'conventions'),
        inv.outputHasField(output, 'keyFiles'),
        inv.outputHasField(output, 'summary'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as { project: unknown };
            if (typeof o.project !== 'object' || o.project === null) {
                return { ok: false, reason: 'expected project to be an object' };
            }
            const p = o.project as Record<string, unknown>;
            if (typeof p['name'] !== 'string' || p['name'].length === 0) {
                return { ok: false, reason: 'expected project.name to be a non-empty string' };
            }
            if (typeof p['language'] !== 'string') {
                return { ok: false, reason: 'expected project.language to be a string' };
            }
            if (typeof p['packageManager'] !== 'string') {
                return { ok: false, reason: 'expected project.packageManager to be a string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { keyFiles: unknown };
            if (!Array.isArray(o.keyFiles)) {
                return { ok: false, reason: 'expected keyFiles to be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { summary: unknown };
            if (typeof o.summary !== 'string' || o.summary.length === 0) {
                return { ok: false, reason: 'expected summary to be a non-empty string' };
            }
            return { ok: true };
        })(),
    ];
}
