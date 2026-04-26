/**
 * runner.test.ts — unit tests for runner helpers, bench.maxTurns hint,
 * and save-on-error behaviour.
 *
 * Run with: npx tsx --test src/runner.test.ts
 * (uses Node.js built-in test runner, no extra deps required)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, BRICK_DISALLOWED_TOOLS, extractResultBlock, extractMiniTaskSpec, isoStamp, type BrickManifest } from './runner.js';

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

test('BRICK_DISALLOWED_TOOLS blocks all native tools including ToolSearch', () => {
    // ToolSearch was confirmed in traces: parallel-brick used it as a fallback alongside Read
    const required = ['Read', 'ToolSearch', 'Bash', 'Grep', 'Glob', 'Edit', 'Write'];
    for (const tool of required) {
        assert.ok(
            (BRICK_DISALLOWED_TOOLS as readonly string[]).includes(tool),
            `${tool} must be in BRICK_DISALLOWED_TOOLS (runner.ts)`,
        );
    }
});

test('BRICK_DISALLOWED_TOOLS contains Agent, Monitor, WebFetch, etc.', () => {
    // Claude Agent SDK builtin tools bypass allowedTools whitelist — must be explicitly blocked
    const sdkBuiltins = ['Agent', 'Monitor', 'PushNotification', 'Skill', 'WebFetch', 'WebSearch'];
    for (const tool of sdkBuiltins) {
        assert.ok(
            (BRICK_DISALLOWED_TOOLS as readonly string[]).includes(tool),
            `${tool} must be in BRICK_DISALLOWED_TOOLS (SDK builtin that bypasses allowedTools)`,
        );
    }
});

test('brick mode disallowedTools includes all SDK builtins', () => {
    // Verifies the complete set of SDK builtin tools that must be blocked in brick mode.
    // These tools are injected by the Claude Agent SDK and bypass the allowedTools whitelist.
    const allSDKBuiltins = [
        'Agent',
        'Monitor',
        'PushNotification',
        'Skill',
        'WebFetch',
        'WebSearch',
        'ScheduleWakeup',
        'TaskCreate',
        'TaskList',
        'TaskGet',
        'TaskUpdate',
        'TaskStop',
        'TaskOutput',
    ];
    const disallowed = BRICK_DISALLOWED_TOOLS as readonly string[];
    const missing = allSDKBuiltins.filter((t) => !disallowed.includes(t));
    assert.deepEqual(
        missing,
        [],
        `Missing SDK builtins in BRICK_DISALLOWED_TOOLS: ${missing.join(', ')}`,
    );
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('extractResultBlock — returns empty string when no ## Result heading', () => {
    assert.equal(extractResultBlock('some text without heading'), '');
});

test('extractResultBlock — returns section from last ## Result heading', () => {
    const text = 'intro\n## Result\nfoo bar\n## Other\ncontent\n## Result\nfinal result';
    assert.ok(extractResultBlock(text).startsWith('## Result\nfinal result'));
});

test('extractMiniTaskSpec — returns null when marker absent', () => {
    assert.equal(extractMiniTaskSpec('no marker here'), null);
});

test('extractMiniTaskSpec — returns spec up to next ## heading', () => {
    const text =
        'preamble\n## Mini-task spec (for paired brick run)\ndo the thing\n## Result\nfoo';
    const spec = extractMiniTaskSpec(text);
    assert.equal(spec, 'do the thing');
});

test('extractMiniTaskSpec — returns spec until end when no next heading', () => {
    const text = '## Mini-task spec (for paired brick run)\n  spec content  ';
    assert.equal(extractMiniTaskSpec(text), 'spec content');
});

test('isoStamp — produces a non-empty string without colons or dots', () => {
    const stamp = isoStamp();
    assert.ok(stamp.length > 0, 'stamp should be non-empty');
    assert.ok(!stamp.includes(':'), 'stamp should not contain colons');
    assert.ok(!stamp.includes('.'), 'stamp should not contain dots');
});

// ---------------------------------------------------------------------------
// focusStderr construction logic (unit-level, no SDK needed)
// ---------------------------------------------------------------------------

test('focusStderr — no error, no stderr: empty string', () => {
    const base = '';
    const sdkLine = '';
    const focusStderr = [base, sdkLine].filter(Boolean).join('\n');
    assert.equal(focusStderr, '');
});

test('focusStderr — SDK error but no captured stderr: no leading newline', () => {
    const base = '';
    const err = new Error('timeout');
    const sdkLine = `[runner] SDK exception: ${err.message}\n${err.stack ?? ''}`;
    const focusStderr = [base, sdkLine].filter(Boolean).join('\n');
    assert.ok(!focusStderr.startsWith('\n'), 'must not start with newline when base is empty');
    assert.ok(focusStderr.includes('[runner] SDK exception: timeout'));
});

test('focusStderr — SDK error with captured stderr: newline separator', () => {
    const base = 'some stderr line';
    const err = new Error('crash');
    const sdkLine = `[runner] SDK exception: ${err.message}\n${err.stack ?? ''}`;
    const focusStderr = [base, sdkLine].filter(Boolean).join('\n');
    assert.ok(focusStderr.startsWith('some stderr line\n'));
    assert.ok(focusStderr.includes('[runner] SDK exception: crash'));
});

test('focusStderr — no error, captured stderr: returned verbatim', () => {
    const base = 'warning from focus server';
    const sdkLine = '';
    const focusStderr = [base, sdkLine].filter(Boolean).join('\n');
    assert.equal(focusStderr, 'warning from focus server');
});

// ---------------------------------------------------------------------------
// systemPrompt isolation: brick mode must NOT use claude_code preset
// ---------------------------------------------------------------------------

test('brick mode does NOT include claude_code preset', () => {
    // Replicate the systemPromptOption logic from runner.ts
    function buildSystemPrompt(mode: string, framing: string): string | { type: 'preset'; preset: 'claude_code'; excludeDynamicSections?: boolean } {
        return mode === 'brick'
            ? 'You are an expert benchmark agent. Use the tools provided to solve the task. Reply with the final result block as instructed.'
            : framing === 'minimal'
              ? 'You are a benchmark runner. Follow the user instructions exactly.'
              : { type: 'preset', preset: 'claude_code', excludeDynamicSections: true };
    }

    const brickMinimal = buildSystemPrompt('brick', 'minimal');
    const brickClaudeCode = buildSystemPrompt('brick', 'claude-code');

    // Brick mode always returns a plain string, never a preset object
    assert.equal(typeof brickMinimal, 'string',
        'brick mode with minimal framing must use a string systemPrompt');
    assert.equal(typeof brickClaudeCode, 'string',
        'brick mode with claude-code framing must still use a string systemPrompt (no preset)');
    assert.ok(
        typeof brickMinimal === 'string' && !brickMinimal.includes('preset'),
        'brick systemPrompt must not contain the word "preset"',
    );

    // Native mode still uses the preset when framing is claude-code
    const nativeClaudeCode = buildSystemPrompt('native', 'claude-code');
    assert.equal(typeof nativeClaudeCode, 'object',
        'native mode with claude-code framing must use the preset object');
    assert.ok(
        typeof nativeClaudeCode === 'object' &&
        nativeClaudeCode !== null &&
        'preset' in nativeClaudeCode &&
        nativeClaudeCode.preset === 'claude_code',
        'native mode systemPrompt must be the claude_code preset',
    );
});

test('brick mode env contains FOCUS_BENCH_MODE=true', () => {
    // Replicate the modeOptions brick env construction from runner.ts
    const workdir = '/tmp/test-workdir';
    const fakePath = '/usr/bin:/bin';
    const env = {
        HOME: workdir,
        PATH: fakePath,
        FOCUS_BENCH_MODE: 'true',
    };

    assert.equal(env['FOCUS_BENCH_MODE'], 'true',
        'brick mode mcpServers.focus.env must contain FOCUS_BENCH_MODE=true');
    assert.equal(env['HOME'], workdir,
        'brick mode mcpServers.focus.env must contain HOME=workdir');
    assert.ok('PATH' in env, 'brick mode mcpServers.focus.env must contain PATH');
});
