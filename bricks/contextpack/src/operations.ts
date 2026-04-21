// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PackMode = 'signatures' | 'map' | 'full';

export interface CpPackInput {
    readonly files: readonly string[];
    readonly mode?: PackMode;
}

export interface CpPackOutput {
    packed: string;
    fileCount: number;
    totalTokens: number;
}

export interface CpBudgetInput {
    readonly files: readonly string[];
    readonly budget: number;
}

export interface CpBudgetOutput {
    packed: string;
    included: string[];
    excluded: string[];
    tokensUsed: number;
}

export interface CpEstimateInput {
    readonly files: readonly string[];
    readonly mode?: PackMode;
}

export interface FileTokenEstimate {
    path: string;
    tokens: number;
}

export interface CpEstimateOutput {
    estimatedTokens: number;
    perFile: FileTokenEstimate[];
}

export interface CpPrioritizeInput {
    readonly files: readonly string[];
    readonly query: string;
}

export interface RankedFile {
    path: string;
    score: number;
    reason: string;
}

export interface CpPrioritizeOutput {
    ranked: RankedFile[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

async function readFileContent(filePath: string): Promise<string | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

const rExportLine = /^export\s+/;
const rKeyLine = /^(?:export|import|class|interface|type|function|const|let|var)\s+/;

function extractSignatures(content: string): string {
    return content
        .split('\n')
        .filter((line) => rExportLine.test(line))
        .join('\n');
}

function extractMap(content: string): string {
    return content
        .split('\n')
        .filter((line) => rKeyLine.test(line))
        .join('\n');
}

function extractContent(content: string, mode: PackMode): string {
    if (mode === 'full') return content;
    if (mode === 'map') return extractMap(content);
    return extractSignatures(content);
}

function formatFilePack(filePath: string, extracted: string): string {
    return `// === ${filePath} ===\n${extracted}\n`;
}

// ─── cpPack ──────────────────────────────────────────────────────────────────

export async function cpPack(input: CpPackInput): Promise<CpPackOutput> {
    const mode: PackMode = input.mode ?? 'signatures';
    const parts: string[] = [];
    let totalTokens = 0;

    for (const rawPath of input.files) {
        const abs = resolve(rawPath);
        const content = await readFileContent(abs);
        if (content === null) continue;
        const extracted = extractContent(content, mode);
        const section = formatFilePack(rawPath, extracted);
        parts.push(section);
        totalTokens += estimateTokens(section);
    }

    return { packed: parts.join('\n'), fileCount: parts.length, totalTokens };
}

// ─── cpBudget ────────────────────────────────────────────────────────────────

export async function cpBudget(input: CpBudgetInput): Promise<CpBudgetOutput> {
    const parts: string[] = [];
    const included: string[] = [];
    const excluded: string[] = [];
    let tokensUsed = 0;

    for (const rawPath of input.files) {
        const abs = resolve(rawPath);
        const content = await readFileContent(abs);
        if (content === null) {
            excluded.push(rawPath);
            continue;
        }
        const extracted = extractSignatures(content);
        const section = formatFilePack(rawPath, extracted);
        const tokens = estimateTokens(section);

        if (tokensUsed + tokens <= input.budget) {
            parts.push(section);
            included.push(rawPath);
            tokensUsed += tokens;
        } else {
            excluded.push(rawPath);
        }
    }

    return { packed: parts.join('\n'), included, excluded, tokensUsed };
}

// ─── cpEstimate ──────────────────────────────────────────────────────────────

export async function cpEstimate(input: CpEstimateInput): Promise<CpEstimateOutput> {
    const mode: PackMode = input.mode ?? 'signatures';
    const perFile: FileTokenEstimate[] = [];
    let estimatedTokens = 0;

    for (const rawPath of input.files) {
        const abs = resolve(rawPath);
        const content = await readFileContent(abs);
        if (content === null) {
            perFile.push({ path: rawPath, tokens: 0 });
            continue;
        }
        const extracted = extractContent(content, mode);
        const section = formatFilePack(rawPath, extracted);
        const tokens = estimateTokens(section);
        perFile.push({ path: rawPath, tokens });
        estimatedTokens += tokens;
    }

    return { estimatedTokens, perFile };
}

// ─── cpPrioritize ────────────────────────────────────────────────────────────
// ─── cpPrioritize ────────────────────────────────────────────────────────────

function scoreFilename(name: string, terms: string[]): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    for (const term of terms) {
        if (name.includes(term)) {
            score += 3;
            reasons.push(`filename matches "${term}"`);
        }
    }
    return { score, reasons };
}

function scoreContent(
    content: string | null,
    terms: string[],
    existingReasons: string[],
): { score: number; reasons: string[] } {
    if (content === null) return { score: 0, reasons: [] };
    const firstLines = content.split('\n').slice(0, 10).join('\n').toLowerCase();
    const reasons: string[] = [];
    let score = 0;
    for (const term of terms) {
        if (firstLines.includes(term) && !existingReasons.some((r) => r.includes(term))) {
            score += 1;
            reasons.push(`content mentions "${term}"`);
        }
    }
    return { score, reasons };
}

export async function cpPrioritize(input: CpPrioritizeInput): Promise<CpPrioritizeOutput> {
    const query = input.query.toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const ranked: RankedFile[] = [];

    for (const rawPath of input.files) {
        const abs = resolve(rawPath);
        const name = basename(abs).toLowerCase();
        const nameResult = scoreFilename(name, terms);
        const content = await readFileContent(abs);
        const contentResult = scoreContent(content, terms, nameResult.reasons);
        const score = nameResult.score + contentResult.score;
        const reasons = [...nameResult.reasons, ...contentResult.reasons];
        ranked.push({
            path: rawPath,
            score,
            reason: reasons.length > 0 ? reasons.join(', ') : 'no match',
        });
    }

    ranked.sort((a, b) => b.score - a.score);
    return { ranked };
}
