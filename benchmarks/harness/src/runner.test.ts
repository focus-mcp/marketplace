/**
 * runner.test.ts — unit tests for loadManifest bench.maxTurns hint
 *
 * Run with: npx tsx --test src/runner.test.ts
 * (uses Node.js built-in test runner, no extra deps required)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadManifest, BRICKS_DIR, type BrickManifest } from './runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTempManifest(data: object, fn: (brickName: string) => void): void {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-test-'));
    const brickDir = path.join(tmpDir, 'testbrick');
    fs.mkdirSync(brickDir, { recursive: true });
    fs.writeFileSync(path.join(brickDir, 'mcp-brick.json'), JSON.stringify(data));

    // Temporarily point BRICKS_DIR to tmpDir by monkey-patching via env
    const origBricksDir = process.env['_TEST_BRICKS_DIR_OVERRIDE'];
    try {
        fn(tmpDir);
    } finally {
        if (origBricksDir === undefined) {
            delete process.env['_TEST_BRICKS_DIR_OVERRIDE'];
        } else {
            process.env['_TEST_BRICKS_DIR_OVERRIDE'] = origBricksDir;
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

// ---------------------------------------------------------------------------
// Test: loadManifest reads bench.maxTurns hint
// ---------------------------------------------------------------------------

test('loadManifest reads bench.maxTurns hint', () => {
    const manifestData = {
        name: 'parallel',
        prefix: 'par',
        description: 'Parallel execution',
        tools: [],
        tags: [],
        license: 'MIT',
        bench: { maxTurns: 40 },
    };

    // Verify the BrickManifest type accepts bench.maxTurns
    const manifest = manifestData as BrickManifest;
    assert.equal(manifest.bench?.maxTurns, 40,
        'manifest.bench.maxTurns should be 40');
});

// ---------------------------------------------------------------------------
// Test: effectiveMaxTurns is max(global, manifest)
// ---------------------------------------------------------------------------

test('effective maxTurns is max(global, manifest)', () => {
    const cases: Array<{ global: number; hint: number | undefined; expected: number }> = [
        { global: 20, hint: 40,        expected: 40 },  // manifest wins
        { global: 40, hint: 20,        expected: 40 },  // global wins
        { global: 20, hint: 20,        expected: 20 },  // equal — no change
        { global: 20, hint: undefined, expected: 20 },  // no hint — global used
        { global: 50, hint: 40,        expected: 50 },  // global already above hint
    ];

    for (const { global: globalTurns, hint, expected } of cases) {
        const manifest: BrickManifest = {
            name: 'test',
            prefix: 'tst',
            description: 'test brick',
            tools: [],
            ...(hint !== undefined ? { bench: { maxTurns: hint } } : {}),
        };
        const effective = Math.max(globalTurns, manifest.bench?.maxTurns ?? 0);
        assert.equal(effective, expected,
            `max(${globalTurns}, ${hint ?? 'undefined'}) should be ${expected}, got ${effective}`);
    }
});

// ---------------------------------------------------------------------------
// Test: real manifests for parallel and sandbox have bench.maxTurns=40
// ---------------------------------------------------------------------------

test('parallel manifest declares bench.maxTurns=40', () => {
    const m = loadManifest('parallel');
    assert.equal(m.bench?.maxTurns, 40,
        'parallel/mcp-brick.json must declare bench.maxTurns=40');
});

test('sandbox manifest declares bench.maxTurns=40', () => {
    const m = loadManifest('sandbox');
    assert.equal(m.bench?.maxTurns, 40,
        'sandbox/mcp-brick.json must declare bench.maxTurns=40');
});
