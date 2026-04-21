// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoadInput {
    readonly task: string;
    readonly dir: string;
    readonly budget?: number;
}

export interface LoadOutput {
    context: string;
    tokensUsed: number;
    budget: number;
    filesIncluded: number;
    mode: string;
}

export interface RefreshInput {
    readonly dir: string;
    readonly budget?: number;
}

export interface RefreshOutput {
    changed: number;
    refreshed: number;
    tokensUsed: number;
}

export interface StatusOutput {
    filesLoaded: number;
    tokensUsed: number;
    cacheHits: number;
    cacheMisses: number;
}

// ─── Internal state ───────────────────────────────────────────────────────────

interface SessionState {
    filesLoaded: number;
    tokensUsed: number;
    cacheHits: number;
    cacheMisses: number;
}

const state: SessionState = {
    filesLoaded: 0,
    tokensUsed: 0,
    cacheHits: 0,
    cacheMisses: 0,
};

export function _resetState(): void {
    state.filesLoaded = 0;
    state.tokensUsed = 0;
    state.cacheHits = 0;
    state.cacheMisses = 0;
}

// ─── Bus type ─────────────────────────────────────────────────────────────────

export interface SmartContextBus {
    request(target: string, data: unknown): Promise<unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ProjectInfo {
    name?: string;
    framework?: string;
    language?: string;
}

interface FileTokenEntry {
    path: string;
    tokens: number;
    lines?: number;
}

interface AnalyzeOutput {
    totalTokens: number;
    files: FileTokenEntry[];
    top10: FileTokenEntry[];
}

interface SelectedFile {
    path: string;
    tokens: number;
    mode: string;
}

interface FillOutput {
    selected: SelectedFile[];
    used: number;
    remaining: number;
}

interface CacheStats {
    entries: number;
    hits: number;
    misses: number;
    hitRate: number;
    totalBytes: number;
}

function isProjectInfo(val: unknown): val is ProjectInfo {
    return val !== null && typeof val === 'object';
}

function isAnalyzeOutput(val: unknown): val is AnalyzeOutput {
    return val !== null && typeof val === 'object' && 'files' in (val as object);
}

function isFillOutput(val: unknown): val is FillOutput {
    return (
        val !== null &&
        typeof val === 'object' &&
        'selected' in (val as object) &&
        'used' in (val as object)
    );
}

function isCacheStats(val: unknown): val is CacheStats {
    return val !== null && typeof val === 'object' && 'entries' in (val as object);
}

function buildContextHeader(projectInfo: ProjectInfo, task: string): string {
    const parts: string[] = [`# Context for: ${task}`];
    if (projectInfo.name) parts.push(`Project: ${projectInfo.name}`);
    if (projectInfo.framework && projectInfo.framework !== 'none') {
        parts.push(`Framework: ${projectInfo.framework}`);
    }
    if (projectInfo.language) parts.push(`Language: ${projectInfo.language}`);
    return parts.join('\n');
}

// ─── sctxLoad ─────────────────────────────────────────────────────────────────

export async function sctxLoad(input: LoadInput, bus: SmartContextBus): Promise<LoadOutput> {
    const budget = input.budget ?? 2000;

    // Get project info
    const rawProject = await bus.request('overview:project', { dir: input.dir });
    const projectInfo = isProjectInfo(rawProject) ? rawProject : {};

    // Analyze file token costs
    const rawAnalyze = await bus.request('tokenbudget:analyze', {
        dir: input.dir,
        maxFiles: 50,
    });

    if (!isAnalyzeOutput(rawAnalyze)) {
        return { context: '', tokensUsed: 0, budget, filesIncluded: 0, mode: 'empty' };
    }

    // Get all file paths
    const filePaths = rawAnalyze.files.map((f) => f.path);

    // Warm up cache for top files
    const topPaths = rawAnalyze.top10.map((f) => f.path);
    await bus.request('cache:warmup', { paths: topPaths });

    // Fill budget
    const rawFill = await bus.request('tokenbudget:fill', {
        budget,
        files: filePaths,
        mode: 'signatures',
    });

    if (!isFillOutput(rawFill)) {
        return { context: '', tokensUsed: 0, budget, filesIncluded: 0, mode: 'empty' };
    }

    const header = buildContextHeader(projectInfo, input.task);
    const sections: string[] = [header, ''];

    for (const selected of rawFill.selected) {
        sections.push(`## ${selected.path}`);
        sections.push(`<!-- ${selected.tokens} tokens, mode: ${selected.mode} -->`);
    }

    const context = sections.join('\n');
    state.filesLoaded = rawFill.selected.length;
    state.tokensUsed = rawFill.used;

    return {
        context,
        tokensUsed: rawFill.used,
        budget,
        filesIncluded: rawFill.selected.length,
        mode: 'signatures',
    };
}

// ─── sctxRefresh ─────────────────────────────────────────────────────────────

export async function sctxRefresh(
    input: RefreshInput,
    bus: SmartContextBus,
): Promise<RefreshOutput> {
    const budget = input.budget ?? 2000;

    const rawAnalyze = await bus.request('tokenbudget:analyze', {
        dir: input.dir,
        maxFiles: 50,
    });

    if (!isAnalyzeOutput(rawAnalyze)) {
        return { changed: 0, refreshed: 0, tokensUsed: 0 };
    }

    const filePaths = rawAnalyze.files.map((f) => f.path);

    // Re-warm cache
    await bus.request('cache:warmup', { paths: filePaths });

    const rawFill = await bus.request('tokenbudget:fill', {
        budget,
        files: filePaths,
        mode: 'signatures',
    });

    if (!isFillOutput(rawFill)) {
        return { changed: 0, refreshed: 0, tokensUsed: 0 };
    }

    const refreshed = rawFill.selected.length;
    state.filesLoaded = refreshed;
    state.tokensUsed = rawFill.used;

    return {
        changed: refreshed,
        refreshed,
        tokensUsed: rawFill.used,
    };
}

// ─── sctxStatus ──────────────────────────────────────────────────────────────

export async function sctxStatus(bus: SmartContextBus): Promise<StatusOutput> {
    const rawStats = await bus.request('cache:stats', {});
    if (isCacheStats(rawStats)) {
        state.cacheHits = rawStats.hits;
        state.cacheMisses = rawStats.misses;
    }
    return {
        filesLoaded: state.filesLoaded,
        tokensUsed: state.tokensUsed,
        cacheHits: state.cacheHits,
        cacheMisses: state.cacheMisses,
    };
}
