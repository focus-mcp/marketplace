// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ─── In-memory index (module-level state) ────────────────────────────────────

/** term → (filePath → termCount) */
const invertedIndex = new Map<string, Map<string, number>>();
/** filePath → total term count in document */
const documentLengths = new Map<string, number>();
/** set of all indexed file paths */
const indexedFiles = new Set<string>();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FtsIndexInput {
    readonly dir: string;
    readonly glob?: string;
    readonly maxFiles?: number;
}

export interface FtsIndexOutput {
    filesIndexed: number;
    termsIndexed: number;
    duration: number;
}

export interface FtsSearchInput {
    readonly query: string;
    readonly limit?: number;
}

export interface FtsSearchResult {
    file: string;
    score: number;
    matches: string[];
}

export interface FtsSearchOutput {
    results: FtsSearchResult[];
    total: number;
}

export interface FtsRankInput {
    readonly query: string;
    readonly files: readonly string[];
}

export interface FtsRankResult {
    file: string;
    score: number;
}

export interface FtsRankOutput {
    ranked: FtsRankResult[];
}

export interface FtsSuggestInput {
    readonly prefix: string;
    readonly limit?: number;
}

export interface FtsSuggestResult {
    term: string;
    documentCount: number;
}

export interface FtsSuggestOutput {
    suggestions: FtsSuggestResult[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.js', '.md', '.json']);

/** Tokenize text into lowercase alphanumeric tokens of length >= 2. */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 2);
}

/** Parse glob string like "*.ts,*.js,*.md" into a set of extensions. */
function parseGlobExts(glob: string): Set<string> {
    const exts = new Set<string>();
    for (const part of glob.split(',')) {
        const trimmed = part.trim();
        const dotIdx = trimmed.lastIndexOf('.');
        if (dotIdx >= 0) exts.add(trimmed.slice(dotIdx));
    }
    return exts;
}

async function collectFiles(
    dir: string,
    allowedExts: Set<string>,
    results: string[],
    maxFiles: number,
): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries: import('node:fs').Dirent[];
    try {
        entries = (await readdir(dir, { withFileTypes: true })) as import('node:fs').Dirent[];
    } catch {
        return;
    }
    for (const entry of entries) {
        if (results.length >= maxFiles) break;
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, allowedExts, results, maxFiles);
        } else if (allowedExts.has(extname(name))) {
            results.push(full);
        }
    }
}

function indexDocument(filePath: string, tokens: string[]): void {
    indexedFiles.add(filePath);
    documentLengths.set(filePath, tokens.length);

    // Count term frequencies
    const counts = new Map<string, number>();
    for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
    }

    // Update inverted index
    for (const [term, count] of counts) {
        let postings = invertedIndex.get(term);
        if (!postings) {
            postings = new Map<string, number>();
            invertedIndex.set(term, postings);
        }
        postings.set(filePath, count);
    }
}

function computeTfIdf(queryTerms: string[], filePath: string): number {
    const docLength = documentLengths.get(filePath) ?? 0;
    if (docLength === 0) return 0;
    const totalDocs = indexedFiles.size;
    let score = 0;
    for (const term of queryTerms) {
        const postings = invertedIndex.get(term);
        if (!postings) continue;
        const termCount = postings.get(filePath) ?? 0;
        if (termCount === 0) continue;
        const tf = termCount / docLength;
        const docsWithTerm = postings.size;
        // Smoothed IDF: log((totalDocs + 1) / (docsWithTerm + 1)) + 1
        // Ensures score > 0 even when all documents contain the term (single-doc index)
        const idf = Math.log((totalDocs + 1) / (docsWithTerm + 1)) + 1;
        score += tf * idf;
    }
    return score;
}

// ─── ftsIndex ────────────────────────────────────────────────────────────────

export async function ftsIndex(input: FtsIndexInput): Promise<FtsIndexOutput> {
    const start = Date.now();
    const dir = resolve(input.dir);
    const maxFiles = input.maxFiles ?? 500;
    const allowedExts =
        input.glob !== undefined && input.glob.length > 0
            ? parseGlobExts(input.glob)
            : SUPPORTED_EXTS;

    // Clear previous index
    invertedIndex.clear();
    documentLengths.clear();
    indexedFiles.clear();

    const files: string[] = [];
    await collectFiles(dir, allowedExts, files, maxFiles);

    for (const fp of files) {
        let content: string;
        try {
            content = await readFile(fp, 'utf-8');
        } catch {
            continue;
        }
        const tokens = tokenize(content);
        if (tokens.length === 0) continue;
        indexDocument(fp, tokens);
    }

    return {
        filesIndexed: indexedFiles.size,
        termsIndexed: invertedIndex.size,
        duration: Date.now() - start,
    };
}

// ─── ftsSearch ───────────────────────────────────────────────────────────────

export function ftsSearch(input: FtsSearchInput): FtsSearchOutput {
    const limit = input.limit ?? 10;
    const queryTerms = tokenize(input.query);

    if (queryTerms.length === 0 || indexedFiles.size === 0) {
        return { results: [], total: 0 };
    }

    // Collect candidate documents (any doc containing at least one query term)
    const candidates = new Set<string>();
    for (const term of queryTerms) {
        const postings = invertedIndex.get(term);
        if (!postings) continue;
        for (const fp of postings.keys()) candidates.add(fp);
    }

    const scored: FtsSearchResult[] = [];
    for (const fp of candidates) {
        const score = computeTfIdf(queryTerms, fp);
        if (score <= 0) continue;
        const matches = queryTerms.filter((t) => invertedIndex.get(t)?.has(fp) ?? false);
        scored.push({ file: fp, score, matches });
    }

    scored.sort((a, b) => b.score - a.score);

    return {
        results: scored.slice(0, limit),
        total: scored.length,
    };
}

// ─── ftsRank ─────────────────────────────────────────────────────────────────

export function ftsRank(input: FtsRankInput): FtsRankOutput {
    const queryTerms = tokenize(input.query);

    if (queryTerms.length === 0) {
        return { ranked: input.files.map((f) => ({ file: f, score: 0 })) };
    }

    const ranked: FtsRankResult[] = input.files.map((fp) => ({
        file: fp,
        score: computeTfIdf(queryTerms, fp),
    }));

    ranked.sort((a, b) => b.score - a.score);
    return { ranked };
}

// ─── ftsSuggest ──────────────────────────────────────────────────────────────

export function ftsSuggest(input: FtsSuggestInput): FtsSuggestOutput {
    const limit = input.limit ?? 5;
    const lowerPrefix = input.prefix.toLowerCase();

    if (lowerPrefix.length === 0 || indexedFiles.size === 0) {
        return { suggestions: [] };
    }

    const suggestions: FtsSuggestResult[] = [];
    for (const [term, postings] of invertedIndex) {
        if (term.startsWith(lowerPrefix)) {
            suggestions.push({ term, documentCount: postings.size });
        }
    }

    // Sort by document frequency descending, then alphabetically
    suggestions.sort((a, b) => b.documentCount - a.documentCount || a.term.localeCompare(b.term));

    return { suggestions: suggestions.slice(0, limit) };
}
