/**
 * runner.ts — shared mode-runner used by both run-brick.ts (orchestrator)
 * and run-one-mode.ts (debug shim).
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Types (exported so consumers can use them)
// ---------------------------------------------------------------------------

export type Framing = 'minimal' | 'claude-code';
export type Mode = 'native' | 'brick';
export type ExitReason = 'ok' | 'max_turns' | 'error' | 'missing_spec';

export interface BrickManifest {
    name: string;
    prefix: string;
    description: string;
    tools: Array<{ name: string; description: string }>;
    [key: string]: unknown;
}

export interface UsageAccumulator {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
}

interface BetaUsageLike {
    input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    output_tokens?: number | null;
}

export interface RunResult {
    brick: string;
    mode: Mode;
    model: string;
    framing: Framing;
    started_at: string;
    duration_ms: number;
    turns: number;
    tools_used: string[];
    usage: UsageAccumulator & { total: number };
    session_id: string | null;
    result_block: string;
    mini_task_spec?: string;   // native runs only
    workdir: string;
    exit_reason: ExitReason;
    focus_stderr?: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

// __file: .../marketplace/benchmarks/harness/src/runner.ts
const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MARKETPLACE_DIR = path.resolve(HARNESS_DIR, '../..');
export const BRICKS_DIR = path.join(MARKETPLACE_DIR, 'bricks');
const BENCH_DIR = path.join(MARKETPLACE_DIR, 'benchmarks');
const DESIGN_PROMPT_PATH = path.join(BENCH_DIR, 'BENCH_DESIGN_AND_SOLVE.md');
const GIVEN_PROMPT_PATH = path.join(BENCH_DIR, 'BENCH_SOLVE_GIVEN.md');
const DEFAULT_TEST_REPO_PATH = path.join(os.homedir(), 'benchmarks', 'test-repo');
// Allow override via env var (used by cross-repo sweep) — non-breaking default
export function getTestRepoPath(): string {
    return process.env['FOCUS_TEST_REPO'] ?? DEFAULT_TEST_REPO_PATH;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function loadManifest(brickName: string): BrickManifest {
    const manifestPath = path.join(BRICKS_DIR, brickName, 'mcp-brick.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as BrickManifest;
}

export function isoStamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
}

function buildNativePrompt(): string {
    return fs.readFileSync(DESIGN_PROMPT_PATH, 'utf-8');
}

function buildBrickPrompt(taskSpec: string): string {
    const template = fs.readFileSync(GIVEN_PROMPT_PATH, 'utf-8');
    return template.replace('{{TASK_SPEC}}', taskSpec);
}

export function prepareWorkdir(brickName: string, mode: Mode, manifest: BrickManifest): string {
    const stamp = isoStamp();
    const workdir = path.join('/tmp', 'focus-bench', `${brickName}-${mode}-${stamp}`);
    fs.mkdirSync(workdir, { recursive: true });

    fs.symlinkSync(getTestRepoPath(), path.join(workdir, 'test-repo'));
    fs.copyFileSync(
        path.join(BRICKS_DIR, brickName, 'mcp-brick.json'),
        path.join(workdir, 'mcp-brick.json'),
    );

    if (mode === 'brick') {
        const focusDir = path.join(workdir, '.focus');
        fs.mkdirSync(focusDir, { recursive: true });

        fs.writeFileSync(
            path.join(focusDir, 'center.json'),
            JSON.stringify(
                { bricks: { [brickName]: { version: '^0.0.0', enabled: true } } },
                null,
                4,
            ),
        );

        const brickDest = path.join(focusDir, 'bricks', brickName);
        fs.mkdirSync(path.dirname(brickDest), { recursive: true });
        fs.cpSync(path.join(BRICKS_DIR, brickName), brickDest, { recursive: true });
    }

    return workdir;
}

function accumulateUsage(acc: UsageAccumulator, usage: BetaUsageLike): void {
    acc.input_tokens += usage.input_tokens ?? 0;
    acc.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
    acc.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;
    acc.output_tokens += usage.output_tokens ?? 0;
}

export function extractResultBlock(text: string): string {
    const idx = text.lastIndexOf('## Result');
    return idx === -1 ? '' : text.slice(idx).trim();
}

/**
 * Parse the ## Mini-task spec section from native run output.
 * Returns null if not found.
 */
