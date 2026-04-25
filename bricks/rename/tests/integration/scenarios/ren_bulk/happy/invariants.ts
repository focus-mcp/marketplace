/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'totalFiles'),
        inv.outputHasField(output, 'totalChanges'),
        inv.outputHasField(output, 'applied'),
        (() => {
            const out = output as Record<string, unknown>;
            const results = out['results'];
            if (!Array.isArray(results) || results.length !== 2) {
                return {
                    ok: false,
                    reason: `results must have 2 entries (one per rename), got: ${Array.isArray(results) ? results.length : 'non-array'}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const results = (output as Record<string, unknown[]>)['results'] ?? [];
            const serviceEntry = results.find(
                (r) => (r as Record<string, unknown>)['oldName'] === 'HelloService',
            );
            const controllerEntry = results.find(
                (r) => (r as Record<string, unknown>)['oldName'] === 'HelloController',
            );
            if (!serviceEntry) {
                return { ok: false, reason: 'missing result entry for HelloService rename' };
            }
            if (!controllerEntry) {
                return { ok: false, reason: 'missing result entry for HelloController rename' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as Record<string, unknown>;
            if (out['applied'] !== false) {
                return { ok: false, reason: 'applied must be false when apply:false is passed' };
            }
            return { ok: true };
        })(),
        (() => {
            const results = (output as Record<string, unknown[]>)['results'] ?? [];
            const serviceEntry = results.find(
                (r) => (r as Record<string, unknown>)['oldName'] === 'HelloService',
            ) as Record<string, unknown> | undefined;
            if (!serviceEntry) return { ok: true };
            const changes = serviceEntry['changes'];
            if (!Array.isArray(changes) || (changes as unknown[]).length === 0) {
                return {
                    ok: false,
                    reason: 'HelloService rename must produce non-empty changes',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
