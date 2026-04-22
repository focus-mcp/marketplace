// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetChains, thkBranch, thkRevise, thkSummarize, thkThink } from './operations.ts';

afterEach(() => {
    resetChains();
});

// ─── thkThink ─────────────────────────────────────────────────────────────────

describe('thkThink', () => {
    it('creates a new chain on first call', () => {
        const result = thkThink({ thought: 'First step' });
        expect(result.chainId).toBeTruthy();
        expect(result.stepIndex).toBe(0);
        expect(result.totalSteps).toBe(1);
    });

    it('appends to the same chain on subsequent calls', () => {
        const r1 = thkThink({ thought: 'Step 1' });
        const r2 = thkThink({ thought: 'Step 2' });
        expect(r1.chainId).toBe(r2.chainId);
        expect(r2.stepIndex).toBe(1);
        expect(r2.totalSteps).toBe(2);
    });

    it('accepts an optional confidence score', () => {
        const result = thkThink({ thought: 'Confident step', confidence: 0.9 });
        expect(result.stepIndex).toBe(0);
    });

    it('uses an explicit chainId when provided', () => {
        const r1 = thkThink({ thought: 'Chain A step 1', chainId: 'chain-a' });
        const r2 = thkThink({ thought: 'Chain B step 1', chainId: 'chain-b' });
        expect(r1.chainId).toBe('chain-a');
        expect(r2.chainId).toBe('chain-b');
        expect(r1.chainId).not.toBe(r2.chainId);
    });

    it('appends to existing chain when chainId matches', () => {
        const r1 = thkThink({ thought: 'Step 1', chainId: 'my-chain' });
        const r2 = thkThink({ thought: 'Step 2', chainId: 'my-chain' });
        expect(r2.totalSteps).toBe(2);
        expect(r1.chainId).toBe(r2.chainId);
    });
});

// ─── thkBranch ────────────────────────────────────────────────────────────────

describe('thkBranch', () => {
    it('creates a branch on the current chain', () => {
        thkThink({ thought: 'Root thought' });
        const result = thkBranch({ label: 'Option A', thought: 'Branch step 1' });
        expect(result.branchIndex).toBe(0);
        expect(result.label).toBe('Option A');
        expect(result.chainId).toBeTruthy();
    });

    it('creates a new chain if none exists', () => {
        const result = thkBranch({ label: 'Option B', thought: 'Branch from scratch' });
        expect(result.chainId).toBeTruthy();
        expect(result.branchIndex).toBe(0);
    });

    it('creates multiple branches independently', () => {
        thkThink({ thought: 'Root' });
        const b1 = thkBranch({ label: 'Option A', thought: 'Path A' });
        const b2 = thkBranch({ label: 'Option B', thought: 'Path B' });
        expect(b1.branchIndex).toBe(0);
        expect(b2.branchIndex).toBe(1);
        expect(b1.chainId).toBe(b2.chainId);
    });

    it('uses explicit chainId when provided', () => {
        thkThink({ thought: 'Step', chainId: 'explicit' });
        const result = thkBranch({ label: 'Alt', thought: 'Branch', chainId: 'explicit' });
        expect(result.chainId).toBe('explicit');
    });
});

// ─── thkRevise ────────────────────────────────────────────────────────────────

describe('thkRevise', () => {
    it('revises a step and keeps the original', () => {
        thkThink({ thought: 'Initial thought' });
        const result = thkRevise({
            stepIndex: 0,
            revision: 'Revised thought',
            reason: 'Better phrasing',
        });
        expect(result.original).toBe('Initial thought');
        expect(result.revised).toBe('Revised thought');
        expect(result.stepIndex).toBe(0);
    });

    it('throws when stepIndex is out of bounds', () => {
        thkThink({ thought: 'Only step' });
        expect(() => thkRevise({ stepIndex: 5, revision: 'x', reason: 'y' })).toThrow();
    });

    it('throws when no chain exists', () => {
        expect(() => thkRevise({ stepIndex: 0, revision: 'x', reason: 'y' })).toThrow();
    });

    it('revises using explicit chainId', () => {
        thkThink({ thought: 'Step A', chainId: 'chain-rev' });
        const result = thkRevise({
            stepIndex: 0,
            revision: 'Revised A',
            reason: 'New info',
            chainId: 'chain-rev',
        });
        expect(result.chainId).toBe('chain-rev');
        expect(result.original).toBe('Step A');
    });
});

// ─── thkSummarize ─────────────────────────────────────────────────────────────

describe('thkSummarize', () => {
    it('summarizes a chain with steps', () => {
        thkThink({ thought: 'Step 1', confidence: 0.8 });
        thkThink({ thought: 'Step 2', confidence: 0.6 });
        thkThink({ thought: 'Final conclusion' });
        const result = thkSummarize({});
        expect(result.steps).toBe(3);
        expect(result.branches).toBe(0);
        expect(result.conclusion).toBe('Final conclusion');
        expect(result.timeline).toHaveLength(3);
    });

    it('computes avgConfidence when confidence scores are present', () => {
        thkThink({ thought: 'A', confidence: 0.8 });
        thkThink({ thought: 'B', confidence: 0.6 });
        const result = thkSummarize({});
        expect(result.avgConfidence).toBeCloseTo(0.7);
    });

    it('returns null avgConfidence when no confidence scores', () => {
        thkThink({ thought: 'No confidence' });
        const result = thkSummarize({});
        expect(result.avgConfidence).toBeNull();
    });

    it('counts branches in summary', () => {
        thkThink({ thought: 'Root' });
        thkBranch({ label: 'Option A', thought: 'Path A' });
        thkBranch({ label: 'Option B', thought: 'Path B' });
        const result = thkSummarize({});
        expect(result.branches).toBe(2);
    });

    it('throws when no chain exists', () => {
        expect(() => thkSummarize({})).toThrow();
    });

    it('summarizes explicit chainId', () => {
        thkThink({ thought: 'Chain X step', chainId: 'chain-x' });
        const result = thkSummarize({ chainId: 'chain-x' });
        expect(result.chainId).toBe('chain-x');
    });
});

// ─── Multiple chains ──────────────────────────────────────────────────────────

describe('multiple chains', () => {
    it('maintains independent state per chainId', () => {
        thkThink({ thought: 'Chain A step 1', chainId: 'a' });
        thkThink({ thought: 'Chain A step 2', chainId: 'a' });
        thkThink({ thought: 'Chain B step 1', chainId: 'b' });

        const sumA = thkSummarize({ chainId: 'a' });
        const sumB = thkSummarize({ chainId: 'b' });

        expect(sumA.steps).toBe(2);
        expect(sumB.steps).toBe(1);
        expect(sumA.conclusion).toBe('Chain A step 2');
        expect(sumB.conclusion).toBe('Chain B step 1');
    });
});

// ─── resetChains ─────────────────────────────────────────────────────────────

describe('resetChains', () => {
    it('clears all chains and resets current chain', () => {
        thkThink({ thought: 'Some thought' });
        resetChains();
        expect(() => thkSummarize({})).toThrow();
    });
});

// ─── Brick integration ────────────────────────────────────────────────────────

describe('thinking brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        resetChains();
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
        expect(bus.handle).toHaveBeenCalledWith('thinking:think', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('thinking:branch', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('thinking:revise', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('thinking:summarize', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
