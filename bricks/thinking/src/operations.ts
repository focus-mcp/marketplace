// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ThinkingStep {
    thought: string;
    confidence?: number;
    timestamp: number;
    revision?: { original: string; reason: string };
}

export interface ThinkingBranch {
    label: string;
    steps: ThinkingStep[];
}

export interface ThinkingChain {
    id: string;
    steps: ThinkingStep[];
    branches: ThinkingBranch[];
    createdAt: number;
}

// ─── Input / Output interfaces ────────────────────────────────────────────────

export interface ThkThinkInput {
    readonly thought: string;
    readonly confidence?: number;
    readonly chainId?: string;
}

export interface ThkThinkOutput {
    chainId: string;
    stepIndex: number;
    totalSteps: number;
}

export interface ThkBranchInput {
    readonly label: string;
    readonly thought: string;
    readonly chainId?: string;
}

export interface ThkBranchOutput {
    chainId: string;
    branchIndex: number;
    label: string;
}

export interface ThkReviseInput {
    readonly stepIndex: number;
    readonly revision: string;
    readonly reason: string;
    readonly chainId?: string;
}

export interface ThkReviseOutput {
    chainId: string;
    stepIndex: number;
    original: string;
    revised: string;
}

export interface ThkSummarizeInput {
    readonly chainId?: string;
}

export interface TimelineEntry {
    index: number;
    thought: string;
    confidence?: number;
}

export interface ThkSummarizeOutput {
    chainId: string;
    steps: number;
    branches: number;
    avgConfidence: number | null;
    timeline: TimelineEntry[];
    conclusion: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

const chains: Map<string, ThinkingChain> = new Map();
let currentChainId: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateChain(chainId?: string): ThinkingChain {
    const id = chainId ?? currentChainId ?? randomUUID();
    if (!chains.has(id)) {
        const chain: ThinkingChain = {
            id,
            steps: [],
            branches: [],
            createdAt: Date.now(),
        };
        chains.set(id, chain);
    }
    currentChainId = id;
    return chains.get(id) as ThinkingChain;
}

function resolveChain(chainId?: string): ThinkingChain {
    const id = chainId ?? currentChainId;
    if (!id) throw new Error('No active reasoning chain. Call think first.');
    const chain = chains.get(id);
    if (!chain) throw new Error(`Chain not found: ${id}`);
    return chain;
}

// ─── thkThink ─────────────────────────────────────────────────────────────────

export function thkThink(input: ThkThinkInput): ThkThinkOutput {
    const chain = getOrCreateChain(input.chainId);
    const step: ThinkingStep = {
        thought: input.thought,
        timestamp: Date.now(),
    };
    if (input.confidence !== undefined) {
        step.confidence = input.confidence;
    }
    chain.steps.push(step);
    return {
        chainId: chain.id,
        stepIndex: chain.steps.length - 1,
        totalSteps: chain.steps.length,
    };
}

// ─── thkBranch ────────────────────────────────────────────────────────────────

export function thkBranch(input: ThkBranchInput): ThkBranchOutput {
    const chain = getOrCreateChain(input.chainId);
    const branch: ThinkingBranch = {
        label: input.label,
        steps: [
            {
                thought: input.thought,
                timestamp: Date.now(),
            },
        ],
    };
    chain.branches.push(branch);
    return {
        chainId: chain.id,
        branchIndex: chain.branches.length - 1,
        label: input.label,
    };
}

// ─── thkRevise ────────────────────────────────────────────────────────────────

export function thkRevise(input: ThkReviseInput): ThkReviseOutput {
    const chain = resolveChain(input.chainId);
    const step = chain.steps[input.stepIndex];
    if (!step) throw new Error(`Step ${input.stepIndex} not found in chain ${chain.id}`);
    const original = step.thought;
    step.revision = { original, reason: input.reason };
    step.thought = input.revision;
    return {
        chainId: chain.id,
        stepIndex: input.stepIndex,
        original,
        revised: input.revision,
    };
}

// ─── thkSummarize ─────────────────────────────────────────────────────────────

export function thkSummarize(input: ThkSummarizeInput): ThkSummarizeOutput {
    const chain = resolveChain(input.chainId);
    const timeline: TimelineEntry[] = chain.steps.map((s, i) => {
        const entry: TimelineEntry = { index: i, thought: s.thought };
        if (s.confidence !== undefined) entry.confidence = s.confidence;
        return entry;
    });

    const withConfidence = chain.steps.filter((s) => s.confidence !== undefined);
    const avgConfidence =
        withConfidence.length > 0
            ? withConfidence.reduce((sum, s) => sum + (s.confidence as number), 0) /
              withConfidence.length
            : null;

    const lastStep = chain.steps[chain.steps.length - 1];
    const conclusion = lastStep?.thought ?? '';

    return {
        chainId: chain.id,
        steps: chain.steps.length,
        branches: chain.branches.length,
        avgConfidence,
        timeline,
        conclusion,
    };
}

// ─── resetChains (for testing) ────────────────────────────────────────────────

export function resetChains(): void {
    chains.clear();
    currentChainId = null;
}
