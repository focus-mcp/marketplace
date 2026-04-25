#!/usr/bin/env -S pnpm tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { parseArgs } from 'node:util';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { load as loadYaml } from 'js-yaml';

interface Scenario {
    input: Record<string, unknown>;
    prompt: string;
    invariants?: unknown[];
}

interface Args {
    brick: string;
    tool: string;
    scenario: string;
}

function parseCli(): Args {
    const { values } = parseArgs({
        options: {
            brick: { type: 'string' },
            tool: { type: 'string' },
            scenario: { type: 'string' },
        },
    });
    if (!values.brick || !values.tool || !values.scenario) {
        throw new Error('usage: curate-golden --brick X --tool Y --scenario Z');
    }
    return { brick: values.brick, tool: values.tool, scenario: values.scenario };
}

function scenarioDir(args: Args): string {
    return resolve(
        process.cwd(),
        'bricks',
        args.brick,
        'tests/integration/scenarios',
        args.tool,
        args.scenario,
    );
}

function goldensDir(args: Args): string {
    return resolve(
        process.cwd(),
        'bricks',
        args.brick,
        'tests/integration/goldens',
        args.tool,
        args.scenario,
    );
}

async function loadScenario(args: Args): Promise<Scenario> {
    const file = resolve(scenarioDir(args), 'scenario.yaml');
    const raw = await readFile(file, 'utf-8');
    return loadYaml(raw) as Scenario;
}

async function runOneMode(
    mode: 'native' | 'brick',
    scenario: Scenario,
    args: Args,
): Promise<{ output: string; tokens: number; turns: number; duration_ms: number }> {
    const started = Date.now();
    let tokens = 0;
    let turns = 0;
    let output = '';

    const allowedTools =
        mode === 'native'
            ? ['Bash', 'Read', 'Grep', 'Glob']
            : [`mcp__focus__${args.brick}_${args.tool}`, 'Read'];

    for await (const msg of query({
        prompt: scenario.prompt,
        options: {
            model: 'claude-sonnet-4-6',
            maxTurns: 20,
            allowedTools,
            settingSources: [],
            systemPrompt: 'You are a benchmark runner. Follow instructions exactly.',
            cwd: process.cwd(),
        },
    })) {
        if (msg.type === 'assistant' && msg.message?.usage) {
            const u = msg.message.usage;
            tokens +=
                (u.input_tokens ?? 0) +
                (u.output_tokens ?? 0) +
                (u.cache_creation_input_tokens ?? 0) +
                (u.cache_read_input_tokens ?? 0);
        }
        if (msg.type === 'result' && msg.subtype === 'success') {
            output = msg.result as string;
            turns = msg.num_turns;
        }
    }
    return { output, tokens, turns, duration_ms: Date.now() - started };
}

async function main(): Promise<void> {
    const args = parseCli();
    const scenario = await loadScenario(args);
    const outDir = goldensDir(args);
    await mkdir(outDir, { recursive: true });

    console.log(`Curating ${args.brick}:${args.tool}/${args.scenario}`);
    console.log('  → native mode...');
    const native = await runOneMode('native', scenario, args);
    await writeFile(resolve(outDir, 'native.expected'), native.output);

    console.log('  → brick mode...');
    const brick = await runOneMode('brick', scenario, args);
    await writeFile(resolve(outDir, 'brick.expected'), brick.output);

    const metrics = {
        native: { tokens: native.tokens, turns: native.turns, duration_ms: native.duration_ms },
        brick: { tokens: brick.tokens, turns: brick.turns, duration_ms: brick.duration_ms },
    };
    await writeFile(resolve(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

    const diverge = native.output !== brick.output;
    console.log(`✓ Goldens written to ${outDir}`);
    console.log(`  native: ${native.tokens} tok, ${native.turns} turns`);
    console.log(`  brick:  ${brick.tokens} tok, ${brick.turns} turns`);
    console.log(`  divergence: ${diverge ? 'YES — review carefully' : 'no'}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
