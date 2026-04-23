// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionRecord {
    id: string;
    timestamp: number;
    baselineTokens: number;
    actualTokens: number;
    duration: number;
}

export interface SavReportInput {
    readonly baselineTokens: number;
    readonly actualTokens: number;
    readonly duration?: number;
}

export interface SavReportOutput {
    sessionId: string;
    saved: number;
    percentage: number;
    factor: number;
}

export interface SavCompareInput {
    readonly sessionA: string;
    readonly sessionB: string;
}

export interface SessionDetail {
    id: string;
    saved: number;
    percentage: number;
}

export interface SavCompareOutput {
    better: string;
    improvement: number;
    details: { a: SessionDetail; b: SessionDetail };
}

export interface SavTrendInput {
    readonly last?: number;
}

export interface TrendSession {
    id: string;
    timestamp: number;
    saved: number;
    percentage: number;
}

export interface SavTrendOutput {
    sessions: TrendSession[];
    avgSavingsPercent: number;
    trend: 'improving' | 'stable' | 'declining';
}

export interface SavRoiInput {
    readonly costPerToken?: number;
    readonly overheadMs?: number;
}

export interface SavRoiOutput {
    tokensSaved: number;
    costSaved: number;
    timeOverhead: number;
    netBenefit: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const sessions: Array<SessionRecord> = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeSavingsPercent(record: SessionRecord): number {
    if (record.baselineTokens === 0) return 0;
    return ((record.baselineTokens - record.actualTokens) / record.baselineTokens) * 100;
}

function detectTrend(percents: number[]): 'improving' | 'stable' | 'declining' {
    if (percents.length < 2) return 'stable';
    const half = Math.floor(percents.length / 2);
    const firstHalf = percents.slice(0, half);
    const secondHalf = percents.slice(half);
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const delta = avgSecond - avgFirst;
    if (delta > 2) return 'improving';
    if (delta < -2) return 'declining';
    return 'stable';
}

// ─── savReport ───────────────────────────────────────────────────────────────

export function savReport(input: SavReportInput): SavReportOutput {
    const sessionId = randomUUID();
    const record: SessionRecord = {
        id: sessionId,
        timestamp: Date.now(),
        baselineTokens: input.baselineTokens,
        actualTokens: input.actualTokens,
        ...(input.duration !== undefined ? { duration: input.duration } : { duration: 0 }),
    };
    sessions.push(record);

    const saved = record.baselineTokens - record.actualTokens;
    const percentage = record.baselineTokens === 0 ? 0 : (saved / record.baselineTokens) * 100;
    const factor =
        record.actualTokens === 0
            ? record.baselineTokens
            : record.baselineTokens / record.actualTokens;

    return { sessionId, saved, percentage, factor };
}

// ─── savCompare ──────────────────────────────────────────────────────────────

export function savCompare(input: SavCompareInput): SavCompareOutput {
    const recA = sessions.find((s) => s.id === input.sessionA);
    const recB = sessions.find((s) => s.id === input.sessionB);

    if (!recA) throw new Error(`Session not found: ${input.sessionA}`);
    if (!recB) throw new Error(`Session not found: ${input.sessionB}`);

    const percentA = computeSavingsPercent(recA);
    const percentB = computeSavingsPercent(recB);

    const detailA: SessionDetail = {
        id: recA.id,
        saved: recA.baselineTokens - recA.actualTokens,
        percentage: percentA,
    };
    const detailB: SessionDetail = {
        id: recB.id,
        saved: recB.baselineTokens - recB.actualTokens,
        percentage: percentB,
    };

    const better = percentA >= percentB ? recA.id : recB.id;
    const improvement = Math.abs(percentA - percentB);

    return { better, improvement, details: { a: detailA, b: detailB } };
}

// ─── savTrend ────────────────────────────────────────────────────────────────

export function savTrend(input: SavTrendInput): SavTrendOutput {
    const slice = input.last !== undefined ? sessions.slice(-input.last) : sessions.slice();

    const trendSessions: TrendSession[] = slice.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        saved: s.baselineTokens - s.actualTokens,
        percentage: computeSavingsPercent(s),
    }));

    const percents = trendSessions.map((s) => s.percentage);
    const avgSavingsPercent =
        percents.length === 0 ? 0 : percents.reduce((sum, v) => sum + v, 0) / percents.length;
    const trend = detectTrend(percents);

    return { sessions: trendSessions, avgSavingsPercent, trend };
}

// ─── savRoi ──────────────────────────────────────────────────────────────────

export function savRoi(input: SavRoiInput): SavRoiOutput {
    const costPerToken = input.costPerToken ?? 0.000003;
    const overheadMs = input.overheadMs ?? 0;

    const tokensSaved = sessions.reduce(
        (sum, s) => sum + Math.max(0, s.baselineTokens - s.actualTokens),
        0,
    );
    const costSaved = tokensSaved * costPerToken;
    const timeOverhead = overheadMs * sessions.length;
    const netBenefit = costSaved - timeOverhead * 0.000001;

    return { tokensSaved, costSaved, timeOverhead, netBenefit };
}

// ─── resetSavings (testing) ───────────────────────────────────────────────────

export function resetSavings(): void {
    sessions.length = 0;
}
