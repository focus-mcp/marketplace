// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Option {
    label: string;
    pros: string[];
    cons: string[];
}

export interface Criterion {
    name: string;
    weight: number;
}

export interface OptionScore {
    option: string;
    scores: number[];
}

export interface Decision {
    id: string;
    question: string;
    options: Option[];
    criteria?: Criterion[];
    scores?: OptionScore[];
    chosen?: string;
    rationale?: string;
    createdAt: number;
}

export interface DecOptionsInput {
    readonly question: string;
    readonly options: ReadonlyArray<{
        readonly label: string;
        readonly pros?: readonly string[];
        readonly cons?: readonly string[];
    }>;
}

export interface DecOptionsOutput {
    decisionId: string;
    question: string;
    optionCount: number;
}

export interface DecTradeoffsInput {
    readonly decisionId: string;
    readonly criteria: ReadonlyArray<{
        readonly name: string;
        readonly weight: number;
    }>;
    readonly scores: ReadonlyArray<{
        readonly option: string;
        readonly scores: readonly number[];
    }>;
}

export interface DecTradeoffsOutput {
    decisionId: string;
    criteriaCount: number;
    scored: number;
}

export interface DecRecommendInput {
    readonly decisionId: string;
}

export interface RankingEntry {
    option: string;
    weightedScore: number;
}

export interface DecRecommendOutput {
    decisionId: string;
    ranking: RankingEntry[];
    recommended: string;
}

export interface DecRecordInput {
    readonly decisionId: string;
    readonly chosen: string;
    readonly rationale: string;
    readonly outputPath?: string;
}

export interface DecRecordOutput {
    decisionId: string;
    chosen: string;
    rationale: string;
    saved: boolean;
}

// ─── State ────────────────────────────────────────────────────────────────────

export const decisions: Map<string, Decision> = new Map();

export function resetDecisions(): void {
    decisions.clear();
}

// ─── decOptions ───────────────────────────────────────────────────────────────

export function decOptions(input: DecOptionsInput): DecOptionsOutput {
    const id = randomUUID();
    const options: Option[] = input.options.map((o) => ({
        label: o.label,
        pros: o.pros ? [...o.pros] : [],
        cons: o.cons ? [...o.cons] : [],
    }));

    const decision: Decision = {
        id,
        question: input.question,
        options,
        createdAt: Date.now(),
    };

    decisions.set(id, decision);

    return {
        decisionId: id,
        question: input.question,
        optionCount: options.length,
    };
}

// ─── decTradeoffs ─────────────────────────────────────────────────────────────

export function decTradeoffs(input: DecTradeoffsInput): DecTradeoffsOutput {
    const decision = decisions.get(input.decisionId);
    if (!decision) {
        throw new Error(`Decision not found: ${input.decisionId}`);
    }

    decision.criteria = input.criteria.map((c) => ({ name: c.name, weight: c.weight }));
    decision.scores = input.scores.map((s) => ({ option: s.option, scores: [...s.scores] }));

    return {
        decisionId: input.decisionId,
        criteriaCount: decision.criteria.length,
        scored: decision.scores.length,
    };
}

// ─── decRecommend ─────────────────────────────────────────────────────────────

export function decRecommend(input: DecRecommendInput): DecRecommendOutput {
    const decision = decisions.get(input.decisionId);
    if (!decision) {
        throw new Error(`Decision not found: ${input.decisionId}`);
    }

    if (!decision.criteria || !decision.scores) {
        throw new Error(`Decision ${input.decisionId} has no tradeoffs defined yet`);
    }

    const criteria = decision.criteria;
    const ranking: RankingEntry[] = decision.scores.map((optScore) => {
        const weightedScore = optScore.scores.reduce((sum, score, i) => {
            const criterion = criteria[i];
            const weight = criterion ? criterion.weight : 0;
            return sum + score * weight;
        }, 0);
        return { option: optScore.option, weightedScore };
    });

    ranking.sort((a, b) => b.weightedScore - a.weightedScore);

    const recommended = ranking[0]?.option ?? '';

    return {
        decisionId: input.decisionId,
        ranking,
        recommended,
    };
}

// ─── decRecord ────────────────────────────────────────────────────────────────

export async function decRecord(input: DecRecordInput): Promise<DecRecordOutput> {
    const decision = decisions.get(input.decisionId);
    if (!decision) {
        throw new Error(`Decision not found: ${input.decisionId}`);
    }

    decision.chosen = input.chosen;
    decision.rationale = input.rationale;

    let saved = false;

    if (input.outputPath) {
        const record = {
            id: decision.id,
            question: decision.question,
            options: decision.options,
            criteria: decision.criteria,
            scores: decision.scores,
            chosen: decision.chosen,
            rationale: decision.rationale,
            createdAt: decision.createdAt,
            recordedAt: Date.now(),
        };
        await writeFile(input.outputPath, JSON.stringify(record, null, 4), 'utf-8');
        saved = true;
    }

    return {
        decisionId: input.decisionId,
        chosen: input.chosen,
        rationale: input.rationale,
        saved,
    };
}
