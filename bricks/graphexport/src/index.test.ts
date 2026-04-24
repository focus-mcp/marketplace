// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    geCypher,
    geGraphml,
    geHtml,
    geInput,
    geMermaid,
    geObsidian,
    geWiki,
    resetGraph,
    setGraph,
} from './operations.ts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleNodes = [
    { id: 'n1', label: 'Alpha', type: 'File' },
    { id: 'n2', label: 'Beta', type: 'Function' },
    { id: 'n3', label: 'Gamma', type: 'Class' },
];

const sampleEdges = [
    { from: 'n1', to: 'n2', type: 'imports' },
    { from: 'n2', to: 'n3', type: 'calls' },
];

const inlineGraph = {
    nodes: [
        { id: 'a', label: 'NodeA', type: 'Module' },
        { id: 'b', label: 'NodeB', type: 'Module' },
    ],
    edges: [{ from: 'a', to: 'b', type: 'uses' }],
};

beforeEach(() => {
    setGraph(sampleNodes, sampleEdges);
});

afterEach(() => {
    resetGraph();
});

// ─── setGraph / resetGraph ────────────────────────────────────────────────────

describe('setGraph / resetGraph', () => {
    it('populates nodes and edges', async () => {
        const { nodes, edges } = await import('./operations.ts');
        expect(nodes.size).toBe(3);
        expect(edges.length).toBe(2);
    });

    it('resets state cleanly', async () => {
        resetGraph();
        const { nodes, edges } = await import('./operations.ts');
        expect(nodes.size).toBe(0);
        expect(edges.length).toBe(0);
        // Restore for subsequent tests
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geInput ─────────────────────────────────────────────────────────────────

describe('geInput', () => {
    it('loads an inline graph into ambient state', async () => {
        const result = geInput({ graph: inlineGraph });
        expect(result.loaded).toBe(true);
        expect(result.nodeCount).toBe(2);
        expect(result.edgeCount).toBe(1);

        const { nodes, edges } = await import('./operations.ts');
        expect(nodes.size).toBe(2);
        expect(edges.length).toBe(1);

        // Restore
        setGraph(sampleNodes, sampleEdges);
    });

    it('replaces previous graph state', async () => {
        // State has 3 nodes from beforeEach
        geInput({ graph: inlineGraph });
        const { nodes } = await import('./operations.ts');
        expect(nodes.size).toBe(2);
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geMermaid with inline graph (standalone use) ────────────────────────────

describe('geMermaid — inline graph param', () => {
    it('returns a Mermaid block with the provided nodes and edges', () => {
        // Reset ambient state so this test is truly standalone
        resetGraph();
        const md = geMermaid({ graph: inlineGraph });
        expect(md.startsWith('flowchart TB')).toBe(true);
        expect(md).toContain('NodeA');
        expect(md).toContain('NodeB');
        expect(md).toContain('-->|uses|');
        setGraph(sampleNodes, sampleEdges);
    });

    it('overrides ambient graph when graph param is provided', () => {
        // Ambient state has 3 nodes; inline graph has 2
        const md = geMermaid({ graph: inlineGraph });
        expect(md).toContain('NodeA');
        expect(md).not.toContain('Alpha');
    });

    it('falls back to ambient graph when no graph param', () => {
        const md = geMermaid({});
        expect(md).toContain('Alpha');
    });
});

// ─── geHtml ──────────────────────────────────────────────────────────────────

describe('geHtml', () => {
    it('produces valid HTML skeleton', () => {
        const html = geHtml({});
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<svg');
        expect(html).toContain('Knowledge Graph');
    });

    it('uses provided title', () => {
        const html = geHtml({ title: 'My Custom Graph' });
        expect(html).toContain('My Custom Graph');
    });

    it('includes SVG circles for all nodes', () => {
        const html = geHtml({});
        expect(html).toContain('Alpha');
        expect(html).toContain('Beta');
        expect(html).toContain('Gamma');
    });

    it('includes SVG lines for edges', () => {
        const html = geHtml({});
        expect(html).toContain('<line');
    });

    it('handles empty graph', () => {
        resetGraph();
        const html = geHtml({});
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).not.toContain('<circle');
        setGraph(sampleNodes, sampleEdges);
    });

    it('uses inline graph when provided', () => {
        resetGraph();
        const html = geHtml({ graph: inlineGraph });
        expect(html).toContain('NodeA');
        expect(html).toContain('NodeB');
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geMermaid ────────────────────────────────────────────────────────────────

describe('geMermaid', () => {
    it('starts with flowchart TB by default', () => {
        const md = geMermaid({});
        expect(md.startsWith('flowchart TB')).toBe(true);
    });

    it('respects direction parameter', () => {
        const md = geMermaid({ direction: 'LR' });
        expect(md.startsWith('flowchart LR')).toBe(true);
    });

    it('falls back to TB for invalid direction', () => {
        const md = geMermaid({ direction: 'XY' });
        expect(md.startsWith('flowchart TB')).toBe(true);
    });

    it('includes node definitions', () => {
        const md = geMermaid({});
        expect(md).toContain('Alpha');
        expect(md).toContain('Beta');
    });

    it('includes edge arrows with label', () => {
        const md = geMermaid({});
        expect(md).toContain('-->|imports|');
        expect(md).toContain('-->|calls|');
    });

    it('sanitizes node IDs with special chars', () => {
        setGraph([{ id: 'a/b', label: 'A-B', type: 'X' }], []);
        const md = geMermaid({});
        expect(md).toContain('a_b');
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geGraphml ────────────────────────────────────────────────────────────────

describe('geGraphml', () => {
    it('produces valid XML structure', () => {
        const xml = geGraphml();
        expect(xml).toContain('<?xml version="1.0"');
        expect(xml).toContain('<graphml');
        expect(xml).toContain('</graphml>');
    });

    it('includes node elements', () => {
        const xml = geGraphml();
        expect(xml).toContain('<node id="n1"');
        expect(xml).toContain('<node id="n2"');
    });

    it('includes edge elements', () => {
        const xml = geGraphml();
        expect(xml).toContain('source="n1" target="n2"');
    });

    it('escapes XML special characters', () => {
        setGraph([{ id: 'a&b', label: '<Test>', type: 'X' }], []);
        const xml = geGraphml();
        expect(xml).toContain('a&amp;b');
        expect(xml).toContain('&lt;Test&gt;');
        setGraph(sampleNodes, sampleEdges);
    });

    it('uses inline graph when provided', () => {
        resetGraph();
        const xml = geGraphml({ graph: inlineGraph });
        expect(xml).toContain('NodeA');
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geCypher ────────────────────────────────────────────────────────────────

describe('geCypher', () => {
    it('generates CREATE statements for nodes', () => {
        const cypher = geCypher();
        expect(cypher).toContain("CREATE (n_n1:File {id: 'n1', label: 'Alpha'})");
        expect(cypher).toContain("CREATE (n_n2:Function {id: 'n2', label: 'Beta'})");
    });

    it('generates CREATE statements for relationships', () => {
        const cypher = geCypher();
        expect(cypher).toContain('(n_n1)-[:IMPORTS]->(n_n2)');
        expect(cypher).toContain('(n_n2)-[:CALLS]->(n_n3)');
    });

    it('handles empty graph', () => {
        resetGraph();
        const cypher = geCypher();
        expect(cypher.trim()).toBe('');
        setGraph(sampleNodes, sampleEdges);
    });

    it('uses inline graph when provided', () => {
        resetGraph();
        const cypher = geCypher({ graph: inlineGraph });
        expect(cypher).toContain('NodeA');
        expect(cypher).toContain('NodeB');
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geObsidian ───────────────────────────────────────────────────────────────

describe('geObsidian', () => {
    it('returns one file per node', () => {
        const files = geObsidian();
        expect(Object.keys(files).length).toBe(3);
    });

    it('uses label as filename', () => {
        const files = geObsidian();
        expect(files['Alpha.md']).toBeDefined();
        expect(files['Beta.md']).toBeDefined();
    });

    it('includes wikilinks to neighbors', () => {
        const files = geObsidian();
        expect(files['Alpha.md']).toContain('[[Beta]]');
    });

    it('includes type metadata', () => {
        const files = geObsidian();
        expect(files['Alpha.md']).toContain('Type: File');
    });

    it('shows no connections for isolated nodes', () => {
        setGraph([{ id: 'solo', label: 'Solo', type: 'X' }], []);
        const files = geObsidian();
        expect(files['Solo.md']).toContain('_No connections._');
        setGraph(sampleNodes, sampleEdges);
    });

    it('uses inline graph when provided', () => {
        resetGraph();
        const files = geObsidian({ graph: inlineGraph });
        expect(files['NodeA.md']).toBeDefined();
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── geWiki ──────────────────────────────────────────────────────────────────

describe('geWiki', () => {
    it('starts with Knowledge Graph heading', () => {
        const wiki = geWiki();
        expect(wiki.startsWith('# Knowledge Graph')).toBe(true);
    });

    it('includes sections for each node', () => {
        const wiki = geWiki();
        expect(wiki).toContain('## Alpha');
        expect(wiki).toContain('## Beta');
        expect(wiki).toContain('## Gamma');
    });

    it('lists outgoing connections', () => {
        const wiki = geWiki();
        expect(wiki).toContain('Beta');
        expect(wiki).toContain('imports');
    });

    it('lists incoming connections', () => {
        const wiki = geWiki();
        // Beta has incoming from Alpha
        const betaSection = wiki.split('## Beta')[1] ?? '';
        expect(betaSection).toContain('Alpha');
    });

    it('handles empty graph gracefully', () => {
        resetGraph();
        const wiki = geWiki();
        expect(wiki.trim()).toBe('# Knowledge Graph');
        setGraph(sampleNodes, sampleEdges);
    });

    it('uses inline graph when provided', () => {
        resetGraph();
        const wiki = geWiki({ graph: inlineGraph });
        expect(wiki).toContain('NodeA');
        expect(wiki).toContain('NodeB');
        setGraph(sampleNodes, sampleEdges);
    });
});

// ─── Brick lifecycle ──────────────────────────────────────────────────────────

describe('graphexport brick', () => {
    it('registers 7 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(7);
        expect(bus.handle).toHaveBeenCalledWith('graphexport:input', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:html', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:mermaid', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:graphml', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:cypher', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:obsidian', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('graphexport:wiki', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('has correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('graphexport');
        expect(brick.manifest.prefix).toBe('ge');
    });
});
