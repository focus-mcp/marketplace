// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dbtConsensus, dbtDebate, dbtScore, dbtSummary, debates } from './operations.ts';

beforeEach(() => {
    debates.clear();
});

afterEach(() => {
    debates.clear();
});

// ─── dbtDebate ────────────────────────────────────────────────────────────────

describe('dbtDebate', () => {
    it('creates a debate and returns debateId, topic, positionCount', () => {
        const result = dbtDebate({
            topic: 'Remote work vs office work',
            positions: [
                {
                    role: 'Remote advocate',
                    argument: 'Remote work increases productivity and autonomy.',
                },
                {
                    role: 'Office advocate',
                    argument: 'Office work fosters collaboration and culture.',
                },
            ],
        });

        expect(result.debateId).toBeDefined();
        expect(result.topic).toBe('Remote work vs office work');
        expect(result.positionCount).toBe(2);
    });

    it('stores the debate in state', () => {
        const { debateId } = dbtDebate({
            topic: 'AI regulation',
            positions: [
                { role: 'Pro-regulation', argument: 'AI needs strict oversight to prevent harm.' },
                {
                    role: 'Anti-regulation',
                    argument: 'Regulation stifles innovation and progress.',
                },
            ],
        });

        expect(debates.has(debateId)).toBe(true);
        expect(debates.get(debateId)?.topic).toBe('AI regulation');
    });

    it('supports more than 2 positions', () => {
        const result = dbtDebate({
            topic: 'Energy sources',
            positions: [
                { role: 'Solar', argument: 'Solar energy is abundant and clean.' },
                { role: 'Nuclear', argument: 'Nuclear provides reliable baseload power.' },
                { role: 'Wind', argument: 'Wind energy is cost-effective at scale.' },
            ],
        });

        expect(result.positionCount).toBe(3);
    });
});

// ─── dbtConsensus ─────────────────────────────────────────────────────────────

describe('dbtConsensus', () => {
    it('finds common terms across positions', () => {
        const { debateId } = dbtDebate({
            topic: 'Education reform',
            positions: [
                {
                    role: 'A',
                    argument: 'Quality education should focus on critical thinking skills.',
                },
                {
                    role: 'B',
                    argument: 'Education quality depends on critical thinking and assessment.',
                },
            ],
        });

        const result = dbtConsensus({ debateId });

        expect(result.debateId).toBe(debateId);
        expect(result.commonTerms).toBeInstanceOf(Array);
        expect(result.agreementAreas).toBeInstanceOf(Array);
        expect(result.agreementAreas.length).toBeGreaterThan(0);
    });

    it('returns no common ground when positions diverge completely', () => {
        const { debateId } = dbtDebate({
            topic: 'Unrelated topics',
            positions: [
                { role: 'A', argument: 'Stars shine brightly across distant galaxies.' },
                { role: 'B', argument: 'Music notation represents rhythmic temporal patterns.' },
            ],
        });

        const result = dbtConsensus({ debateId });

        expect(result.commonTerms).toBeInstanceOf(Array);
        expect(result.agreementAreas).toBeInstanceOf(Array);
    });

    it('throws when debate does not exist', () => {
        expect(() => dbtConsensus({ debateId: 'nonexistent-id' })).toThrow('Debate not found');
    });

    it('stores consensus notes on the debate', () => {
        const { debateId } = dbtDebate({
            topic: 'Climate policy',
            positions: [
                { role: 'A', argument: 'Carbon taxes reduce emissions effectively.' },
                { role: 'B', argument: 'Carbon pricing reduces pollution and emissions.' },
            ],
        });

        dbtConsensus({ debateId });

        expect(debates.get(debateId)?.consensusNotes.length).toBeGreaterThan(0);
    });
});

// ─── dbtScore ─────────────────────────────────────────────────────────────────

