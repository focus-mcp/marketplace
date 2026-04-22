// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { semEmbeddings, semIntent, semSearch, semSimilar } from './operations.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const corpus = [
    {
        id: 'doc1',
        text: 'TypeScript is a strongly typed programming language that builds on JavaScript',
    },
    { id: 'doc2', text: 'Python is a popular language for data science and machine learning' },
    { id: 'doc3', text: 'React is a JavaScript library for building user interfaces' },
    { id: 'doc4', text: 'Node.js is a runtime for executing JavaScript on the server side' },
    { id: 'doc5', text: 'Machine learning algorithms learn patterns from training data' },
];

// ─── semSearch ───────────────────────────────────────────────────────────────

describe('semSearch', () => {
    it('returns results ranked by relevance', () => {
        const result = semSearch({ corpus, query: 'JavaScript programming language' });
        expect(result.results.length).toBeGreaterThan(0);
        // doc1 and doc3 and doc4 are most relevant to JavaScript
        const topIds = result.results.slice(0, 3).map((r) => r.id);
        const jsRelated = topIds.filter((id) => ['doc1', 'doc3', 'doc4'].includes(id));
        expect(jsRelated.length).toBeGreaterThanOrEqual(2);
    });

    it('scores are between 0 and 1', () => {
        const result = semSearch({ corpus, query: 'machine learning' });
        for (const r of result.results) {
            expect(r.score).toBeGreaterThanOrEqual(0);
            expect(r.score).toBeLessThanOrEqual(1);
        }
    });

    it('respects limit parameter', () => {
        const result = semSearch({ corpus, query: 'language', limit: 2 });
        expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('defaults to limit 5', () => {
        const result = semSearch({ corpus, query: 'programming' });
        expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('returns most relevant document first for specific query', () => {
        const result = semSearch({ corpus, query: 'machine learning data science' });
        // doc2 and doc5 are about ML; one of them should be top result
        const topId = result.results[0]?.id;
        expect(['doc2', 'doc5']).toContain(topId);
    });

    it('handles single-document corpus', () => {
        const result = semSearch({
            corpus: [{ id: 'only', text: 'hello world' }],
            query: 'hello',
        });
        expect(result.results).toHaveLength(1);
        expect(result.results[0]?.id).toBe('only');
    });

    it('returns empty results for empty corpus', () => {
        const result = semSearch({ corpus: [], query: 'anything' });
        expect(result.results).toHaveLength(0);
    });
});

// ─── semSimilar ──────────────────────────────────────────────────────────────

describe('semSimilar', () => {
    it('excludes target document from results', () => {
        const result = semSimilar({ corpus, targetId: 'doc1' });
        const ids = result.results.map((r) => r.id);
        expect(ids).not.toContain('doc1');
    });

    it('returns documents similar to a JS doc near other JS docs', () => {
        const result = semSimilar({ corpus, targetId: 'doc1', limit: 3 });
        // doc3 and doc4 share JavaScript with doc1
        const topIds = result.results.slice(0, 3).map((r) => r.id);
        const jsRelated = topIds.filter((id) => ['doc3', 'doc4'].includes(id));
        expect(jsRelated.length).toBeGreaterThanOrEqual(1);
    });

    it('respects limit parameter', () => {
        const result = semSimilar({ corpus, targetId: 'doc2', limit: 2 });
        expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('returns empty results for unknown targetId', () => {
        const result = semSimilar({ corpus, targetId: 'nonexistent' });
        expect(result.results).toHaveLength(0);
    });

    it('scores are non-negative', () => {
        const result = semSimilar({ corpus, targetId: 'doc3' });
        for (const r of result.results) {
            expect(r.score).toBeGreaterThanOrEqual(0);
        }
    });
});

// ─── semIntent ───────────────────────────────────────────────────────────────

describe('semIntent', () => {
    const intents = [
        {
            label: 'greeting',
            examples: ['hello there', 'hi how are you', 'good morning', 'hey what is up'],
        },
        {
            label: 'farewell',
            examples: ['goodbye see you', 'bye take care', 'farewell until next time'],
        },
        {
            label: 'help',
            examples: ['I need help please', 'can you assist me', 'I have a problem to solve'],
        },
    ];

    it('classifies greeting query correctly', () => {
        const result = semIntent({ query: 'hello how are you doing', intents });
        expect(result.bestIntent).toBe('greeting');
    });

    it('classifies farewell query correctly', () => {
        const result = semIntent({ query: 'goodbye see you later', intents });
        expect(result.bestIntent).toBe('farewell');
    });

    it('classifies help query correctly', () => {
        const result = semIntent({ query: 'I need some assistance with my problem', intents });
        expect(result.bestIntent).toBe('help');
    });

    it('returns scores for all intents', () => {
        const result = semIntent({ query: 'hello', intents });
        expect(result.scores).toHaveLength(intents.length);
        for (const s of result.scores) {
            expect(typeof s.label).toBe('string');
            expect(typeof s.score).toBe('number');
        }
    });

    it('scores are sorted descending', () => {
        const result = semIntent({ query: 'hello friend', intents });
        for (let i = 1; i < result.scores.length; i++) {
            expect(result.scores[i - 1]?.score).toBeGreaterThanOrEqual(
                result.scores[i]?.score ?? 0,
            );
        }
    });

    it('bestIntent matches first score label', () => {
        const result = semIntent({ query: 'bye', intents });
        expect(result.bestIntent).toBe(result.scores[0]?.label);
    });
});

// ─── semEmbeddings ───────────────────────────────────────────────────────────

describe('semEmbeddings', () => {
    it('returns one embedding per input text', () => {
        const texts = ['hello world', 'machine learning', 'TypeScript programming'];
        const result = semEmbeddings({ texts });
        expect(result.embeddings).toHaveLength(3);
    });

    it('each embedding has vector and dimensions', () => {
        const result = semEmbeddings({ texts: ['hello world foo bar'] });
        const emb = result.embeddings[0];
        expect(emb).toBeDefined();
        expect(typeof emb?.dimensions).toBe('number');
        expect(emb?.dimensions).toBeGreaterThan(0);
        expect(typeof emb?.vector).toBe('object');
        expect(Object.keys(emb?.vector ?? {}).length).toBe(emb?.dimensions);
    });

    it('vector values are positive numbers (TF-IDF > 0)', () => {
        const result = semEmbeddings({ texts: ['hello world'] });
        const vec = result.embeddings[0]?.vector ?? {};
        for (const val of Object.values(vec)) {
            expect(val).toBeGreaterThan(0);
        }
    });

    it('truncates long text in output', () => {
        const longText = 'word '.repeat(50);
        const result = semEmbeddings({ texts: [longText] });
        expect(result.embeddings[0]?.text.length).toBeLessThanOrEqual(83); // 80 + '...'
    });

    it('short text is not truncated', () => {
        const short = 'hello world';
        const result = semEmbeddings({ texts: [short] });
        expect(result.embeddings[0]?.text).toBe(short);
    });

    it('returns empty array for empty input', () => {
        const result = semEmbeddings({ texts: [] });
        expect(result.embeddings).toHaveLength(0);
    });

    it('different texts produce different vectors', () => {
        const result = semEmbeddings({
            texts: ['apple fruit juice', 'typescript javascript code'],
        });
        const v1 = result.embeddings[0]?.vector ?? {};
        const v2 = result.embeddings[1]?.vector ?? {};
        // They should not have identical keys
        const keys1 = new Set(Object.keys(v1));
        const keys2 = new Set(Object.keys(v2));
        const intersection = [...keys1].filter((k) => keys2.has(k));
        // Some overlap possible but not identical sets for very different texts
        expect(keys1.size + keys2.size - intersection.length).toBeGreaterThan(intersection.length);
    });
});

// ─── brick registration ──────────────────────────────────────────────────────

describe('semanticsearch brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('semanticsearch:search', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('semanticsearch:similar', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('semanticsearch:intent', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('semanticsearch:embeddings', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('has correct manifest', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('semanticsearch');
        expect(brick.manifest.prefix).toBe('sem');
        expect(brick.manifest.tools).toHaveLength(4);
    });
});
