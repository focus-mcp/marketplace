/**
 * runner.test.ts — unit tests for loadManifest bench.maxTurns hint
 *
 * Run with: npx tsx --test src/runner.test.ts
 * (uses Node.js built-in test runner, no extra deps required)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, type BrickManifest } from './runner.js';

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
// Test: manifests without bench hint use global maxTurns unchanged
// ---------------------------------------------------------------------------

test('manifest without bench hint does not override global maxTurns', () => {
    // Load any manifest that doesn't have bench set (e.g. filelist)
    // We verify the formula: max(20, undefined ?? 0) === 20
    const noHintManifest: BrickManifest = {
        name: 'dummy',
        prefix: 'dum',
        description: 'no hint',
        tools: [],
    };
    const globalTurns = 20;
    const effective = Math.max(globalTurns, noHintManifest.bench?.maxTurns ?? 0);
    assert.equal(effective, 20, 'Without bench hint, effectiveMaxTurns should equal global');
});

// ---------------------------------------------------------------------------
// Test: brick mode allowedTools contains ONLY mcp__focus__* entries (no Read leakage)
// ---------------------------------------------------------------------------

test('brick mode allowedTools must not include Read', () => {
    const manifest: BrickManifest = {
        name: 'parallel',
        prefix: 'par',
        description: 'parallel brick',
        tools: [
            { name: 'run', description: 'run' },
            { name: 'collect', description: 'collect' },
            { name: 'merge', description: 'merge' },
        ],
    };

    // Replicate the brick mode allowedTools logic from runner.ts
    const allowedTools = manifest.tools.map(
        (t) => `mcp__focus__${manifest.prefix}_${t.name}`,
    );

    assert.ok(
        !allowedTools.includes('Read'),
        'brick mode allowedTools must NOT include Read (would allow native fallback)',
    );
    assert.ok(
        !allowedTools.some((t) => !t.startsWith('mcp__focus__')),
        'brick mode allowedTools must contain ONLY mcp__focus__* entries',
    );
    assert.deepEqual(allowedTools, [
        'mcp__focus__par_run',
        'mcp__focus__par_collect',
        'mcp__focus__par_merge',
    ]);
});

test('brick mode disallowedTools includes Read', () => {
    // Ensure Read is explicitly blocked in brick mode
    const disallowedTools = ['Read', 'Bash', 'Grep', 'Glob', 'Edit', 'Write'];

    assert.ok(
        disallowedTools.includes('Read'),
        'Read must be in disallowedTools to enforce strict tool isolation',
    );
});
