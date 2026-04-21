// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EstimateInput {
    readonly text?: string;
    readonly path?: string;
}

export interface EstimateOutput {
    tokens: number;
    chars: number;
    lines: number;
}

export interface AnalyzeInput {
    readonly dir: string;
    readonly maxFiles?: number;
}

export interface FileTokenEntry {
    path: string;
    tokens: number;
    lines: number;
}

export interface AnalyzeOutput {
    totalTokens: number;
    files: FileTokenEntry[];
    top10: Array<{ path: string; tokens: number }>;
}

export type FillMode = 'signatures' | 'map' | 'full';

export interface FillInput {
    readonly budget: number;
    readonly files: readonly string[];
    readonly mode?: FillMode;
}

export interface SelectedFile {
    path: string;
    tokens: number;
    mode: FillMode;
}

export interface FillOutput {
    selected: SelectedFile[];
    used: number;
    remaining: number;
}

export interface OptimizeInput {
    readonly budget: number;
    readonly dir: string;
}

export interface PlanEntry {
    path: string;
    recommendedMode: FillMode;
    estimatedTokens: number;
}

export interface OptimizeOutput {
    plan: PlanEntry[];
    totalEstimate: number;
    fits: boolean;
}

// ─── Token estimation ─────────────────────────────────────────────────────────

const CODE_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mts',
    '.mjs',
    '.cjs',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.c',
    '.cpp',
    '.h',
]);

function isCodeFile(path: string): boolean {
    return CODE_EXTENSIONS.has(extname(path).toLowerCase());
}

function estimateTokensFromText(text: string, filePath?: string): number {
    const chars = text.length;
    const lines = text.split('\n').length;
    // Code is denser (more tokens per char due to identifiers and symbols)
    const isCode = filePath ? isCodeFile(filePath) : /[{}();]/.test(text);
    const baseRatio = isCode ? 3.5 : 4.0;
    // Add overhead for line breaks and structure
    return Math.ceil(chars / baseRatio + lines * 0.1);
}

// ─── tbEstimate ──────────────────────────────────────────────────────────────

export async function tbEstimate(input: EstimateInput): Promise<EstimateOutput> {
    if (input.text === undefined && input.path === undefined) {
        throw new Error('Either text or path must be provided');
    }
    let text: string;
    let filePath: string | undefined;
    if (input.path !== undefined) {
        text = await readFile(input.path, 'utf-8');
        filePath = input.path;
    } else {
        text = input.text ?? '';
    }
    return {
        tokens: estimateTokensFromText(text, filePath),
        chars: text.length,
        lines: text.split('\n').length,
    };
}

// ─── tbAnalyze ───────────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.nuxt']);

async function collectFiles(dir: string, results: string[], maxFiles: number): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries: Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        if (results.length >= maxFiles) break;
        const entryName = entry.name.toString();
        if (entryName.startsWith('.') || IGNORED_DIRS.has(entryName)) continue;
        const fullPath = join(dir, entryName);
        if (entry.isDirectory()) {
            await collectFiles(fullPath, results, maxFiles);
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
}

export async function tbAnalyze(input: AnalyzeInput): Promise<AnalyzeOutput> {
    const maxFiles = input.maxFiles ?? 50;
    const allFiles: string[] = [];
    await collectFiles(input.dir, allFiles, maxFiles);
    const fileEntries: FileTokenEntry[] = [];
    for (const f of allFiles) {
        try {
            const text = await readFile(f, 'utf-8');
            const tokens = estimateTokensFromText(text, f);
            fileEntries.push({
                path: relative(input.dir, f),
                tokens,
                lines: text.split('\n').length,
            });
        } catch {
            // skip unreadable
        }
    }
    fileEntries.sort((a, b) => b.tokens - a.tokens);
    const totalTokens = fileEntries.reduce((sum, e) => sum + e.tokens, 0);
    const top10 = fileEntries.slice(0, 10).map(({ path, tokens }) => ({ path, tokens }));
    return { totalTokens, files: fileEntries, top10 };
}

// ─── tbFill ──────────────────────────────────────────────────────────────────

// Mode factor: signatures ~0.15x, map ~0.25x, full ~1x
const MODE_FACTORS: Record<FillMode, number> = {
    signatures: 0.15,
    map: 0.25,
    full: 1.0,
};

async function estimateFileTokens(path: string, mode: FillMode): Promise<number> {
    try {
        const text = await readFile(path, 'utf-8');
        const full = estimateTokensFromText(text, path);
        return Math.ceil(full * MODE_FACTORS[mode]);
    } catch {
        return 0;
    }
}

export async function tbFill(input: FillInput): Promise<FillOutput> {
    const mode = input.mode ?? 'signatures';
    const selected: SelectedFile[] = [];
    let used = 0;
    for (const filePath of input.files) {
        const tokens = await estimateFileTokens(filePath, mode);
        if (used + tokens <= input.budget) {
            selected.push({ path: filePath, tokens, mode });
            used += tokens;
        }
    }
    return { selected, used, remaining: input.budget - used };
}

// ─── tbOptimize ──────────────────────────────────────────────────────────────

function chooseModeForTokens(tokens: number, budget: number, fileCount: number): FillMode {
    const avgBudget = fileCount > 0 ? budget / fileCount : budget;
    if (tokens <= avgBudget) return 'full';
    if (tokens * MODE_FACTORS['map'] <= avgBudget) return 'map';
    return 'signatures';
}

export async function tbOptimize(input: OptimizeInput): Promise<OptimizeOutput> {
    const allFiles: string[] = [];
    await collectFiles(input.dir, allFiles, 50);
    const plan: PlanEntry[] = [];
    for (const f of allFiles) {
        try {
            const text = await readFile(f, 'utf-8');
            const fullTokens = estimateTokensFromText(text, f);
            const mode = chooseModeForTokens(fullTokens, input.budget, allFiles.length);
            const estimatedTokens = Math.ceil(fullTokens * MODE_FACTORS[mode]);
            plan.push({ path: relative(input.dir, f), recommendedMode: mode, estimatedTokens });
        } catch {
            // skip
        }
    }
    const totalEstimate = plan.reduce((sum, e) => sum + e.estimatedTokens, 0);
    return { plan, totalEstimate, fits: totalEstimate <= input.budget };
}
