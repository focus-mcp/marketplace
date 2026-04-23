// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * token-count — Counts tokens using tiktoken (cl100k_base, same encoder as GPT-4).
 *
 * Falls back to a char-based heuristic (4 chars ≈ 1 token) if tiktoken is unavailable,
 * which is noted in benchmark reports when triggered.
 */

import { get_encoding } from 'tiktoken';

let encoder: ReturnType<typeof get_encoding> | null = null;
export let tokenizerMode: 'cl100k_base' | 'char-heuristic' = 'cl100k_base';

function getEncoder(): ReturnType<typeof get_encoding> | null {
    if (encoder !== null) return encoder;
    try {
        encoder = get_encoding('cl100k_base');
        tokenizerMode = 'cl100k_base';
        return encoder;
    } catch {
        tokenizerMode = 'char-heuristic';
        return null;
    }
}

/**
 * Count tokens in a string.
 * Uses cl100k_base BPE tokenizer when available, falls back to char/4 heuristic.
 */
export function countTokens(text: string): number {
    const enc = getEncoder();
    if (enc !== null) {
        return enc.encode(text).length;
    }
    // Fallback: ~4 chars per token (rough GPT-4 average)
    return Math.ceil(text.length / 4);
}

/**
 * Count tokens in a JSON-serializable object by stringifying it first.
 */
export function countJsonTokens(obj: unknown): number {
    return countTokens(JSON.stringify(obj));
}