describe('dbtScore', () => {
    it('returns a ranking sorted by weighted score descending', () => {
        const { debateId } = dbtDebate({
            topic: 'Transport policy',
            positions: [
                { role: 'Train', argument: 'Trains are efficient and sustainable.' },
                { role: 'Car', argument: 'Cars offer unmatched personal flexibility.' },
            ],
        });

        const result = dbtScore({
            debateId,
            scores: [
                { role: 'Train', relevance: 9, evidence: 8, feasibility: 7 },
                { role: 'Car', relevance: 6, evidence: 5, feasibility: 8 },
            ],
        });

        expect(result.debateId).toBe(debateId);
        expect(result.ranking).toHaveLength(2);
        expect(result.ranking[0]?.rank).toBe(1);
        expect(result.ranking[1]?.rank).toBe(2);
        expect(result.ranking[0]?.weightedScore).toBeGreaterThan(
            result.ranking[1]?.weightedScore ?? 0,
        );
    });

    it('clamps scores to [1, 10]', () => {
        const { debateId } = dbtDebate({
            topic: 'Test clamping',
            positions: [
                { role: 'A', argument: 'Argument A.' },
                { role: 'B', argument: 'Argument B.' },
            ],
        });

        dbtScore({
            debateId,
            scores: [
                { role: 'A', relevance: 15, evidence: 0, feasibility: -3 },
                { role: 'B', relevance: 5, evidence: 5, feasibility: 5 },
            ],
        });

        const stored = debates.get(debateId);
        const scoreA = stored?.scores.find((s) => s.role === 'A');
        expect(scoreA?.relevance).toBe(10);
        expect(scoreA?.evidence).toBe(1);
        expect(scoreA?.feasibility).toBe(1);
    });

    it('throws when debate does not exist', () => {
        expect(() =>
            dbtScore({
                debateId: 'bad-id',
                scores: [{ role: 'X', relevance: 5, evidence: 5, feasibility: 5 }],
            }),
        ).toThrow('Debate not found');
    });
});

// ─── dbtSummary ───────────────────────────────────────────────────────────────

describe('dbtSummary', () => {
    it('returns full summary with winner when scored', () => {
        const { debateId } = dbtDebate({
            topic: 'Cloud vs on-prem',
            positions: [
                {
                    role: 'Cloud',
                    argument: 'Cloud infrastructure scales automatically and reduces cost.',
                },
                {
                    role: 'On-prem',
                    argument: 'On-premise solutions give full control and data security.',
                },
            ],
        });

        dbtScore({
            debateId,
            scores: [
                { role: 'Cloud', relevance: 9, evidence: 8, feasibility: 9 },
                { role: 'On-prem', relevance: 7, evidence: 6, feasibility: 6 },
            ],
        });

        const result = dbtSummary({ debateId });

        expect(result.debateId).toBe(debateId);
        expect(result.topic).toBe('Cloud vs on-prem');
        expect(result.winner).toBe('Cloud');
        expect(result.keyPoints).toHaveLength(2);
        expect(result.scored).toBe(true);
        expect(result.positionCount).toBe(2);
    });

    it('returns null winner when not scored', () => {
        const { debateId } = dbtDebate({
            topic: 'Unscored debate',
            positions: [
                { role: 'A', argument: 'First argument about the topic.' },
                { role: 'B', argument: 'Second argument about the topic.' },
            ],
        });

        const result = dbtSummary({ debateId });

        expect(result.winner).toBeNull();
        expect(result.scored).toBe(false);
    });

    it('includes agreement and disagreement areas', () => {
        const { debateId } = dbtDebate({
            topic: 'Open source vs proprietary',
            positions: [
                {
                    role: 'Open',
                    argument: 'Open source software fosters collaboration and transparency.',
                },
                {
                    role: 'Proprietary',
                    argument: 'Proprietary software ensures accountability and support.',
                },
            ],
        });

        const result = dbtSummary({ debateId });

        expect(result.agreementAreas).toBeInstanceOf(Array);
        expect(result.disagreementAreas).toBeInstanceOf(Array);
    });

    it('throws when debate does not exist', () => {
        expect(() => dbtSummary({ debateId: 'missing' })).toThrow('Debate not found');
    });

    it('truncates long arguments in key points', () => {
        const longArg = 'A'.repeat(200);
        const { debateId } = dbtDebate({
            topic: 'Long argument debate',
            positions: [
                { role: 'A', argument: longArg },
                { role: 'B', argument: 'Short argument.' },
            ],
        });

        const result = dbtSummary({ debateId });
        const pointA = result.keyPoints.find((p) => p.startsWith('[A]'));
        expect(pointA?.endsWith('…')).toBe(true);
    });
});

// ─── Brick integration ────────────────────────────────────────────────────────

describe('debate brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('debate:debate', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('debate:consensus', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('debate:score', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('debate:summary', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('debate');
        expect(brick.manifest.prefix).toBe('dbt');
    });
});
