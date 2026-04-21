// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open } from 'node:fs/promises';
import { resolve } from 'node:path';

interface CacheEntry {
    content: string;
    mtime: number;
    accessCount: number;
    overridden?: boolean;
}

const store = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

export interface CacheGetInput {
    readonly path: string;
}

export interface CacheSetInput {
    readonly path: string;
    readonly content: string;
}

export interface CacheInvalidateInput {
    readonly path?: string;
}

export interface CacheWarmupInput {
    readonly paths: readonly string[];
}

export interface CacheGetOutput {
    hit: boolean;
    content: string;
}

export async function cacheGet(input: CacheGetInput): Promise<CacheGetOutput> {
    const abs = resolve(input.path);
    const entry = store.get(abs);
    if (entry?.overridden) {
        entry.accessCount++;
        hits++;
        return { hit: true, content: entry.content };
    }
    const fh = await open(abs, 'r');
    try {
        const fileStat = await fh.stat();
        const mtime = fileStat.mtimeMs;
        if (entry && entry.mtime === mtime) {
            entry.accessCount++;
            hits++;
            return { hit: true, content: entry.content };
        }
        const content = await fh.readFile('utf-8');
        store.set(abs, { content, mtime, accessCount: 1 });
        misses++;
        return { hit: false, content };
    } finally {
        await fh.close();
    }
}

export function cacheSet(input: CacheSetInput): { ok: boolean } {
    const abs = resolve(input.path);
    const existing = store.get(abs);
    store.set(abs, {
        content: input.content,
        mtime: Date.now(),
        accessCount: existing?.accessCount ?? 0,
        overridden: true,
    });
    return { ok: true };
}

export function cacheInvalidate(input: CacheInvalidateInput): { removed: number } {
    if (input.path === undefined) {
        const count = store.size;
        store.clear();
        return { removed: count };
    }
    const abs = resolve(input.path);
    const deleted = store.delete(abs);
    return { removed: deleted ? 1 : 0 };
}

export async function cacheWarmup(
    input: CacheWarmupInput,
): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;
    for (const p of input.paths) {
        try {
            const abs = resolve(p);
            const fh = await open(abs, 'r');
            try {
                const content = await fh.readFile('utf-8');
                const fileStat = await fh.stat();
                store.set(abs, { content, mtime: fileStat.mtimeMs, accessCount: 0 });
                loaded++;
            } finally {
                await fh.close();
            }
        } catch {
            failed++;
        }
    }
    return { loaded, failed };
}

export function cacheStats(): {
    entries: number;
    totalBytes: number;
    hits: number;
    misses: number;
    hitRate: number;
} {
    let totalBytes = 0;
    for (const entry of store.values()) {
        totalBytes += Buffer.byteLength(entry.content);
    }
    const total = hits + misses;
    return {
        entries: store.size,
        totalBytes,
        hits,
        misses,
        hitRate: total === 0 ? 0 : hits / total,
    };
}

/** Reset state — for tests only */
export function _resetCacheStore(): void {
    store.clear();
    hits = 0;
    misses = 0;
}
