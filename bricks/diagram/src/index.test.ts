// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { diagAscii, diagDot, diagMermaid } from './operations.ts';

// ─── diagMermaid ─────────────────────────────────────────────────────────────

describe('diagMermaid — flowchart', () => {
    it('generates a basic flowchart with nodes and edges', () => {
        const result = diagMermaid({
            type: 'flowchart',
            nodes: [
                { id: 'A', label: 'Start' },
                { id: 'B', label: 'End' },
            ],
            edges: [{ from: 'A', to: 'B', label: 'go' }],
        });

        expect(result.type).toBe('flowchart');
        expect(result.diagram).toContain('flowchart TB');
        expect(result.diagram).toContain('A[Start]');
        expect(result.diagram).toContain('B[End]');
        expect(result.diagram).toContain('A --> |go| B');
    });

    it('respects custom direction', () => {
        const result = diagMermaid({
            type: 'flowchart',
            nodes: [{ id: 'X' }],
            edges: [],
            direction: 'LR',
        });

        expect(result.diagram).toContain('flowchart LR');
    });

    it('uses id as label when label is absent', () => {
        const result = diagMermaid({
            type: 'flowchart',
            nodes: [{ id: 'MyNode' }],
            edges: [],
        });

        expect(result.diagram).toContain('MyNode[MyNode]');
    });

    it('omits edge label when not provided', () => {
        const result = diagMermaid({
            type: 'flowchart',
            nodes: [{ id: 'A' }, { id: 'B' }],
            edges: [{ from: 'A', to: 'B' }],
        });

        expect(result.diagram).toContain('A --> B');
    });
});

describe('diagMermaid — sequence', () => {
    it('generates a sequence diagram with participants and messages', () => {
        const result = diagMermaid({
            type: 'sequence',
            nodes: [
                { id: 'Alice', label: 'Alice' },
                { id: 'Bob', label: 'Bob' },
            ],
            edges: [{ from: 'Alice', to: 'Bob', label: 'Hello' }],
        });

        expect(result.type).toBe('sequence');
        expect(result.diagram).toContain('sequenceDiagram');
        expect(result.diagram).toContain('participant Alice as Alice');
        expect(result.diagram).toContain('participant Bob as Bob');
        expect(result.diagram).toContain('Alice->>+Bob: Hello');
    });
});

describe('diagMermaid — classDiagram', () => {
    it('generates a class diagram', () => {
        const result = diagMermaid({
            type: 'classDiagram',
            nodes: [{ id: 'Animal' }, { id: 'Dog' }],
            edges: [{ from: 'Dog', to: 'Animal', label: 'extends' }],
        });

        expect(result.diagram).toContain('classDiagram');
        expect(result.diagram).toContain('class Animal {');
        expect(result.diagram).toContain('class Dog {');
        expect(result.diagram).toContain('Dog --> Animal : extends');
    });
});

describe('diagMermaid — graph', () => {
    it('generates a graph diagram', () => {
        const result = diagMermaid({
            type: 'graph',
            nodes: [{ id: 'A' }, { id: 'B' }],
            edges: [{ from: 'A', to: 'B' }],
            direction: 'LR',
        });

        expect(result.diagram).toContain('graph LR');
        expect(result.diagram).toContain('A[A]');
        expect(result.diagram).toContain('B[B]');
    });
});

// ─── diagDot ─────────────────────────────────────────────────────────────────

describe('diagDot — directed', () => {
    it('generates a directed DOT graph', () => {
        const result = diagDot({
            nodes: [
                { id: 'A', label: 'Node A' },
                { id: 'B', label: 'Node B', shape: 'box' },
            ],
            edges: [{ from: 'A', to: 'B', label: 'link' }],
            directed: true,
        });

        expect(result.directed).toBe(true);
        expect(result.diagram).toContain('digraph G {');
        expect(result.diagram).toContain('"A" [label="Node A"];');
        expect(result.diagram).toContain('"B" [label="Node B" shape=box];');
        expect(result.diagram).toContain('"A" -> "B" [label="link"];');
        expect(result.diagram).toContain('}');
    });

    it('defaults to directed when directed is omitted', () => {
        const result = diagDot({
            nodes: [{ id: 'X' }],
            edges: [],
        });

        expect(result.directed).toBe(true);
        expect(result.diagram).toContain('digraph G {');
    });
});

