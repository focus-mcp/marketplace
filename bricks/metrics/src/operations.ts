// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolCall {
    tool: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    timestamp: number;
}

interface MetricsStore {
    startedAt: number;
    toolCalls: ToolCall[];
}

// ─── State ───────────────────────────────────────────────────────────────────

let store: MetricsStore = {
    startedAt: Date.now(),
    toolCalls: [],
};

export function resetMetrics(): void {
    store = { startedAt: Date.now(), toolCalls: [] };
}

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface MetSessionInput {
    readonly reset?: boolean;
}

export interface MetSessionOutput {
    startedAt: number;
    toolCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalDuration: number;
}

export interface MetTokensInput {
    readonly tool: string;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly duration?: number;
}

export interface MetTokensOutput {
    recorded: boolean;
    total: {
        inputTokens: number;
        outputTokens: number;
        tokens: number;
    };
}

export interface MetCostsInput {
    readonly inputPricePer1k?: number;
    readonly outputPricePer1k?: number;
}

export interface MetCostsOutput {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
}

export interface MetDurationInput {
    readonly tool?: string;
    readonly last?: number;
}

export interface MetDurationOutput {
    avg: number;
    min: number;
    max: number;
    calls: number;
}

export interface MetBatchInput {
    readonly records: readonly MetTokensInput[];
}

export interface MetBatchOutput {
    recorded: number;
    total: {
        inputTokens: number;
        outputTokens: number;
        tokens: number;
    };
}

// ─── In-memory batch buffer ───────────────────────────────────────────────────

/**
 * Pending entries queued between flush cycles.
 * All writes are in-memory (no fsync per call) — flushed on timer or
 * explicit met_session / met_batch call.
 */
let pending: ToolCall[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL_MS = 200;

function scheduledFlush(): void {
    if (pending.length > 0) {
        store.toolCalls.push(...pending);
        pending = [];
    }
    flushTimer = null;
}

function scheduleFlush(): void {
    if (flushTimer === null) {
        flushTimer = setTimeout(scheduledFlush, FLUSH_INTERVAL_MS);
    }
}

/** Immediately flush the pending buffer into the store. */
export function flushPending(): void {
    if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (pending.length > 0) {
        store.toolCalls.push(...pending);
        pending = [];
    }
}

// ─── metSession ───────────────────────────────────────────────────────────────

export function metSession(input: MetSessionInput): MetSessionOutput {
    flushPending();

    if (input.reset === true) {
        resetMetrics();
    }

    const totalInputTokens = store.toolCalls.reduce((acc, c) => acc + c.inputTokens, 0);
    const totalOutputTokens = store.toolCalls.reduce((acc, c) => acc + c.outputTokens, 0);
    const totalDuration = store.toolCalls.reduce((acc, c) => acc + c.duration, 0);

    return {
        startedAt: store.startedAt,
        toolCalls: store.toolCalls.length,
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalDuration,
    };
}

// ─── metTokens ────────────────────────────────────────────────────────────────

/**
 * Records a single tool-call metric.
 * The entry is queued in-memory and batch-flushed — no per-call fsync.
 * Calling this 21 times costs 1 queue push each, not 21 fsyncs.
 */
export function metTokens(input: MetTokensInput): MetTokensOutput {
    const entry: ToolCall = {
        tool: input.tool,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        duration: input.duration ?? 0,
        timestamp: Date.now(),
    };

    // Queue in pending buffer; flush happens on timer or explicit call
    pending.push(entry);
    scheduleFlush();

    // Compute totals over committed + pending for immediate feedback
    const allCalls = [...store.toolCalls, ...pending];
    const totalInputTokens = allCalls.reduce((acc, c) => acc + c.inputTokens, 0);
    const totalOutputTokens = allCalls.reduce((acc, c) => acc + c.outputTokens, 0);

    return {
        recorded: true,
        total: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            tokens: totalInputTokens + totalOutputTokens,
        },
    };
}

// ─── metBatch ────────────────────────────────────────────────────────────────

/**
 * Bulk-record an array of tool-call metrics in a single round-trip.
 * All records are flushed immediately to the store.
 */
export function metBatch(input: MetBatchInput): MetBatchOutput {
    const entries: ToolCall[] = input.records.map((r) => ({
        tool: r.tool,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        duration: r.duration ?? 0,
        timestamp: Date.now(),
    }));

    // Flush any pending before committing the batch
    flushPending();
    store.toolCalls.push(...entries);

    const totalInputTokens = store.toolCalls.reduce((acc, c) => acc + c.inputTokens, 0);
    const totalOutputTokens = store.toolCalls.reduce((acc, c) => acc + c.outputTokens, 0);

    return {
        recorded: entries.length,
        total: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            tokens: totalInputTokens + totalOutputTokens,
        },
    };
}

// ─── metCosts ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUT_PRICE_PER_1K = 0.003;
const DEFAULT_OUTPUT_PRICE_PER_1K = 0.015;

export function metCosts(input: MetCostsInput): MetCostsOutput {
    flushPending();

    const inputPrice = input.inputPricePer1k ?? DEFAULT_INPUT_PRICE_PER_1K;
    const outputPrice = input.outputPricePer1k ?? DEFAULT_OUTPUT_PRICE_PER_1K;

    const totalInputTokens = store.toolCalls.reduce((acc, c) => acc + c.inputTokens, 0);
    const totalOutputTokens = store.toolCalls.reduce((acc, c) => acc + c.outputTokens, 0);

    const inputCost = (totalInputTokens / 1000) * inputPrice;
    const outputCost = (totalOutputTokens / 1000) * outputPrice;

    return {
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
    };
}

// ─── metDuration ──────────────────────────────────────────────────────────────

export function metDuration(input: MetDurationInput): MetDurationOutput {
    flushPending();

    let calls: ToolCall[];

    if (input.tool !== undefined) {
        calls = store.toolCalls.filter((c) => c.tool === input.tool);
    } else if (input.last !== undefined) {
        calls = store.toolCalls.slice(-input.last);
    } else {
        calls = store.toolCalls;
    }

    if (calls.length === 0) {
        return { avg: 0, min: 0, max: 0, calls: 0 };
    }

    const durations = calls.map((c) => c.duration);
    const total = durations.reduce((acc, d) => acc + d, 0);
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
        avg: total / calls.length,
        min,
        max,
        calls: calls.length,
    };
}
