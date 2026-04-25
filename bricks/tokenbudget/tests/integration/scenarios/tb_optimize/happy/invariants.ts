/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const VALID_MODES = new Set(['signatures', 'map', 'full']);

function checkPlanEntry(entry: unknown): InvariantResult {
    if (
        typeof entry !== 'object' ||
        entry === null ||
        !('path' in entry) ||
        !('recommendedMode' in entry) ||
        !('estimatedTokens' in entry)
    ) {
        return {
            ok: false,
            reason: 'each plan entry must have path, recommendedMode, and estimatedTokens',
        };
    }
    const e = entry as { recommendedMode: unknown; estimatedTokens: unknown };
    if (typeof e.recommendedMode !== 'string' || !VALID_MODES.has(e.recommendedMode)) {
        return { ok: false, reason: `invalid recommendedMode: ${String(e.recommendedMode)}` };
    }
    if (typeof e.estimatedTokens !== 'number' || e.estimatedTokens < 0) {
        return { ok: false, reason: 'plan[].estimatedTokens must be >= 0' };
    }
    return { ok: true };
}

function checkPlanEntries(plan: unknown[]): InvariantResult {
    for (const entry of plan) {
        const result = checkPlanEntry(entry);
        if (!result.ok) return result;
    }
    return { ok: true };
}

function checkOptimizeOutput(output: unknown): InvariantResult {
    const out = output as { plan: unknown; totalEstimate: unknown; fits: unknown };
    if (!Array.isArray(out.plan)) {
        return { ok: false, reason: 'output.plan must be an array' };
    }
    if (typeof out.totalEstimate !== 'number' || out.totalEstimate < 0) {
        return { ok: false, reason: 'output.totalEstimate must be a non-negative number' };
    }
    if (typeof out.fits !== 'boolean') {
        return { ok: false, reason: 'output.fits must be a boolean' };
    }
    return checkPlanEntries(out.plan as unknown[]);
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'plan'),
        inv.outputHasField(output, 'totalEstimate'),
        inv.outputHasField(output, 'fits'),
        checkOptimizeOutput(output),
        inv.outputSizeUnder(32768)(output),
    ];
}
