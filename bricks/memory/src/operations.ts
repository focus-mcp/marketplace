// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { mkdir, open, readdir, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemoryEntry {
    key: string;
    value: string;
    tags: string[];
    storedAt: string;
}

export interface MemStoreInput {
    readonly key: string;
    readonly value: string;
    readonly tags?: readonly string[];
}

export interface MemRecallInput {
    readonly key: string;
}

export interface MemSearchInput {
    readonly query: string;
    readonly limit?: number;
}

export interface MemForgetInput {
    readonly key: string;
}

export interface MemListInput {
    readonly tag?: string;
}

// ─── State (overridable for tests) ───────────────────────────────────────────

let _memoryDir: string | undefined;

export function _setMemoryDir(dir: string | undefined): void {
    _memoryDir = dir;
}

function getMemoryDir(): string {
    return _memoryDir ?? resolve(join(homedir(), '.focus', 'memory'));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function keyToFilename(key: string): string {
    return `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
}

async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

async function writeEntry(dir: string, entry: MemoryEntry): Promise<void> {
    const filePath = join(dir, keyToFilename(entry.key));
    const fh = await open(filePath, 'w');
    try {
        await fh.writeFile(JSON.stringify(entry, null, 2), 'utf-8');
    } finally {
        await fh.close();
    }
}

async function readEntry(dir: string, key: string): Promise<MemoryEntry | null> {
    const filePath = join(dir, keyToFilename(key));
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        const raw = await fh.readFile('utf-8');
        return JSON.parse(raw) as MemoryEntry;
    } finally {
        await fh.close();
    }
}

async function listEntries(dir: string): Promise<MemoryEntry[]> {
    await ensureDir(dir);
    const files = await readdir(dir);
    const entries: MemoryEntry[] = [];
    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fh = await open(join(dir, file), 'r').catch(() => null);
        if (!fh) continue;
        try {
            const raw = await fh.readFile('utf-8');
            entries.push(JSON.parse(raw) as MemoryEntry);
        } finally {
            await fh.close();
        }
    }
    return entries;
}

// ─── memStore ────────────────────────────────────────────────────────────────

export async function memStore(input: MemStoreInput): Promise<{ ok: boolean }> {
    const dir = getMemoryDir();
    await ensureDir(dir);
    const entry: MemoryEntry = {
        key: input.key,
        value: input.value,
        tags: input.tags ? [...input.tags] : [],
        storedAt: new Date().toISOString(),
    };
    await writeEntry(dir, entry);
    return { ok: true };
}

// ─── memRecall ───────────────────────────────────────────────────────────────

export async function memRecall(
    input: MemRecallInput,
): Promise<{ value: string | null; tags: string[]; storedAt: string }> {
    const dir = getMemoryDir();
    const entry = await readEntry(dir, input.key);
    if (!entry) return { value: null, tags: [], storedAt: '' };
    return { value: entry.value, tags: entry.tags, storedAt: entry.storedAt };
}

// ─── memSearch ───────────────────────────────────────────────────────────────

interface SearchResult {
    key: string;
    value: string;
    tags: string[];
    storedAt: string;
    score: number;
}

export async function memSearch(input: MemSearchInput): Promise<{ results: SearchResult[] }> {
    const dir = getMemoryDir();
    const entries = await listEntries(dir);
    const q = input.query.toLowerCase();
    const limit = input.limit ?? 10;

    const results: SearchResult[] = [];
    for (const entry of entries) {
        let score = 0;
        if (entry.key.toLowerCase().includes(q)) score += 2;
        if (entry.value.toLowerCase().includes(q)) score += 1;
        if (entry.tags.some((t) => t.toLowerCase().includes(q))) score += 1;
        if (score > 0) {
            results.push({
                key: entry.key,
                value: entry.value,
                tags: entry.tags,
                storedAt: entry.storedAt,
                score,
            });
        }
    }

    results.sort((a, b) => b.score - a.score);
    return { results: results.slice(0, limit) };
}

// ─── memForget ───────────────────────────────────────────────────────────────

export async function memForget(input: MemForgetInput): Promise<{ deleted: boolean }> {
    const dir = getMemoryDir();
    const filePath = join(dir, keyToFilename(input.key));
    try {
        await unlink(filePath);
        return { deleted: true };
    } catch {
        return { deleted: false };
    }
}

// ─── memList ─────────────────────────────────────────────────────────────────

export async function memList(
    input: MemListInput,
): Promise<{ keys: Array<{ key: string; tags: string[]; storedAt: string }> }> {
    const dir = getMemoryDir();
    const entries = await listEntries(dir);
    const filtered = input.tag
        ? entries.filter((e) => e.tags.includes(input.tag as string))
        : entries;
    return {
        keys: filtered.map((e) => ({ key: e.key, tags: e.tags, storedAt: e.storedAt })),
    };
}
