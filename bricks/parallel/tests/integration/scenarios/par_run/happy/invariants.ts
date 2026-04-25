/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as {
        runId?: unknown;
        taskCount?: unknown;
        completed?: unknown;
        failed?: unknown;
    };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'runId'),
        inv.outputHasField(output, 'taskCount'),
        inv.outputHasField(output, 'completed'),
        inv.outputHasField(output, 'failed'),
        (() => {
            if (typeof o.runId !== 'string' || o.runId.length === 0) {
                return {
                    ok: false,
                    reason: `expected runId non-empty string, got ${String(o.runId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.taskCount !== 2) {
                return { ok: false, reason: `expected taskCount=2, got ${String(o.taskCount)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const completed = o.completed as number;
            const failed = o.failed as number;
            if (typeof completed !== 'number' || typeof failed !== 'number') {
                return { ok: false, reason: `completed and failed must be numbers` };
            }
            if (completed + failed !== 2) {
                return {
                    ok: false,
                    reason: `completed(${completed}) + failed(${failed}) must equal taskCount=2`,
                };
            }
            return { ok: true };
        })(),
    ];
}