export function extractMiniTaskSpec(text: string): string | null {
    const startMarker = '## Mini-task spec (for paired brick run)';
    const startIdx = text.indexOf(startMarker);
    if (startIdx === -1) return null;

    const afterMarker = text.slice(startIdx + startMarker.length).trimStart();
    // The spec ends at the next ## heading
    const nextHeading = afterMarker.search(/^## /m);
    const spec = nextHeading === -1 ? afterMarker : afterMarker.slice(0, nextHeading);
    return spec.trim() || null;
}

// ---------------------------------------------------------------------------
// Core run function
// ---------------------------------------------------------------------------

export interface RunOneModeOptions {
    brick: string;
    mode: Mode;
    framing?: Framing;
    maxTurns?: number;
    outDir: string;
    /** For brick mode: the task spec text extracted from a prior native run */
    taskSpec?: string;
    manifest?: BrickManifest;
}

export async function runOneMode(opts: RunOneModeOptions): Promise<RunResult> {
    const {
        brick,
        mode,
        framing = 'minimal',
        maxTurns = 20,
        outDir,
        taskSpec,
    } = opts;

    const manifest = opts.manifest ?? loadManifest(brick);

    if (mode === 'brick' && !taskSpec) {
        throw new Error('brick mode requires taskSpec');
    }

    const prompt = mode === 'native' ? buildNativePrompt() : buildBrickPrompt(taskSpec!);
    const workdir = prepareWorkdir(brick, mode, manifest);

    console.log(`  workdir: ${workdir}`);

    const usage: UsageAccumulator = {
        input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 0,
    };
    const toolsUsed = new Set<string>();
    const focusStderrLines: string[] = [];
    let sessionId: string | null = null;
    let lastAssistantText = '';
    let exitReason: ExitReason = 'ok';
    let numTurns = 0;

    const systemPromptOption: string | { type: 'preset'; preset: 'claude_code'; excludeDynamicSections?: boolean } =
        framing === 'minimal'
            ? 'You are a benchmark runner. Follow the user instructions exactly.'
            : { type: 'preset', preset: 'claude_code', excludeDynamicSections: true };

    const commonOptions = {
        model: 'claude-sonnet-4-6',
        maxTurns,
        cwd: workdir,
        permissionMode: 'bypassPermissions' as const,
        allowDangerouslySkipPermissions: true,
        persistSession: false,
        settingSources: [] as [],
        systemPrompt: systemPromptOption,
        stderr: (data: string) => {
            focusStderrLines.push(data);
            if (/error|fail/i.test(data)) {
                process.stderr.write(`  [stderr] ${data}`);
            }
        },
    };

    const modeOptions =
        mode === 'native'
            ? {
                  allowedTools: ['Bash', 'Read', 'Grep', 'Glob'] as string[],
                  disallowedTools: [] as string[],
              }
            : {
                  allowedTools: [
                      'Read',
                      ...manifest.tools.map((t) => `mcp__focus__${manifest.prefix}_${t.name}`),
                  ] as string[],
                  disallowedTools: ['Bash', 'Grep', 'Glob', 'Edit', 'Write'] as string[],
                  mcpServers: {
                      focus: {
                          command: 'focus',
                          args: ['start'],
                          env: { HOME: workdir, PATH: process.env.PATH ?? '' },
                      },
                  },
              };

    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const q = query({ prompt, options: { ...commonOptions, ...modeOptions } });

    for await (const message of q) {
        switch (message.type) {
            case 'assistant': {
                const msg = message.message;
                if (msg?.usage) accumulateUsage(usage, msg.usage as BetaUsageLike);
                let text = '';
                if (Array.isArray(msg?.content)) {
                    for (const block of msg.content) {
                        if (block.type === 'text') text += block.text;
                        else if (block.type === 'tool_use') toolsUsed.add(block.name as string);
                    }
                }
                if (text) {
                    lastAssistantText = text;
                    process.stdout.write('.');
                }
                if (!sessionId && message.session_id) sessionId = message.session_id;
                break;
            }
            case 'result': {
                if (message.usage) accumulateUsage(usage, message.usage as BetaUsageLike);
                if (!sessionId && message.session_id) sessionId = message.session_id;
                numTurns = message.num_turns;
                if (message.subtype === 'success') {
                    if ('result' in message && typeof message.result === 'string') {
                        lastAssistantText = message.result;
                    }
                } else if (message.subtype === 'error_max_turns') {
                    exitReason = 'max_turns';
                    console.warn('\n  WARNING: max turns reached');
                } else {
                    exitReason = 'error';
                    console.error(`\n  ERROR: result subtype=${message.subtype}`);
                    if ('errors' in message && Array.isArray(message.errors)) {
                        console.error('  Details:', message.errors);
                    }
                }
                break;
            }
        }
    }

    process.stdout.write('\n');

    const resultBlock = extractResultBlock(lastAssistantText);
    if (!resultBlock) {
        console.warn('  WARNING: No ## Result block found');
    }

    // For native runs, extract the Mini-task spec
    let miniTaskSpec: string | undefined;
    if (mode === 'native') {
        const spec = extractMiniTaskSpec(lastAssistantText);
        if (spec) {
            miniTaskSpec = spec;
        } else if (exitReason === 'ok') {
            exitReason = 'missing_spec';
            console.error('  ERROR: ## Mini-task spec section not found in native output');
        }
    }

    const durationMs = Date.now() - startMs;
    const total =
        usage.input_tokens +
        usage.cache_creation_input_tokens +
        usage.cache_read_input_tokens +
        usage.output_tokens;

    const focusStderr = focusStderrLines.join('').trim();

    const result: RunResult = {
        brick,
        mode,
        model: 'claude-sonnet-4-6',
        framing,
        started_at: startedAt,
        duration_ms: durationMs,
        turns: numTurns,
        tools_used: Array.from(toolsUsed).sort(),
        usage: { ...usage, total },
        session_id: sessionId,
        result_block: resultBlock,
        ...(miniTaskSpec !== undefined ? { mini_task_spec: miniTaskSpec } : {}),
        workdir,
        exit_reason: exitReason,
        ...(focusStderr ? { focus_stderr: focusStderr } : {}),
    };

    // Write JSON
    fs.mkdirSync(path.resolve(outDir), { recursive: true });
    const stamp = isoStamp();
    const outFile = path.join(path.resolve(outDir), `${brick}-${mode}-${stamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    console.log(`  → ${outFile}`);

    return result;
}
