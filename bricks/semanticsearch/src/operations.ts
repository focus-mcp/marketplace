// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CorpusDoc {
    readonly id: string;
    readonly text: string;
}

export interface IntentDef {
    readonly label: string;
    readonly examples: readonly string[];
}

export interface SemSearchInput {
    readonly corpus: readonly CorpusDoc[];
    readonly query: string;
    readonly limit?: number;
}

export interface SearchResult {
    id: string;
    score: number;
}

export interface SemSearchOutput {
    results: SearchResult[];
}

export interface SemSimilarInput {
    readonly corpus: readonly CorpusDoc[];
    readonly targetId: string;
    readonly limit?: number;
}

export interface SemSimilarOutput {
    results: SearchResult[];
}

export interface SemIntentInput {
    readonly query: string;
    readonly intents: readonly IntentDef[];
}

export interface IntentScore {
    label: string;
    score: number;
}

export interface SemIntentOutput {
    bestIntent: string;
    scores: IntentScore[];
}

export interface SemEmbeddingsInput {
    readonly texts: readonly string[];
}

export interface EmbeddingEntry {
    text: string;
    vector: Record<string, number>;
    dimensions: number;
}

export interface SemEmbeddingsOutput {
    embeddings: EmbeddingEntry[];
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 2);
}

// ─── TF-IDF ──────────────────────────────────────────────────────────────────

type TfVector = Map<string, number>;

function termFrequency(tokens: string[]): TfVector {
    const counts = new Map<string, number>();
    for (const t of tokens) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const tf: TfVector = new Map();
    for (const [term, count] of counts) {
        tf.set(term, count / tokens.length);
    }
    return tf;
}

function buildIdf(docs: readonly string[][]): Map<string, number> {
    const N = docs.length;
    const docFreq = new Map<string, number>();
    for (const tokens of docs) {
        const seen = new Set(tokens);
        for (const t of seen) {
            docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
        }
    }
    const idf = new Map<string, number>();
    for (const [term, df] of docFreq) {
        idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }
    return idf;
}

function tfidfVector(tf: TfVector, idf: Map<string, number>): TfVector {
    const vec: TfVector = new Map();
    for (const [term, tfVal] of tf) {
        const idfVal = idf.get(term) ?? Math.log(2) + 1;
        vec.set(term, tfVal * idfVal);
    }
    return vec;
}

// ─── Cosine similarity ───────────────────────────────────────────────────────

function cosineSimilarity(a: TfVector, b: TfVector): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const [term, va] of a) {
        normA += va * va;
        const vb = b.get(term);
        if (vb !== undefined) dot += va * vb;
    }
    for (const [, vb] of b) {
        normB += vb * vb;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Vector averaging ────────────────────────────────────────────────────────

function averageVectors(vectors: TfVector[]): TfVector {
    if (vectors.length === 0) return new Map();
    const sum = new Map<string, number>();
    for (const vec of vectors) {
        for (const [term, val] of vec) {
            sum.set(term, (sum.get(term) ?? 0) + val);
        }
    }
    const avg: TfVector = new Map();
    for (const [term, total] of sum) {
        avg.set(term, total / vectors.length);
    }
    return avg;
}

// ─── semSearch ───────────────────────────────────────────────────────────────

export function semSearch(input: SemSearchInput): SemSearchOutput {
    const limit = input.limit ?? 5;
    const allTexts = [...input.corpus.map((d) => d.text), input.query];
    const allTokens = allTexts.map(tokenize);
    const idf = buildIdf(allTokens);

    const corpusVectors = input.corpus.map((_doc, i) =>
        tfidfVector(termFrequency(allTokens[i] ?? []), idf),
    );
    const queryTokens = allTokens[allTokens.length - 1] ?? [];
    const queryVec = tfidfVector(termFrequency(queryTokens), idf);

    const scored: SearchResult[] = input.corpus.map((doc, i) => ({
        id: doc.id,
        score: cosineSimilarity(queryVec, corpusVectors[i] ?? new Map()),
    }));

    scored.sort((a, b) => b.score - a.score);
    return { results: scored.slice(0, limit) };
}

// ─── semSimilar ──────────────────────────────────────────────────────────────

export function semSimilar(input: SemSimilarInput): SemSimilarOutput {
    const limit = input.limit ?? 5;
    const target = input.corpus.find((d) => d.id === input.targetId);
    if (!target) return { results: [] };

    const allTokens = input.corpus.map((d) => tokenize(d.text));
    const idf = buildIdf(allTokens);

    const vectors = input.corpus.map((_doc, i) =>
        tfidfVector(termFrequency(allTokens[i] ?? []), idf),
    );

    const targetIdx = input.corpus.findIndex((d) => d.id === input.targetId);
    const targetVec = vectors[targetIdx] ?? new Map();

    const scored: SearchResult[] = input.corpus
        .map((doc, i) => ({
            id: doc.id,
            score: i === targetIdx ? -1 : cosineSimilarity(targetVec, vectors[i] ?? new Map()),
        }))
        .filter((r) => r.score >= 0);

    scored.sort((a, b) => b.score - a.score);
    return { results: scored.slice(0, limit) };
}

// ─── semIntent ───────────────────────────────────────────────────────────────

export function semIntent(input: SemIntentInput): SemIntentOutput {
    const allTexts = [input.query, ...input.intents.flatMap((intent) => intent.examples)];
    const allTokens = allTexts.map(tokenize);
    const idf = buildIdf(allTokens);

    const queryVec = tfidfVector(termFrequency(allTokens[0] ?? []), idf);

    let offset = 1;
    const scores: IntentScore[] = input.intents.map((intent) => {
        const exampleVecs: TfVector[] = intent.examples.map((_, j) =>
            tfidfVector(termFrequency(allTokens[offset + j] ?? []), idf),
        );
        offset += intent.examples.length;
        const centroid = averageVectors(exampleVecs);
        return { label: intent.label, score: cosineSimilarity(queryVec, centroid) };
    });

    scores.sort((a, b) => b.score - a.score);
    const bestIntent = scores[0]?.label ?? '';
    return { bestIntent, scores };
}

// ─── semEmbeddings ───────────────────────────────────────────────────────────

export function semEmbeddings(input: SemEmbeddingsInput): SemEmbeddingsOutput {
    const allTokens = input.texts.map(tokenize);
    const idf = buildIdf(allTokens);

    const embeddings: EmbeddingEntry[] = input.texts.map((text, i) => {
        const tf = termFrequency(allTokens[i] ?? []);
        const vec = tfidfVector(tf, idf);
        const vector: Record<string, number> = {};
        for (const [term, val] of vec) {
            vector[term] = val;
        }
        return {
            text: text.length > 80 ? `${text.slice(0, 77)}...` : text,
            vector,
            dimensions: vec.size,
        };
    });

    return { embeddings };
}