describe('diagDot — undirected', () => {
    it('generates an undirected DOT graph', () => {
        const result = diagDot({
            nodes: [{ id: 'A' }, { id: 'B' }],
            edges: [{ from: 'A', to: 'B' }],
            directed: false,
        });

        expect(result.directed).toBe(false);
        expect(result.diagram).toContain('graph G {');
        expect(result.diagram).toContain('"A" -- "B";');
    });

    it('omits edge label attribute when edge has no label', () => {
        const result = diagDot({
            nodes: [{ id: 'A' }, { id: 'B' }],
            edges: [{ from: 'A', to: 'B' }],
            directed: true,
        });

        // Edge line should not carry a label attribute
        const edgeLine = result.diagram.split('\n').find((l) => l.includes('->'));
        expect(edgeLine).toBeDefined();
        expect(edgeLine).not.toContain('[label=');
    });
});

describe('diagDot — node attributes', () => {
    it('omits shape attribute when not provided', () => {
        const result = diagDot({
            nodes: [{ id: 'A', label: 'Alpha' }],
            edges: [],
        });

        expect(result.diagram).toContain('"A" [label="Alpha"];');
        expect(result.diagram).not.toContain('shape=');
    });

    it('uses id as label when label is absent', () => {
        const result = diagDot({
            nodes: [{ id: 'MyNode' }],
            edges: [],
        });

        expect(result.diagram).toContain('"MyNode" [label="MyNode"];');
    });
});

// ─── diagAscii ───────────────────────────────────────────────────────────────

describe('diagAscii — chain', () => {
    it('renders a vertical chain for linear graphs', () => {
        const result = diagAscii({
            nodes: [
                { id: 'A', label: 'Start' },
                { id: 'B', label: 'Middle' },
                { id: 'C', label: 'End' },
            ],
            edges: [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
            ],
        });

        expect(result.diagram).toContain('Start');
        expect(result.diagram).toContain('Middle');
        expect(result.diagram).toContain('End');
        expect(result.diagram).toContain('▼');
        expect(result.diagram).toContain('┌');
        expect(result.diagram).toContain('└');
    });

    it('includes edge label in chain', () => {
        const result = diagAscii({
            nodes: [{ id: 'A' }, { id: 'B' }],
            edges: [{ from: 'A', to: 'B', label: 'step' }],
        });

        expect(result.diagram).toContain('step');
    });
});

describe('diagAscii — fallback', () => {
    it('renders boxes and edge list for non-chain graphs', () => {
        const result = diagAscii({
            nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
            edges: [
                { from: 'A', to: 'B' },
                { from: 'A', to: 'C' },
            ],
        });

        expect(result.diagram).toContain('A');
        expect(result.diagram).toContain('B');
        expect(result.diagram).toContain('C');
        expect(result.diagram).toContain('Edges:');
        expect(result.diagram).toContain('A --> B');
        expect(result.diagram).toContain('A --> C');
    });

    it('renders nodes without edges', () => {
        const result = diagAscii({
            nodes: [{ id: 'Solo', label: 'Alone' }],
            edges: [],
        });

        expect(result.diagram).toContain('Alone');
        expect(result.diagram).not.toContain('Edges:');
    });
});

// ─── diagram brick ───────────────────────────────────────────────────────────

describe('diagram brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('diagram:mermaid', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('diagram:dot', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('diagram:ascii', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes the correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('diagram');
        expect(brick.manifest.prefix).toBe('diag');
    });
});
