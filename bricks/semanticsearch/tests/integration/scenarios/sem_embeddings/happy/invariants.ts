/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function isEmbeddingEntry(
    val: unknown,
): val is { text: string; vector: Record<string, number>; dimensions: number } {
    if (typeof val !== 'object' || val === null) return false;
    const e = val as { text?: unknown; vector?: unknown; dimensions?: unknown };
    return (
        typeof e.text === 'string' &&
        typeof e.vector === 'object' &&
        e.vector !== null &&
        !Array.isArray(e.vector) &&
        typeof e.dimensions === 'number'
    );
}

function validateEntry(e: {
    text: string;
    vector: Record<string, number>;
    dimensions: number;
}): InvariantResult {
    if (e.dimensions < 1) {
        return { ok: false, reason: `embedding has dimensions=${e.dimensions}, expected >= 1` };
    }
    const vectorValues = Object.values(e.vector);
    if (vectorValues.length === 0) {
        return { ok: false, reason: `embedding for "${e.text.slice(0, 30)}..." has empty vector` };
    }
    for (const v of vectorValues) {
        if (typeof v !== 'number') {
            return { ok: false, reason: 'all vector values must be numbers' };
        }
    }
    return { ok: true };
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'embeddings'),
        (() => {
            const out = output as { embeddings: unknown };
            if (!Array.isArray(out.embeddings)) {
                return { ok: false, reason: 'output.embeddings must be an array' };
            }
            if (out.embeddings.length !== 3) {
                return {
                    ok: false,
                    reason: `expected 3 embedding entries, got ${out.embeddings.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { embeddings: unknown[] };
            if (!Array.isArray(out.embeddings)) return { ok: true };
            for (const e of out.embeddings) {
                if (!isEmbeddingEntry(e)) {
                    return {
                        ok: false,
                        reason: 'each embedding must have text (string), vector (object), dimensions (number)',
                    };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { embeddings: unknown[] };
            if (!Array.isArray(out.embeddings)) return { ok: true };
            for (const e of out.embeddings) {
                if (!isEmbeddingEntry(e)) return { ok: true };
                const result = validateEntry(e);
                if (!result.ok) return result;
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
