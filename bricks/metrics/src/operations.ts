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

// ─── metSession ───────────────────────────────────────────────────────────────

export function metSession(input: MetSessionInput): MetSessionOutput {
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

export function metTokens(input: MetTokensInput): MetTokensOutput {
    const entry: ToolCall = {
        tool: input.tool,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        duration: 0,
        timestamp: Date.now(),
    };

    store.toolCalls.push(entry);

    const totalInputTokens = store.toolCalls.reduce((acc, c) => acc + c.inputTokens, 0);
    const totalOutputTokens = store.toolCalls.reduce((acc, c) => acc + c.outputTokens, 0);

    return {
        recorded: true,
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
