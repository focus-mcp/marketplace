// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Position {
    readonly role: string;
    readonly argument: string;
}

export interface CriteriaScore {
    readonly role: string;
    readonly relevance: number;
    readonly evidence: number;
    readonly feasibility: number;
}

export interface RankedPosition {
    role: string;
    weightedScore: number;
    rank: number;
}

export interface Debate {
    id: string;
    topic: string;
    positions: Position[];
    scores: CriteriaScore[];
    consensusNotes: string[];
}

// ─── State ───────────────────────────────────────────────────────────────────

export const debates: Map<string, Debate> = new Map();

// ─── Input/Output types ───────────────────────────────────────────────────────

export interface DbtDebateInput {
    readonly topic: string;
    readonly positions: readonly Position[];
}

export interface DbtDebateOutput {
    debateId: string;
    topic: string;
    positionCount: number;
}

export interface DbtConsensusInput {
    readonly debateId: string;
}

export interface DbtConsensusOutput {
    debateId: string;
    commonTerms: string[];
    agreementAreas: string[];
}

export interface DbtScoreInput {
    readonly debateId: string;
    readonly scores: readonly CriteriaScore[];
}

export interface DbtScoreOutput {
    debateId: string;
    ranking: RankedPosition[];
}

export interface DbtSummaryInput {
    readonly debateId: string;
}

export interface DbtSummaryOutput {
    debateId: string;
    topic: string;
    winner: string | null;
    keyPoints: string[];
    agreementAreas: string[];
    disagreementAreas: string[];
    positionCount: number;
    scored: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'shall',
    'can',
    'it',
    'its',
    'this',
    'that',
    'these',
    'those',
    'we',
    'they',
    'he',
    'she',
    'i',
    'you',
    'our',
    'their',
    'my',
    'your',
    'not',
    'no',
    'so',
    'as',
    'if',
    'by',
    'from',
    'also',
    'than',
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 3 && !STOP_WORDS.has(t));
}

function findCommonTerms(positions: Position[]): string[] {
    if (positions.length === 0) return [];

    const tokenSets = positions.map((p) => new Set(tokenize(p.argument)));
    const [first, ...rest] = tokenSets;
    if (!first) return [];

    const common: string[] = [];
    for (const term of first) {
        if (rest.every((s) => s.has(term))) {
            common.push(term);
        }
    }
    return common.sort();
}

function computeWeightedAverage(score: CriteriaScore): number {
    // Weights: relevance 40%, evidence 35%, feasibility 25%
    return score.relevance * 0.4 + score.evidence * 0.35 + score.feasibility * 0.25;
}

function getDebateOrThrow(debateId: string): Debate {
    const debate = debates.get(debateId);
    if (!debate) {
        throw new Error(`Debate not found: ${debateId}`);
    }
    return debate;
}

// ─── dbtDebate ────────────────────────────────────────────────────────────────

export function dbtDebate(input: DbtDebateInput): DbtDebateOutput {
    const id = randomUUID();
    const debate: Debate = {
        id,
        topic: input.topic,
        positions: input.positions.map((p) => ({ role: p.role, argument: p.argument })),
        scores: [],
        consensusNotes: [],
    };
    debates.set(id, debate);
    return { debateId: id, topic: debate.topic, positionCount: debate.positions.length };
}

// ─── dbtConsensus ─────────────────────────────────────────────────────────────

export function dbtConsensus(input: DbtConsensusInput): DbtConsensusOutput {
    const debate = getDebateOrThrow(input.debateId);
    const commonTerms = findCommonTerms(debate.positions);

    const agreementAreas =
        commonTerms.length > 0
            ? [`Shared concepts: ${commonTerms.slice(0, 5).join(', ')}`]
            : ['No common ground detected across arguments'];

    debate.consensusNotes = agreementAreas;

    return { debateId: debate.id, commonTerms, agreementAreas };
}

// ─── dbtScore ─────────────────────────────────────────────────────────────────

export function dbtScore(input: DbtScoreInput): DbtScoreOutput {
    const debate = getDebateOrThrow(input.debateId);

    debate.scores = input.scores.map((s) => ({
        role: s.role,
        relevance: Math.min(10, Math.max(1, s.relevance)),
        evidence: Math.min(10, Math.max(1, s.evidence)),
        feasibility: Math.min(10, Math.max(1, s.feasibility)),
    }));

    const ranked: RankedPosition[] = debate.scores
        .map((s) => ({ role: s.role, weightedScore: computeWeightedAverage(s) }))
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return { debateId: debate.id, ranking: ranked };
}

// ─── dbtSummary ───────────────────────────────────────────────────────────────

export function dbtSummary(input: DbtSummaryInput): DbtSummaryOutput {
    const debate = getDebateOrThrow(input.debateId);
    const scored = debate.scores.length > 0;

    let winner: string | null = null;
    if (scored) {
        const top = debate.scores
            .map((s) => ({ role: s.role, score: computeWeightedAverage(s) }))
            .sort((a, b) => b.score - a.score)[0];
        winner = top?.role ?? null;
    }

    const keyPoints = debate.positions.map(
        (p) => `[${p.role}] ${p.argument.slice(0, 120)}${p.argument.length > 120 ? '…' : ''}`,
    );

    const commonTerms = findCommonTerms(debate.positions);
    const agreementAreas =
        debate.consensusNotes.length > 0
            ? debate.consensusNotes
            : commonTerms.length > 0
              ? [`Shared concepts: ${commonTerms.slice(0, 5).join(', ')}`]
              : [];

    const allTermSets = debate.positions.map((p) => new Set(tokenize(p.argument)));
    const uniqueTerms: string[] = [];
    for (const [i, set] of allTermSets.entries()) {
        for (const term of set) {
            const appearsElsewhere = allTermSets.some((s, j) => j !== i && s.has(term));
            if (!appearsElsewhere && !uniqueTerms.includes(term)) {
                uniqueTerms.push(term);
            }
        }
    }
    const disagreementAreas =
        uniqueTerms.length > 0 ? [`Diverging concepts: ${uniqueTerms.slice(0, 5).join(', ')}`] : [];

    return {
        debateId: debate.id,
        topic: debate.topic,
        winner,
        keyPoints,
        agreementAreas,
        disagreementAreas,
        positionCount: debate.positions.length,
        scored,
    };
}
