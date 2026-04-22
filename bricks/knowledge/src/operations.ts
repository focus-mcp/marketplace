// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    tags: string[];
    source?: string;
    createdAt: number;
    tokens: string[];
}

export interface KbIndexInput {
    readonly title: string;
    readonly content: string;
    readonly tags?: readonly string[];
    readonly source?: string;
}

export interface KbIndexOutput {
    id: string;
    title: string;
    tokenCount: number;
}

export interface KbSearchInput {
    readonly query: string;
    readonly tags?: readonly string[];
    readonly limit?: number;
}

export interface SearchResult {
    id: string;
    title: string;
    score: number;
    snippet: string;
}

export interface KbSearchOutput {
    results: SearchResult[];
    total: number;
}

export interface KbFetchInput {
    readonly id: string;
}

export type KbFetchOutput = KnowledgeEntry | { error: string };

export interface KbPurgeInput {
    readonly olderThanDays?: number;
    readonly tags?: readonly string[];
}

export interface KbPurgeOutput {
    purged: number;
    remaining: number;
}

export interface KbRankInput {
    readonly query: string;
    readonly boost?: string;
    readonly limit?: number;
}

export interface KbRankOutput {
    results: SearchResult[];
    total: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

export const entries: Map<string, KnowledgeEntry> = new Map();

export function resetKnowledge(): void {
    entries.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
    return text
        .split(/[^a-z0-9]+/i)
        .map((t) => t.toLowerCase())
        .filter((t) => t.length >= 2);
}

function scoreEntry(entryTokens: string[], queryTokens: string[]): number {
    if (queryTokens.length === 0) return 0;
    let matches = 0;
    for (const qt of queryTokens) {
        if (entryTokens.includes(qt)) matches++;
    }
    return matches / queryTokens.length;
}

function makeSnippet(content: string, maxLength = 120): string {
    if (content.length <= maxLength) return content;
    return `${content.slice(0, maxLength)}…`;
}

function hasAnyTag(entry: KnowledgeEntry, tags: readonly string[]): boolean {
    return tags.some((t) => entry.tags.includes(t));
}

// ─── kbIndex ─────────────────────────────────────────────────────────────────

export function kbIndex(input: KbIndexInput): KbIndexOutput {
    const id = randomUUID();
    const combinedText = `${input.title} ${input.content}`;
    const tokens = tokenize(combinedText);
    const entry: KnowledgeEntry = {
        id,
        title: input.title,
        content: input.content,
        tags: input.tags ? [...input.tags] : [],
        ...(input.source !== undefined && { source: input.source }),
        createdAt: Date.now(),
        tokens,
    };
    entries.set(id, entry);
    return { id, title: input.title, tokenCount: tokens.length };
}

// ─── kbSearch ────────────────────────────────────────────────────────────────

export function kbSearch(input: KbSearchInput): KbSearchOutput {
    const queryTokens = tokenize(input.query);
    const limit = input.limit ?? 10;

    let candidates = [...entries.values()];

    if (input.tags && input.tags.length > 0) {
        const filterTags = input.tags;
        candidates = candidates.filter((e) => hasAnyTag(e, filterTags));
    }

    const scored = candidates
        .map((e) => ({
            id: e.id,
            title: e.title,
            score: scoreEntry(e.tokens, queryTokens),
            snippet: makeSnippet(e.content),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return { results: scored, total: scored.length };
}

// ─── kbFetch ─────────────────────────────────────────────────────────────────

export function kbFetch(input: KbFetchInput): KbFetchOutput {
    const entry = entries.get(input.id);
    if (!entry) return { error: 'not found' };
    return entry;
}

// ─── kbPurge ─────────────────────────────────────────────────────────────────

export function kbPurge(input: KbPurgeInput): KbPurgeOutput {
    const now = Date.now();
    const msPerDay = 86_400_000;
    let purged = 0;

    for (const [id, entry] of entries) {
        let shouldPurge = false;

        if (input.olderThanDays !== undefined) {
            const ageDays = (now - entry.createdAt) / msPerDay;
            if (ageDays > input.olderThanDays) shouldPurge = true;
        }

        if (!shouldPurge && input.tags && input.tags.length > 0) {
            if (hasAnyTag(entry, input.tags)) shouldPurge = true;
        }

        if (shouldPurge) {
            entries.delete(id);
            purged++;
        }
    }

    return { purged, remaining: entries.size };
}

// ─── kbRank ──────────────────────────────────────────────────────────────────

export function kbRank(input: KbRankInput): KbRankOutput {
    const queryTokens = tokenize(input.query);
    const boost = input.boost ?? 'recency';
    const limit = input.limit ?? 10;
    const now = Date.now();
    const msPerDay = 86_400_000;

    const scored = [...entries.values()]
        .map((e) => {
            const baseScore = scoreEntry(e.tokens, queryTokens);
            let boostedScore = baseScore;

            if (boost === 'recency') {
                const ageDays = Math.max((now - e.createdAt) / msPerDay, 0.001);
                boostedScore = baseScore * (1 + 1 / ageDays);
            } else if (boost === 'tags') {
                const tagMatches = queryTokens.filter((qt) => e.tags.includes(qt)).length;
                boostedScore = baseScore * (1 + tagMatches);
            } else if (boost === 'length') {
                boostedScore = baseScore * Math.log(Math.max(e.content.length, Math.E));
            }

            return {
                id: e.id,
                title: e.title,
                score: boostedScore,
                snippet: makeSnippet(e.content),
            };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return { results: scored, total: scored.length };
}
