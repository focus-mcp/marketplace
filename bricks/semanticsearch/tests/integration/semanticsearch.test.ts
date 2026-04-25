/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkSemEmbeddingsHappy } from './scenarios/sem_embeddings/happy/invariants.js';
import { check as checkSemIntentHappy } from './scenarios/sem_intent/happy/invariants.js';
import { check as checkSemSearchHappy } from './scenarios/sem_search/happy/invariants.js';
import { check as checkSemSimilarHappy } from './scenarios/sem_similar/happy/invariants.js';

const CORPUS = [
    {
        id: 'doc-auth',
        text: 'User authentication login password security credentials JWT token',
    },
    { id: 'doc-db', text: 'Database SQL query table schema migration index performance' },
    { id: 'doc-ui', text: 'React component render JSX props state hooks UI interface' },
    { id: 'doc-api', text: 'REST API endpoint HTTP request response status JSON' },
];

describe('sem_search integration', () => {
    it('happy: corpus + query → sorted results, doc-auth ranks first for "authentication login"', async () => {
        const output = await runTool(brick, 'search', {
            corpus: CORPUS,
            query: 'authentication login',
            limit: 4,
        });
        for (const i of checkSemSearchHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('sem_similar integration', () => {
    it('happy: corpus + targetId → similar docs list excludes target', async () => {
        const corpusWithSimilar = [
            {
                id: 'doc-auth',
                text: 'User authentication login password security credentials JWT token',
            },
            { id: 'doc-db', text: 'Database SQL query table schema migration index performance' },
            { id: 'doc-ui', text: 'React component render JSX props state hooks UI interface' },
            {
                id: 'doc-api',
                text: 'API security endpoint authentication token authorization bearer',
            },
        ];
        const output = await runTool(brick, 'similar', {
            corpus: corpusWithSimilar,
            targetId: 'doc-auth',
            limit: 3,
        });
        for (const i of checkSemSimilarHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('sem_intent integration', () => {
    it('happy: query + 3 intents → bestIntent = login_help', async () => {
        const output = await runTool(brick, 'intent', {
            query: 'how do I log in to my account',
            intents: [
                {
                    label: 'login_help',
                    examples: [
                        'I cannot log in to my account',
                        'how to sign in',
                        'login not working password reset',
                    ],
                },
                {
                    label: 'billing_inquiry',
                    examples: [
                        'how much does the plan cost',
                        'invoice payment subscription',
                        'refund request',
                    ],
                },
                {
                    label: 'technical_support',
                    examples: [
                        'app is crashing bug error',
                        'feature not working broken',
                        'server down outage',
                    ],
                },
            ],
        });
        for (const i of checkSemIntentHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('sem_embeddings integration', () => {
    it('happy: 3 texts → 3 embeddings with vector shape (Record<string, number>)', async () => {
        const output = await runTool(brick, 'embeddings', {
            texts: [
                'machine learning neural network deep learning model',
                'web development JavaScript TypeScript frontend backend',
                'database SQL NoSQL query performance optimization',
            ],
        });
        for (const i of checkSemEmbeddingsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
