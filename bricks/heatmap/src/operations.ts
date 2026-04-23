// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccessType = 'read' | 'write';

export interface FileAccess {
    readonly file: string;
    readonly type: AccessType;
    readonly timestamp: number;
}

export interface FileCounts {
    reads: number;
    writes: number;
    lastAccess: number;
}

export interface HmTrackInput {
    readonly file: string;
    readonly type: AccessType;
}

export interface HmTrackOutput {
    readonly file: string;
    readonly totalAccesses: number;
}

export interface HmHotfilesInput {
    readonly limit?: number;
    readonly type?: AccessType;
}

export interface HotFileEntry {
    readonly file: string;
    readonly count: number;
    readonly lastAccess: number;
}

export interface HmHotfilesOutput {
    readonly files: HotFileEntry[];
}

export interface HmPatternsInput {
    readonly [key: string]: never;
}

export interface CoAccessedEntry {
    readonly files: readonly string[];
    readonly count: number;
}

export interface HmPatternsOutput {
    readonly coAccessed: CoAccessedEntry[];
}

export interface HmColdfilesInput {
    readonly threshold?: number;
}

export interface HmColdfilesOutput {
    readonly files: readonly string[];
    readonly count: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const DEFAULT_COLD_THRESHOLD_MS = 3_600_000; // 1 hour
const CO_ACCESS_WINDOW_MS = 1_000; // 1 second

let accesses: FileAccess[] = [];
const fileCounts = new Map<string, FileCounts>();

// ─── resetHeatmap (testing only) ─────────────────────────────────────────────

export function resetHeatmap(): void {
    accesses = [];
    fileCounts.clear();
}

// ─── hmTrack ─────────────────────────────────────────────────────────────────

export function hmTrack(input: HmTrackInput): HmTrackOutput {
    const { file, type } = input;
    const timestamp = Date.now();

    accesses.push({ file, type, timestamp });

    const existing = fileCounts.get(file);
    if (existing) {
        if (type === 'read') {
            existing.reads += 1;
        } else {
            existing.writes += 1;
        }
        existing.lastAccess = timestamp;
    } else {
        fileCounts.set(file, {
            reads: type === 'read' ? 1 : 0,
            writes: type === 'write' ? 1 : 0,
            lastAccess: timestamp,
        });
    }

    const counts = fileCounts.get(file);
    const totalAccesses = counts ? counts.reads + counts.writes : 0;

    return { file, totalAccesses };
}

// ─── hmHotfiles ──────────────────────────────────────────────────────────────

export function hmHotfiles(input: HmHotfilesInput): HmHotfilesOutput {
    const limit = input.limit ?? 10;
    const filterType = input.type;

    const entries: HotFileEntry[] = [];

    for (const [file, counts] of fileCounts) {
        const count =
            filterType === 'read'
                ? counts.reads
                : filterType === 'write'
                  ? counts.writes
                  : counts.reads + counts.writes;

        if (count > 0) {
            entries.push({ file, count, lastAccess: counts.lastAccess });
        }
    }

    entries.sort((a, b) => b.count - a.count);

    return { files: entries.slice(0, limit) };
}

// ─── hmPatterns helpers ───────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
    return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function collectWindowPairs(
    anchor: FileAccess,
    pairCounts: Map<string, number>,
    startIdx: number,
): void {
    for (let j = startIdx; j < accesses.length; j++) {
        const next = accesses[j];
        if (!next) continue;
        if (next.timestamp - anchor.timestamp > CO_ACCESS_WINDOW_MS) break;
        if (next.file === anchor.file) continue;
        const key = pairKey(anchor.file, next.file);
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
}

function buildCoAccessed(pairCounts: Map<string, number>): CoAccessedEntry[] {
    const coAccessed: CoAccessedEntry[] = [];
    for (const [key, count] of pairCounts) {
        const files = key.split('\0');
        coAccessed.push({ files, count });
    }
    coAccessed.sort((a, b) => b.count - a.count);
    return coAccessed;
}

// ─── hmPatterns ──────────────────────────────────────────────────────────────

export function hmPatterns(_input: Record<string, never>): HmPatternsOutput {
    const pairCounts = new Map<string, number>();

    for (let i = 0; i < accesses.length; i++) {
        const current = accesses[i];
        if (!current) continue;
        collectWindowPairs(current, pairCounts, i + 1);
    }

    return { coAccessed: buildCoAccessed(pairCounts) };
}

// ─── hmColdfiles ─────────────────────────────────────────────────────────────

export function hmColdfiles(input: HmColdfilesInput): HmColdfilesOutput {
    const threshold = input.threshold ?? DEFAULT_COLD_THRESHOLD_MS;
    const now = Date.now();
    const cutoff = now - threshold;

    const coldFiles: string[] = [];

    for (const [file, counts] of fileCounts) {
        if (counts.lastAccess < cutoff) {
            coldFiles.push(file);
        }
    }

    coldFiles.sort();

    return { files: coldFiles, count: coldFiles.length };
}
