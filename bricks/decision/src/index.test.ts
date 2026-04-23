// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decOptions, decRecommend, decRecord, decTradeoffs, resetDecisions } from './operations.ts';

beforeEach(() => {
    resetDecisions();
});

afterEach(() => {
    resetDecisions();
});

describe('decOptions', () => {
    it('creates a decision with options and returns decisionId', () => {
        const result = decOptions({
            question: 'Which database to use?',
            options: [
                { label: 'PostgreSQL', pros: ['ACID', 'mature'], cons: ['complex setup'] },
                { label: 'SQLite', pros: ['simple'], cons: ['not scalable'] },
            ],
        });

        expect(result.decisionId).toBeTypeOf('string');
        expect(result.decisionId.length).toBeGreaterThan(0);
        expect(result.question).toBe('Which database to use?');
        expect(result.optionCount).toBe(2);
    });

    it('handles options without pros/cons', () => {
        const result = decOptions({
            question: 'Pick one?',
            options: [{ label: 'A' }, { label: 'B' }],
        });

        expect(result.optionCount).toBe(2);
    });
});

describe('decTradeoffs', () => {
    it('adds criteria and scores to an existing decision', () => {
        const { decisionId } = decOptions({
            question: 'Which framework?',
            options: [{ label: 'React' }, { label: 'Vue' }],
        });

        const result = decTradeoffs({
            decisionId,
            criteria: [
                { name: 'Performance', weight: 8 },
                { name: 'Ecosystem', weight: 6 },
            ],
            scores: [
                { option: 'React', scores: [9, 10] },
                { option: 'Vue', scores: [8, 7] },
            ],
        });

        expect(result.decisionId).toBe(decisionId);
        expect(result.criteriaCount).toBe(2);
        expect(result.scored).toBe(2);
    });

    it('throws for unknown decisionId', () => {
        expect(() =>
            decTradeoffs({
                decisionId: 'nonexistent-id',
                criteria: [{ name: 'Cost', weight: 5 }],
                scores: [{ option: 'A', scores: [7] }],
            }),
        ).toThrow('Decision not found: nonexistent-id');
    });
});

describe('decRecommend', () => {
    it('returns ranked options with correct weighted scores', () => {
        const { decisionId } = decOptions({
            question: 'Which language?',
            options: [{ label: 'TypeScript' }, { label: 'Go' }, { label: 'Rust' }],
        });

        decTradeoffs({
            decisionId,
            criteria: [
                { name: 'Safety', weight: 10 },
                { name: 'Speed', weight: 7 },
            ],
            scores: [
                { option: 'TypeScript', scores: [7, 6] },
                { option: 'Go', scores: [8, 9] },
                { option: 'Rust', scores: [10, 10] },
            ],
        });

        const result = decRecommend({ decisionId });

        expect(result.decisionId).toBe(decisionId);
        expect(result.ranking).toHaveLength(3);

        // Rust: 10*10 + 10*7 = 170
        // Go:   8*10 + 9*7  = 143
        // TS:   7*10 + 6*7  = 112
        expect(result.ranking[0]?.option).toBe('Rust');
        expect(result.ranking[1]?.option).toBe('Go');
        expect(result.ranking[2]?.option).toBe('TypeScript');
        expect(result.recommended).toBe('Rust');
    });

    it('throws when no tradeoffs defined', () => {
        const { decisionId } = decOptions({
            question: 'Test?',
            options: [{ label: 'A' }],
        });

        expect(() => decRecommend({ decisionId })).toThrow('has no tradeoffs defined yet');
    });

    it('throws for unknown decisionId', () => {
        expect(() => decRecommend({ decisionId: 'bad-id' })).toThrow('Decision not found: bad-id');
    });
});

describe('decRecord', () => {
    it('records the chosen option and rationale', async () => {
        const { decisionId } = decOptions({
            question: 'Pick a cloud?',
            options: [{ label: 'AWS' }, { label: 'GCP' }],
        });

        const result = await decRecord({
            decisionId,
            chosen: 'AWS',
            rationale: 'Better pricing for our use case',
        });

        expect(result.decisionId).toBe(decisionId);
        expect(result.chosen).toBe('AWS');
        expect(result.rationale).toBe('Better pricing for our use case');
        expect(result.saved).toBe(false);
    });

    it('persists to a JSON file when outputPath is provided', async () => {
        const { decisionId } = decOptions({
            question: 'Pick a storage?',
            options: [{ label: 'S3' }, { label: 'GCS' }],
        });

        const outputPath = join(tmpdir(), `decision-test-${Date.now()}.json`);

        try {
            const result = await decRecord({
                decisionId,
                chosen: 'S3',
                rationale: 'Already on AWS',
                outputPath,
            });

            expect(result.saved).toBe(true);

            const raw = await readFile(outputPath, 'utf-8');
            const parsed = JSON.parse(raw) as { chosen: string; rationale: string; id: string };
            expect(parsed.chosen).toBe('S3');
            expect(parsed.rationale).toBe('Already on AWS');
            expect(parsed.id).toBe(decisionId);
        } finally {
            await rm(outputPath, { force: true });
        }
    });

    it('throws for unknown decisionId', async () => {
        await expect(
            decRecord({ decisionId: 'bad-id', chosen: 'A', rationale: 'Because' }),
        ).rejects.toThrow('Decision not found: bad-id');
    });
});

describe('decision brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('decision:options', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('decision:tradeoffs', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('decision:recommend', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('decision:record', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
