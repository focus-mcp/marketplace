// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Static Equivalence Measurement
 *
 * Measures — deterministically, without LLM — the token cost of each brick's
 * output vs. the equivalent native operation (Read, grep, find, etc.).
 *
 * Token approximation: Math.ceil(JSON.stringify(output).length / 4)
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile, appendFile, copyFile, rename as fsRename, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const TEST_REPO = process.env['FOCUS_TEST_REPO'] ?? '/home/samuelds/benchmarks/test-repo';
const INJECTOR_FILE = `${TEST_REPO}/packages/core/injector/injector.ts`;
const CORE_SRC = `${TEST_REPO}/packages/core`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquivalencePair {
    readonly brick: string;
    readonly tool: string;
    readonly description: string;
    readonly native: () => Promise<unknown>;
    readonly brickOp: () => Promise<unknown>;
}

interface SkippedEntry {
    readonly brick: string;
    readonly tool: string;
    readonly reason: string;
}

interface EquivalenceResult {
    brick: string;
    tool: string;
    description: string;
    native_chars: number;
    brick_chars: number;
    native_tokens: number;
    brick_tokens: number;
    delta_pct: number;
    status: 'ok' | 'skip' | 'error';
    note?: string;
}

// ─── Token counter ────────────────────────────────────────────────────────────

function countTokens(value: unknown): number {
    return Math.ceil(JSON.stringify(value).length / 4);
}

// ─── Safe spawn helpers (no shell interpolation) ──────────────────────────────

function spawnOut(cmd: string, args: string[]): string {
    const result = spawnSync(cmd, args, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
    });
    return (result.stdout as string | null) ?? '';
}

function grepRn(pattern: string, dir: string, include: string): string {
    const result = spawnSync('grep', ['-rn', '--include', include, pattern, dir], {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
    });
    return (result.stdout as string | null) ?? '';
}

// ─── Native helpers ───────────────────────────────────────────────────────────

async function nativeReadFile(path: string): Promise<string> {
    return readFile(path, 'utf-8');
}

/** Recursive find of .ts files (no node_modules). Uses find + args array — safe. */
function nativeFindTs(dir: string): string {
    return spawnOut('find', [
        dir,
        '-name',
        '*.ts',
        '-not',
        '-path',
        '*/node_modules/*',
    ]);
}

async function nativeGrepTs(pattern: string, dir: string): Promise<string> {
    return grepRn(pattern, dir, '*.ts');
}

async function nativeReadMultiple(paths: string[]): Promise<string> {
    const contents = await Promise.all(paths.map((p) => readFile(p, 'utf-8').catch(() => '')));
    return contents.join('\n--- next file ---\n');
}

function nativeListDir(dir: string): string {
    // ls -1 equivalent via readdir is used in brickOp anyway, use find maxdepth 1
    return spawnOut('find', [dir, '-maxdepth', '1', '-mindepth', '1', '-printf', '%f\n']);
}

function nativeHead(path: string, n: number): string {
    return spawnOut('head', ['-n', String(n), path]);
}

function nativeTail(path: string, n: number): string {
    return spawnOut('tail', ['-n', String(n), path]);
}

function nativeSed(path: string, from: number, to: number): string {
    return spawnOut('sed', ['-n', `${from},${to}p`, path]);
}

function nativeDiff(a: string, b: string): string {
    const result = spawnSync('diff', [a, b], {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
    });
    return (result.stdout as string | null) ?? '';
}

async function nativePackageJson(dir: string): Promise<string> {
    return readFile(join(dir, 'package.json'), 'utf-8');
}

/** For outline/repo: find + read each file (max 20) */
async function nativeOutlineNative(dir: string): Promise<string> {
    const raw = nativeFindTs(dir);
    const files = raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(0, 20);
    const reads = await Promise.all(files.map((f) => readFile(f, 'utf-8').catch(() => '')));
    return raw + '\n' + reads.join('\n');
}

/** For refs: grep + read matching files (max 5) */
async function nativeRefsNative(symbol: string, dir: string): Promise<string> {
    const matches = await nativeGrepTs(symbol, dir);
    const files = [
        ...new Set(
            matches
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((l) => l.split(':')[0])
                .filter(Boolean),
        ),
    ].slice(0, 5) as string[];
    const reads = await Promise.all(files.map((f) => readFile(f, 'utf-8').catch(() => '')));
    return matches + '\n' + reads.join('\n');
}

// ─── Collect first N .ts files from a directory ───────────────────────────────

async function collectTsFiles(dir: string, n: number): Promise<string[]> {
    const raw = nativeFindTs(dir);
    return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(0, n);
}

// ─── Tmp dir helper for write/ops tests ──────────────────────────────────────

async function makeTmpDir(): Promise<string> {
    const dir = join(tmpdir(), `equiv-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    return dir;
}

// ─── Skipped entries (no native equivalent) ──────────────────────────────────

const SKIPPED: SkippedEntry[] = [
    // compress
    { brick: 'compress', tool: 'cmp_response', reason: 'compute pure transform — no direct native equivalent' },
    // format
    { brick: 'format', tool: 'fmt_markdown', reason: 'compute pure transform' },
    { brick: 'format', tool: 'fmt_table', reason: 'compute pure transform' },
    { brick: 'format', tool: 'fmt_yaml', reason: 'compute pure transform' },
    // convert — compute pure
    { brick: 'convert', tool: 'conv_encoding', reason: 'compute pure — no native equivalent' },
    { brick: 'convert', tool: 'conv_format', reason: 'compute pure' },
    { brick: 'convert', tool: 'conv_language', reason: 'compute pure' },
    { brick: 'convert', tool: 'conv_units', reason: 'compute pure' },
    // cache — stateful multi-call
    { brick: 'cache', tool: 'cache_get', reason: 'stateful — requires persistent store' },
    { brick: 'cache', tool: 'cache_set', reason: 'stateful' },
    { brick: 'cache', tool: 'cache_invalidate', reason: 'stateful' },
    { brick: 'cache', tool: 'cache_stats', reason: 'stateful' },
    { brick: 'cache', tool: 'cache_warmup', reason: 'stateful' },
    // memory
    { brick: 'memory', tool: 'mem_store', reason: 'stateful cross-session' },
    { brick: 'memory', tool: 'mem_recall', reason: 'stateful cross-session' },
    { brick: 'memory', tool: 'mem_forget', reason: 'stateful cross-session' },
    { brick: 'memory', tool: 'mem_list', reason: 'stateful cross-session' },
    { brick: 'memory', tool: 'mem_search', reason: 'stateful cross-session' },
    // session
    { brick: 'session', tool: 'ses_save', reason: 'stateful multi-call' },
    { brick: 'session', tool: 'ses_restore', reason: 'stateful multi-call' },
    { brick: 'session', tool: 'ses_history', reason: 'stateful multi-call' },
    { brick: 'session', tool: 'ses_context', reason: 'stateful multi-call' },
    // share
    { brick: 'share', tool: 'shr_broadcast', reason: 'stateful multi-agent' },
    { brick: 'share', tool: 'shr_context', reason: 'stateful multi-agent' },
    { brick: 'share', tool: 'shr_files', reason: 'stateful multi-agent' },
    { brick: 'share', tool: 'shr_results', reason: 'stateful multi-agent' },
    // knowledge
    { brick: 'knowledge', tool: 'kb_index', reason: 'stateful index' },
    { brick: 'knowledge', tool: 'kb_search', reason: 'stateful index' },
    { brick: 'knowledge', tool: 'kb_fetch', reason: 'stateful index' },
    { brick: 'knowledge', tool: 'kb_rank', reason: 'stateful index' },
    { brick: 'knowledge', tool: 'kb_purge', reason: 'stateful index' },
    // parallel/dispatch/agent/autopilot/batch — orchestration
    { brick: 'parallel', tool: 'par_run', reason: 'orchestration — no native equivalent' },
    { brick: 'parallel', tool: 'par_collect', reason: 'orchestration' },
    { brick: 'parallel', tool: 'par_merge', reason: 'orchestration' },
    { brick: 'parallel', tool: 'par_timeout', reason: 'orchestration' },
    { brick: 'dispatch', tool: 'dsp_send', reason: 'orchestration' },
    { brick: 'dispatch', tool: 'dsp_queue', reason: 'orchestration' },
    { brick: 'dispatch', tool: 'dsp_status', reason: 'orchestration' },
    { brick: 'dispatch', tool: 'dsp_cancel', reason: 'orchestration' },
    { brick: 'agent', tool: 'agt_list', reason: 'orchestration' },
    { brick: 'agent', tool: 'agt_register', reason: 'orchestration' },
    { brick: 'agent', tool: 'agt_unregister', reason: 'orchestration' },
    { brick: 'agent', tool: 'agt_capabilities', reason: 'orchestration' },
    { brick: 'autopilot', tool: 'auto_plan', reason: 'orchestration meta' },
    { brick: 'autopilot', tool: 'auto_execute', reason: 'orchestration meta' },
    { brick: 'autopilot', tool: 'auto_status', reason: 'orchestration meta' },
    { brick: 'batch', tool: 'bat_sequential', reason: 'orchestration' },
    { brick: 'batch', tool: 'bat_parallel', reason: 'orchestration' },
    { brick: 'batch', tool: 'bat_pipeline', reason: 'orchestration' },
    { brick: 'batch', tool: 'bat_multi', reason: 'orchestration' },
    // planning/thinking/debate/decision/aiteam — meta
    { brick: 'planning', tool: 'plan_create', reason: 'meta AI planning' },
    { brick: 'planning', tool: 'plan_steps', reason: 'meta AI planning' },
    { brick: 'planning', tool: 'plan_dependencies', reason: 'meta AI planning' },
    { brick: 'planning', tool: 'plan_estimate', reason: 'meta AI planning' },
    { brick: 'thinking', tool: 'thk_think', reason: 'meta AI' },
    { brick: 'thinking', tool: 'thk_branch', reason: 'meta AI' },
    { brick: 'thinking', tool: 'thk_revise', reason: 'meta AI' },
    { brick: 'thinking', tool: 'thk_summarize', reason: 'meta AI' },
    { brick: 'debate', tool: 'dbt_debate', reason: 'meta multi-AI' },
    { brick: 'debate', tool: 'dbt_consensus', reason: 'meta multi-AI' },
    { brick: 'debate', tool: 'dbt_score', reason: 'meta multi-AI' },
    { brick: 'debate', tool: 'dbt_summary', reason: 'meta multi-AI' },
    { brick: 'decision', tool: 'dec_options', reason: 'meta AI' },
    { brick: 'decision', tool: 'dec_tradeoffs', reason: 'meta AI' },
    { brick: 'decision', tool: 'dec_recommend', reason: 'meta AI' },
    { brick: 'decision', tool: 'dec_record', reason: 'meta AI' },
    { brick: 'aiteam', tool: 'aiteam_*', reason: 'meta multi-AI' },
    // focus_* meta CLI
    { brick: 'focus', tool: 'focus_load', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_unload', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_list', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_reload', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_install', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_remove', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_search', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_update', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_catalog_list', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_catalog_add', reason: 'CLI meta tool' },
    { brick: 'focus', tool: 'focus_catalog_remove', reason: 'CLI meta tool' },
    // sandbox — VM execution
    { brick: 'sandbox', tool: 'box_eval', reason: 'VM execution — no native equivalent' },
    { brick: 'sandbox', tool: 'box_run', reason: 'VM execution' },
    { brick: 'sandbox', tool: 'box_file', reason: 'VM execution' },
    { brick: 'sandbox', tool: 'box_languages', reason: 'VM execution' },
    // metrics/heatmap/savings/tokenbudget — observability
    { brick: 'metrics', tool: 'met_tokens', reason: 'observability — no native equivalent' },
    { brick: 'metrics', tool: 'met_costs', reason: 'observability' },
    { brick: 'metrics', tool: 'met_duration', reason: 'observability' },
    { brick: 'metrics', tool: 'met_session', reason: 'observability' },
    { brick: 'heatmap', tool: 'hm_hotfiles', reason: 'observability stateful' },
    { brick: 'heatmap', tool: 'hm_coldfiles', reason: 'observability stateful' },
    { brick: 'heatmap', tool: 'hm_patterns', reason: 'observability stateful' },
    { brick: 'heatmap', tool: 'hm_track', reason: 'observability stateful' },
    { brick: 'savings', tool: 'sav_report', reason: 'observability stateful' },
    { brick: 'savings', tool: 'sav_compare', reason: 'observability stateful' },
    { brick: 'savings', tool: 'sav_roi', reason: 'observability stateful' },
    { brick: 'savings', tool: 'sav_trend', reason: 'observability stateful' },
    { brick: 'tokenbudget', tool: 'tb_estimate', reason: 'observability' },
    { brick: 'tokenbudget', tool: 'tb_fill', reason: 'observability' },
    { brick: 'tokenbudget', tool: 'tb_analyze', reason: 'observability' },
    { brick: 'tokenbudget', tool: 'tb_optimize', reason: 'observability' },
    // validate — compute API-bound
    { brick: 'validate', tool: 'val_json', reason: 'compute API-bound' },
    { brick: 'validate', tool: 'val_lint', reason: 'compute API-bound' },
    { brick: 'validate', tool: 'val_schema', reason: 'compute API-bound' },
    { brick: 'validate', tool: 'val_types', reason: 'compute API-bound' },
    // lastversion — API-bound
    { brick: 'lastversion', tool: 'lastversion_*', reason: 'external API-bound' },
    // repos/task/research/onboarding/fullaudit — workflow/state
    { brick: 'repos', tool: 'repos_list', reason: 'workflow/state' },
    { brick: 'repos', tool: 'repos_register', reason: 'workflow/state' },
    { brick: 'repos', tool: 'repos_unregister', reason: 'workflow/state' },
    { brick: 'repos', tool: 'repos_stats', reason: 'workflow/state' },
    { brick: 'task', tool: 'tsk_create', reason: 'workflow/state' },
    { brick: 'task', tool: 'tsk_assign', reason: 'workflow/state' },
    { brick: 'task', tool: 'tsk_status', reason: 'workflow/state' },
    { brick: 'task', tool: 'tsk_complete', reason: 'workflow/state' },
    { brick: 'research', tool: 'rsh_multisource', reason: 'workflow/state' },
    { brick: 'research', tool: 'rsh_synthesize', reason: 'workflow/state' },
    { brick: 'research', tool: 'rsh_validate', reason: 'workflow/state' },
    { brick: 'onboarding', tool: 'onb_scan', reason: 'workflow/state' },
    { brick: 'onboarding', tool: 'onb_guide', reason: 'workflow/state' },
    { brick: 'fullaudit', tool: 'audit_run', reason: 'workflow composite' },
    { brick: 'fullaudit', tool: 'audit_report', reason: 'workflow composite' },
    // graph* — graph state
    { brick: 'graphbuild', tool: 'gb_build', reason: 'graph state' },
    { brick: 'graphbuild', tool: 'gb_add', reason: 'graph state' },
    { brick: 'graphbuild', tool: 'gb_update', reason: 'graph state' },
    { brick: 'graphbuild', tool: 'gb_multimodal', reason: 'graph state' },
    { brick: 'graphbuild', tool: 'gb_watch', reason: 'graph state' },
    { brick: 'graphquery', tool: 'gq_query', reason: 'graph state' },
    { brick: 'graphquery', tool: 'gq_node', reason: 'graph state' },
    { brick: 'graphquery', tool: 'gq_neighbors', reason: 'graph state' },
    { brick: 'graphquery', tool: 'gq_path', reason: 'graph state' },
    { brick: 'graphquery', tool: 'gq_filter', reason: 'graph state' },
    { brick: 'graphcluster', tool: 'gc_cluster', reason: 'graph state' },
    { brick: 'graphcluster', tool: 'gc_communities', reason: 'graph state' },
    { brick: 'graphcluster', tool: 'gc_architecture', reason: 'graph state' },
    { brick: 'graphcluster', tool: 'gc_explain', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_mermaid', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_cypher', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_graphml', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_html', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_obsidian', reason: 'graph state' },
    { brick: 'graphexport', tool: 'ge_wiki', reason: 'graph state' },
    { brick: 'callgraph', tool: 'cg_callers', reason: 'graph state' },
    { brick: 'callgraph', tool: 'cg_callees', reason: 'graph state' },
    { brick: 'callgraph', tool: 'cg_chain', reason: 'graph state' },
    { brick: 'callgraph', tool: 'cg_depth', reason: 'graph state' },
    { brick: 'depgraph', tool: 'dep_imports', reason: 'graph state' },
    { brick: 'depgraph', tool: 'dep_exports', reason: 'graph state' },
    { brick: 'depgraph', tool: 'dep_fanin', reason: 'graph state' },
    { brick: 'depgraph', tool: 'dep_fanout', reason: 'graph state' },
    { brick: 'depgraph', tool: 'dep_circular', reason: 'graph state' },
    // contextpack/smartcontext — composite
    { brick: 'contextpack', tool: 'cp_pack', reason: 'composite multi-step' },
    { brick: 'contextpack', tool: 'cp_estimate', reason: 'composite multi-step' },
    { brick: 'contextpack', tool: 'cp_budget', reason: 'composite multi-step' },
    { brick: 'contextpack', tool: 'cp_prioritize', reason: 'composite multi-step' },
    { brick: 'smartcontext', tool: 'sctx_load', reason: 'composite stateful' },
    { brick: 'smartcontext', tool: 'sctx_refresh', reason: 'composite stateful' },
    { brick: 'smartcontext', tool: 'sctx_status', reason: 'composite stateful' },
    // diagram — compute pure
    { brick: 'diagram', tool: 'diag_mermaid', reason: 'compute pure' },
    { brick: 'diagram', tool: 'diag_dot', reason: 'compute pure' },
    { brick: 'diagram', tool: 'diag_ascii', reason: 'compute pure' },
    // echo/shell — trivial wrappers
    { brick: 'echo', tool: 'echo_*', reason: 'trivial wrapper' },
    { brick: 'shell', tool: 'sh_exec', reason: 'trivial wrapper of Bash' },
    { brick: 'shell', tool: 'sh_background', reason: 'trivial wrapper' },
    { brick: 'shell', tool: 'sh_kill', reason: 'trivial wrapper' },
    { brick: 'shell', tool: 'sh_compress', reason: 'trivial wrapper' },
    // meta-bundles
    { brick: 'codebase', tool: 'codebase_*', reason: 'meta-bundle brick' },
    { brick: 'codemod', tool: 'codemod_*', reason: 'meta-bundle brick' },
    { brick: 'devtools', tool: 'devtools_*', reason: 'meta-bundle brick' },
    { brick: 'filesystem', tool: 'filesystem_*', reason: 'meta-bundle brick' },
    { brick: 'knowledgebase', tool: 'knowledgebase_*', reason: 'meta-bundle brick' },
    // overview (2 remaining)
    { brick: 'overview', tool: 'ovw_architecture', reason: 'composite — requires multiple files + analysis' },
    { brick: 'overview', tool: 'ovw_conventions', reason: 'composite — requires multiple files + analysis' },
    // review
    { brick: 'review', tool: 'rev_code', reason: 'AI-assisted review' },
    { brick: 'review', tool: 'rev_security', reason: 'AI-assisted review' },
    { brick: 'review', tool: 'rev_architecture', reason: 'AI-assisted review' },
    { brick: 'review', tool: 'rev_compare', reason: 'AI-assisted review' },
];

// ─── Build pairs ──────────────────────────────────────────────────────────────

async function buildPairs(): Promise<EquivalencePair[]> {
    // Lazy-imported bricks — tsx handles transpilation at runtime
    // Path: from benchmarks/harness/src/ → ../../../bricks/<name>/src/operations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const smartread = await import('../../../bricks/smartread/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const outline = await import('../../../bricks/outline/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const overview = await import('../../../bricks/overview/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fileread = await import('../../../bricks/fileread/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const filewrite = await import('../../../bricks/filewrite/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const filelist = await import('../../../bricks/filelist/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fileops = await import('../../../bricks/fileops/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const filesearch = await import('../../../bricks/filesearch/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const textsearch = await import('../../../bricks/textsearch/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refs = await import('../../../bricks/refs/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rename = await import('../../../bricks/rename/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const multiread = await import('../../../bricks/multiread/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const filediff = await import('../../../bricks/filediff/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const compress = await import('../../../bricks/compress/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const format = await import('../../../bricks/format/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fts = await import('../../../bricks/fts/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const symbol = await import('../../../bricks/symbol/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const routes = await import('../../../bricks/routes/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const inline = await import('../../../bricks/inline/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const impact = await import('../../../bricks/impact/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const codeedit = await import('../../../bricks/codeedit/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const treesitter = await import('../../../bricks/treesitter/src/operations.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const semanticsearch = await import('../../../bricks/semanticsearch/src/operations.js');

    // Pre-compute paths
    const tsFiles5 = await collectTsFiles(CORE_SRC, 5);
    const tsFiles3 = await collectTsFiles(CORE_SRC, 3);
    const injectorContent = await readFile(INJECTOR_FILE, 'utf-8');
    const injectorLines = injectorContent.split('\n').length;
    const tsFilesForDiff = await collectTsFiles(CORE_SRC, 2);
    const diffA = tsFilesForDiff[0] ?? INJECTOR_FILE;
    const diffB = tsFilesForDiff[1] ?? INJECTOR_FILE;

    // Seed fileops work root to the test repo so sandbox check passes
    fileops.setWorkRoot(TEST_REPO);

    return [
        // ─── smartread ──────────────────────────────────────────────────────
        {
            brick: 'smartread',
            tool: 'sr_signatures',
            description: 'Export signatures of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => smartread.srSignatures({ path: INJECTOR_FILE }),
        },
        {
            brick: 'smartread',
            tool: 'sr_imports',
            description: 'Import lines of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => smartread.srImports({ path: INJECTOR_FILE }),
        },
        {
            brick: 'smartread',
            tool: 'sr_map',
            description: 'Symbol map of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => smartread.srMap({ path: INJECTOR_FILE }),
        },
        {
            brick: 'smartread',
            tool: 'sr_summary',
            description: 'Block summary of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => smartread.srSummary({ path: INJECTOR_FILE }),
        },
        {
            brick: 'smartread',
            tool: 'sr_full',
            description: 'Full smart read of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => smartread.srFull({ path: INJECTOR_FILE }),
        },

        // ─── outline ────────────────────────────────────────────────────────
        {
            brick: 'outline',
            tool: 'out_file',
            description: 'Outline symbols/imports of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => outline.outlineFile({ path: INJECTOR_FILE }),
        },
        {
            brick: 'outline',
            tool: 'out_repo',
            description: 'Repo outline of core/injector (find + read each)',
            native: () => nativeOutlineNative(`${CORE_SRC}/injector`),
            brickOp: () => outline.outlineRepo({ dir: `${CORE_SRC}/injector`, maxFiles: 20 }),
        },
        {
            brick: 'outline',
            tool: 'out_structure',
            description: 'Directory structure of core package',
            native: () => nativeFindTs(CORE_SRC),
            brickOp: () => outline.outlineStructure({ dir: CORE_SRC }),
        },

        // ─── overview ───────────────────────────────────────────────────────
        {
            brick: 'overview',
            tool: 'ovw_project',
            description: 'Project metadata (package.json parse)',
            native: () => nativePackageJson(TEST_REPO),
            brickOp: () => overview.ovwProject({ dir: TEST_REPO }),
        },
        {
            brick: 'overview',
            tool: 'ovw_dependencies',
            description: 'Dependency list vs raw package.json',
            native: () => nativePackageJson(TEST_REPO),
            brickOp: () => overview.ovwDependencies({ dir: TEST_REPO }),
        },

        // ─── fileread ───────────────────────────────────────────────────────
        {
            brick: 'fileread',
            tool: 'fr_head',
            description: 'First 10 lines of injector.ts',
            native: () => Promise.resolve(nativeHead(INJECTOR_FILE, 10)),
            brickOp: () => fileread.frHead({ path: INJECTOR_FILE, lines: 10 }),
        },
        {
            brick: 'fileread',
            tool: 'fr_tail',
            description: 'Last 10 lines of injector.ts',
            native: () => Promise.resolve(nativeTail(INJECTOR_FILE, 10)),
            brickOp: () => fileread.frTail({ path: INJECTOR_FILE, lines: 10 }),
        },
        {
            brick: 'fileread',
            tool: 'fr_range',
            description: `Lines 100-150 of injector.ts (${injectorLines} total)`,
            native: () => Promise.resolve(nativeSed(INJECTOR_FILE, 100, 150)),
            brickOp: () => fileread.frRange({ path: INJECTOR_FILE, from: 100, to: 150 }),
        },
        {
            brick: 'fileread',
            tool: 'fr_read',
            description: 'Full read of injector.ts (baseline: identical)',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: () => fileread.frRead({ path: INJECTOR_FILE }),
        },

        // ─── filewrite ──────────────────────────────────────────────────────
        {
            brick: 'filewrite',
            tool: 'fw_create',
            description: 'Create a new file with content',
            native: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'native.ts');
                await writeFile(p, '// hello\n', 'utf-8');
                return `created:${p}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'brick.ts');
                return filewrite.fwCreate({ path: p, content: '// hello\n' });
            },
        },
        {
            brick: 'filewrite',
            tool: 'fw_write',
            description: 'Write (overwrite) existing file',
            native: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'native.ts');
                await writeFile(p, '// original\n', 'utf-8');
                await writeFile(p, '// overwritten\n', 'utf-8');
                return `written:${p}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'brick.ts');
                await writeFile(p, '// original\n', 'utf-8');
                return filewrite.fwWrite({ path: p, content: '// overwritten\n' });
            },
        },
        {
            brick: 'filewrite',
            tool: 'fw_append',
            description: 'Append line to file',
            native: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'native.ts');
                await writeFile(p, '// line1\n', 'utf-8');
                await appendFile(p, '// line2\n', 'utf-8');
                return `appended:${p}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'brick.ts');
                await writeFile(p, '// line1\n', 'utf-8');
                return filewrite.fwAppend({ path: p, content: '// line2\n' });
            },
        },

        // ─── filelist ───────────────────────────────────────────────────────
        {
            brick: 'filelist',
            tool: 'fl_list',
            description: 'List entries of core/injector dir',
            native: () => Promise.resolve(nativeListDir(`${CORE_SRC}/injector`)),
            brickOp: () => filelist.flList({ path: `${CORE_SRC}/injector` }),
        },
        {
            brick: 'filelist',
            tool: 'fl_glob',
            description: 'Glob *.ts in core src',
            native: () => Promise.resolve(nativeFindTs(CORE_SRC)),
            brickOp: () => filelist.flGlob({ path: CORE_SRC, pattern: '*.ts' }),
        },
        {
            brick: 'filelist',
            tool: 'fl_find',
            description: 'Find "injector.ts" in core',
            native: () =>
                Promise.resolve(
                    spawnOut('find', [CORE_SRC, '-name', 'injector.ts', '-not', '-path', '*/node_modules/*']),
                ),
            brickOp: () => filelist.flFind({ path: CORE_SRC, name: 'injector.ts' }),
        },
        {
            brick: 'filelist',
            tool: 'fl_tree',
            description: 'Directory tree of core (depth 3)',
            native: () =>
                Promise.resolve(
                    spawnOut('find', [CORE_SRC, '-maxdepth', '3', '-not', '-path', '*/node_modules/*', '-printf', '%d %p\n']),
                ),
            brickOp: () => filelist.flTree({ path: CORE_SRC, depth: 3 }),
        },

        // ─── fileops (write-side — sandbox to tmpdir) ────────────────────────
        {
            brick: 'fileops',
            tool: 'fo_copy',
            description: 'Copy injector.ts to tmp',
            native: async () => {
                const dir = await makeTmpDir();
                const dest = join(dir, 'copy.ts');
                await copyFile(INJECTOR_FILE, dest);
                return `copied:${dest}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                fileops.setWorkRoot(dir);
                const src = join(dir, 'src.ts');
                await copyFile(INJECTOR_FILE, src);
                const dest = join(dir, 'copy.ts');
                return fileops.foCopy({ from: src, to: dest });
            },
        },
        {
            brick: 'fileops',
            tool: 'fo_move',
            description: 'Move file within tmp',
            native: async () => {
                const dir = await makeTmpDir();
                const src = join(dir, 'src.ts');
                const dest = join(dir, 'dest.ts');
                await writeFile(src, '// move\n', 'utf-8');
                await fsRename(src, dest);
                return `moved:${dest}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                fileops.setWorkRoot(dir);
                const src = join(dir, 'src.ts');
                const dest = join(dir, 'dest.ts');
                await writeFile(src, '// move\n', 'utf-8');
                return fileops.foMove({ from: src, to: dest });
            },
        },
        {
            brick: 'fileops',
            tool: 'fo_rename',
            description: 'Rename file in tmp dir',
            native: async () => {
                const dir = await makeTmpDir();
                const src = join(dir, 'original.ts');
                await writeFile(src, '// rename\n', 'utf-8');
                await fsRename(src, join(dir, 'renamed.ts'));
                return `renamed:${join(dir, 'renamed.ts')}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                fileops.setWorkRoot(dir);
                const src = join(dir, 'original.ts');
                await writeFile(src, '// rename\n', 'utf-8');
                return fileops.foRename({ path: src, name: 'renamed.ts' });
            },
        },
        {
            brick: 'fileops',
            tool: 'fo_delete',
            description: 'Delete a tmp file',
            native: async () => {
                const dir = await makeTmpDir();
                const p = join(dir, 'todelete.ts');
                await writeFile(p, '// del\n', 'utf-8');
                await rm(p);
                return `deleted:${p}`;
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                fileops.setWorkRoot(dir);
                const p = join(dir, 'todelete.ts');
                await writeFile(p, '// del\n', 'utf-8');
                return fileops.foDelete({ path: p });
            },
        },

        // ─── filesearch ─────────────────────────────────────────────────────
        {
            brick: 'filesearch',
            tool: 'fsrch_search',
            description: 'Search "Injectable" in core src',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: () =>
                filesearch.fsrchSearch({ path: CORE_SRC, pattern: 'Injectable' }),
        },
        {
            brick: 'filesearch',
            tool: 'fsrch_replace',
            description: 'Dry-run replace "Injectable" in tmp copy',
            native: async () => {
                // Native: grep to find matches (dry-run equivalent)
                return nativeGrepTs('Injectable', CORE_SRC);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                // Copy a small file to tmp so replace doesn't mutate the fixture
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return filesearch.fsrchReplace({
                    path: dest,
                    pattern: 'Injectable',
                    replacement: 'Injectable',
                    dryRun: true,
                });
            },
        },

        // ─── textsearch ─────────────────────────────────────────────────────
        {
            brick: 'textsearch',
            tool: 'txt_search',
            description: 'Search "Injectable" with context lines',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: () => textsearch.txtSearch({ dir: CORE_SRC, pattern: 'Injectable' }),
        },
        {
            brick: 'textsearch',
            tool: 'txt_regex',
            description: 'Regex search "class\\s+\\w+Injector" in core',
            native: () =>
                Promise.resolve(
                    grepRn('class\\s\\+\\w\\+Injector', CORE_SRC, '*.ts'),
                ),
            brickOp: () =>
                textsearch.txtRegex({ dir: CORE_SRC, pattern: 'class\\s+\\w+Injector' }),
        },
        {
            brick: 'textsearch',
            tool: 'txt_grouped',
            description: 'Grouped search "Injectable" by file',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: () => textsearch.txtGrouped({ dir: CORE_SRC, pattern: 'Injectable' }),
        },
        {
            brick: 'textsearch',
            tool: 'txt_replace',
            description: 'Dry-run replace "Injectable" in tmp copy',
            native: async () => {
                return nativeGrepTs('Injectable', CORE_SRC);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return textsearch.txtReplace({
                    dir,
                    pattern: 'Injectable',
                    replacement: 'Injectable',
                    apply: false,
                });
            },
        },

        // ─── refs ───────────────────────────────────────────────────────────
        {
            brick: 'refs',
            tool: 'refs_references',
            description: 'All refs to "Injector" symbol in core',
            native: () => nativeRefsNative('Injector', CORE_SRC),
            brickOp: () => refs.refsReferences({ name: 'Injector', dir: CORE_SRC }),
        },
        {
            brick: 'refs',
            tool: 'refs_declaration',
            description: 'Declaration of "Injector" symbol in core',
            native: () => nativeGrepTs('export.*class.*Injector', CORE_SRC),
            brickOp: () => refs.refsDeclaration({ name: 'Injector', dir: CORE_SRC }),
        },
        {
            brick: 'refs',
            tool: 'refs_hierarchy',
            description: 'Class hierarchy of "Injector" in core',
            native: () => nativeGrepTs('Injector', CORE_SRC),
            brickOp: () => refs.refsHierarchy({ name: 'Injector', dir: CORE_SRC }),
        },
        {
            brick: 'refs',
            tool: 'refs_implementations',
            description: 'Implementations of "Injector" interface in core',
            native: () => nativeGrepTs('implements.*Injector', CORE_SRC),
            brickOp: () => refs.refsImplementations({ name: 'Injector', dir: CORE_SRC }),
        },

        // ─── symbol ─────────────────────────────────────────────────────────
        {
            brick: 'symbol',
            tool: 'sym_find',
            description: 'Find all symbols named "Injector" in core',
            native: () => nativeGrepTs('Injector', CORE_SRC),
            brickOp: () => symbol.symFind({ name: 'Injector', dir: CORE_SRC }),
        },
        {
            brick: 'symbol',
            tool: 'sym_get',
            description: 'Get single "Injector" symbol metadata',
            native: () => nativeGrepTs('class Injector', CORE_SRC),
            brickOp: () => symbol.symGet({ name: 'Injector', dir: CORE_SRC }),
        },
        {
            brick: 'symbol',
            tool: 'sym_bulk',
            description: 'Bulk get ["Injector","Injectable"] metadata',
            native: () => nativeGrepTs('Injector\\|Injectable', CORE_SRC),
            brickOp: () =>
                symbol.symBulk({ names: ['Injector', 'Injectable'], dir: CORE_SRC }),
        },
        {
            brick: 'symbol',
            tool: 'sym_body',
            description: 'Get body of Injector (lines 1-50 of injector.ts)',
            native: () => Promise.resolve(nativeSed(INJECTOR_FILE, 1, 50)),
            brickOp: () =>
                symbol.symBody({ file: INJECTOR_FILE, startLine: 1, endLine: 50 }),
        },

        // ─── rename ─────────────────────────────────────────────────────────
        {
            brick: 'rename',
            tool: 'ren_preview',
            description: 'Preview rename "Injector" occurrences in core',
            native: () => nativeGrepTs('Injector', CORE_SRC),
            brickOp: () => rename.renPreview({ dir: CORE_SRC, oldName: 'Injector' }),
        },
        {
            brick: 'rename',
            tool: 'ren_symbol',
            description: 'Dry-run rename "Injector" → "InjectorV2" in tmp',
            native: async () => {
                // Native: grep all occurrences (what an agent would do without this tool)
                return nativeGrepTs('Injector', CORE_SRC);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return rename.renSymbol({ dir, oldName: 'Injector', newName: 'InjectorV2', apply: false });
            },
        },
        {
            brick: 'rename',
            tool: 'ren_file',
            description: 'Dry-run rename file in tmp',
            native: async () => {
                return nativeGrepTs('Injector', CORE_SRC);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = join(dir, 'original.ts');
                await writeFile(src, '// hello\n', 'utf-8');
                return rename.renFile({ path: src, newName: 'renamed.ts', apply: false });
            },
        },
        {
            brick: 'rename',
            tool: 'ren_bulk',
            description: 'Dry-run bulk rename 2 symbols in tmp',
            native: async () => {
                return nativeGrepTs('Injector', CORE_SRC);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return rename.renBulk({
                    dir,
                    renames: [
                        { oldName: 'Injector', newName: 'InjectorV2' },
                        { oldName: 'Injectable', newName: 'InjectableV2' },
                    ],
                    apply: false,
                });
            },
        },

        // ─── multiread ──────────────────────────────────────────────────────
        {
            brick: 'multiread',
            tool: 'mr_batch',
            description: `Batch read ${tsFiles5.length} TS files`,
            native: () => nativeReadMultiple(tsFiles5),
            brickOp: () => multiread.mrBatch({ paths: tsFiles5 }),
        },
        {
            brick: 'multiread',
            tool: 'mr_dedup',
            description: `Dedup read ${tsFiles5.length} TS files (some duplicated)`,
            native: () =>
                nativeReadMultiple([...new Set(tsFiles5)]),
            brickOp: () =>
                multiread.mrDedup({ paths: [...tsFiles5, ...(tsFiles5.slice(0, 2))] }),
        },
        {
            brick: 'multiread',
            tool: 'mr_merge',
            description: `Merge ${tsFiles5.length} TS files with separators`,
            native: () => nativeReadMultiple(tsFiles5),
            brickOp: () => multiread.mrMerge({ paths: tsFiles5 }),
        },

        // ─── filediff ───────────────────────────────────────────────────────
        {
            brick: 'filediff',
            tool: 'fd_diff',
            description: 'Diff two TS files (unified format)',
            native: () => Promise.resolve(nativeDiff(diffA, diffB)),
            brickOp: () => filediff.fdDiff({ a: diffA, b: diffB }),
        },
        {
            brick: 'filediff',
            tool: 'fd_delta',
            description: 'Delta (line-level) between two file contents',
            native: async () => {
                const a = await readFile(diffA, 'utf-8');
                const b = await readFile(diffB, 'utf-8');
                return nativeDiff(diffA, diffB) || `${a.length} vs ${b.length} chars`;
            },
            brickOp: async () => {
                const a = await readFile(diffA, 'utf-8');
                const b = await readFile(diffB, 'utf-8');
                return filediff.fdDelta({ before: a, after: b });
            },
        },
        {
            brick: 'filediff',
            tool: 'fd_patch',
            description: 'Apply a simple unified patch to tmp file',
            native: async () => {
                // Native: just reading the diff output
                return nativeDiff(diffA, diffB);
            },
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = join(dir, 'target.ts');
                const content = await readFile(diffA, 'utf-8');
                await writeFile(src, content, 'utf-8');
                const patch = nativeDiff(diffA, diffB);
                if (!patch) {
                    return { content: content };
                }
                return filediff.fdPatch({ path: src, patch });
            },
        },

        // ─── compress (transform — native baseline = raw content) ────────────
        {
            brick: 'compress',
            tool: 'cmp_output',
            description: 'Compress injector.ts (medium level)',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: async () => {
                const text = await nativeReadFile(INJECTOR_FILE);
                return compress.cmpOutput({ text, level: 'medium' });
            },
        },
        {
            brick: 'compress',
            tool: 'cmp_terse',
            description: 'Terse (identifiers only) of injector.ts',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: async () => {
                const text = await nativeReadFile(INJECTOR_FILE);
                return compress.cmpTerse({ text });
            },
        },

        // ─── format (transform — native baseline = raw JSON) ─────────────────
        {
            brick: 'format',
            tool: 'fmt_json',
            description: 'Format raw package.json (pretty-print)',
            native: () => nativePackageJson(TEST_REPO),
            brickOp: async () => {
                const data = await nativePackageJson(TEST_REPO);
                return format.fmtJson({ data, indent: 2 });
            },
        },

        // ─── fts (stateful index — multi-phase) ──────────────────────────────
        {
            brick: 'fts',
            tool: 'fts_search',
            description: 'FTS search "Injectable" after indexing core',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: async () => {
                await fts.ftsIndex({ dir: CORE_SRC });
                return fts.ftsSearch({ query: 'Injectable', limit: 10 });
            },
        },
        {
            brick: 'fts',
            tool: 'fts_index',
            description: 'Index core source directory',
            native: () => Promise.resolve(nativeFindTs(CORE_SRC)),
            brickOp: async () => {
                fts._resetFtsIndex();
                return fts.ftsIndex({ dir: CORE_SRC });
            },
        },
        {
            brick: 'fts',
            tool: 'fts_rank',
            description: 'Rank files by relevance to "Injectable"',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: async () => {
                await fts.ftsIndex({ dir: CORE_SRC });
                return fts.ftsRank({ query: 'Injectable', files: tsFiles5 });
            },
        },
        {
            brick: 'fts',
            tool: 'fts_suggest',
            description: 'Suggest completions for "Inject" prefix',
            native: () => nativeGrepTs('^Inject', CORE_SRC),
            brickOp: async () => {
                await fts.ftsIndex({ dir: CORE_SRC });
                return fts.ftsSuggest({ prefix: 'Inject', limit: 10 });
            },
        },

        // ─── routes ─────────────────────────────────────────────────────────
        {
            brick: 'routes',
            tool: 'rt_scan',
            description: 'Scan HTTP routes in core src',
            native: () => nativeGrepTs('router\\|app\\.get\\|app\\.post\\|@Get\\|@Post', CORE_SRC),
            brickOp: () => routes.rtScan({ dir: CORE_SRC }),
        },
        {
            brick: 'routes',
            tool: 'rt_search',
            description: 'Search routes matching "/api" pattern',
            native: () => nativeGrepTs('/api', CORE_SRC),
            brickOp: () => routes.rtSearch({ dir: CORE_SRC, pattern: '/api' }),
        },
        {
            brick: 'routes',
            tool: 'rt_list',
            description: 'List all routes as table',
            native: () => nativeGrepTs('router\\|app\\.', CORE_SRC),
            brickOp: () => routes.rtList({ dir: CORE_SRC }),
        },
        {
            brick: 'routes',
            tool: 'rt_frameworks',
            description: 'Detect frameworks used in core',
            native: () => nativePackageJson(TEST_REPO),
            brickOp: () => routes.rtFrameworks({ dir: CORE_SRC }),
        },

        // ─── inline ─────────────────────────────────────────────────────────
        {
            brick: 'inline',
            tool: 'inl_extract',
            description: 'Extract lines 10-30 of injector.ts into a function (dry-run)',
            native: () => Promise.resolve(nativeSed(INJECTOR_FILE, 10, 30)),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const dest = join(dir, 'injector.ts');
                await copyFile(INJECTOR_FILE, dest);
                return inline.inlExtract({
                    path: dest,
                    startLine: 10,
                    endLine: 30,
                    functionName: 'extractedFn',
                    apply: false,
                });
            },
        },
        {
            brick: 'inline',
            tool: 'inl_inline',
            description: 'Inline a function occurrence (dry-run)',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return inline.inlInline({ path: dest, name: 'Injectable', apply: false });
            },
        },
        {
            brick: 'inline',
            tool: 'inl_move',
            description: 'Move symbol between files (dry-run)',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest1 = join(dir, 'source.ts');
                const dest2 = join(dir, 'target.ts');
                await copyFile(src, dest1);
                await writeFile(dest2, '// target\n', 'utf-8');
                return inline.inlMove({
                    sourcePath: dest1,
                    targetPath: dest2,
                    name: 'Injectable',
                    apply: false,
                });
            },
        },

        // ─── impact ─────────────────────────────────────────────────────────
        {
            brick: 'impact',
            tool: 'imp_analyze',
            description: 'Analyze impact of changing injector.ts',
            native: () => nativeRefsNative('Injector', CORE_SRC),
            brickOp: () => impact.impAnalyze({ file: INJECTOR_FILE, dir: CORE_SRC }),
        },
        {
            brick: 'impact',
            tool: 'imp_affected',
            description: 'Find files affected by changes to 3 TS files',
            native: () => nativeRefsNative('Injector', CORE_SRC),
            brickOp: () =>
                impact.impAffected({ files: tsFiles3, dir: CORE_SRC }),
        },
        {
            brick: 'impact',
            tool: 'imp_propagate',
            description: 'Propagate impact from injector.ts (depth 2)',
            native: () => nativeRefsNative('Injector', CORE_SRC),
            brickOp: () =>
                impact.impPropagate({ file: INJECTOR_FILE, dir: CORE_SRC, maxDepth: 2 }),
        },

        // ─── codeedit ────────────────────────────────────────────────────────
        {
            brick: 'codeedit',
            tool: 'ce_insertafter',
            description: 'Insert comment after line 5 (dry-run)',
            native: () => Promise.resolve(nativeSed(INJECTOR_FILE, 1, 10)),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const dest = join(dir, 'injector.ts');
                await copyFile(INJECTOR_FILE, dest);
                return codeedit.ceInsertAfter({
                    path: dest,
                    after: 5,
                    content: '// inserted comment',
                    apply: false,
                    dryRun: true,
                });
            },
        },
        {
            brick: 'codeedit',
            tool: 'ce_insertbefore',
            description: 'Insert comment before line 5 (dry-run)',
            native: () => Promise.resolve(nativeSed(INJECTOR_FILE, 1, 10)),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const dest = join(dir, 'injector.ts');
                await copyFile(INJECTOR_FILE, dest);
                return codeedit.ceInsertBefore({
                    path: dest,
                    before: 5,
                    content: '// inserted before',
                    apply: false,
                    dryRun: true,
                });
            },
        },
        {
            brick: 'codeedit',
            tool: 'ce_replacebody',
            description: 'Replace body of function "constructor" (dry-run)',
            native: () => nativeGrepTs('constructor', CORE_SRC),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const dest = join(dir, 'injector.ts');
                await copyFile(INJECTOR_FILE, dest);
                return codeedit.ceReplaceBody({
                    path: dest,
                    name: 'constructor',
                    newBody: '// replaced',
                    apply: false,
                    dryRun: true,
                });
            },
        },
        {
            brick: 'codeedit',
            tool: 'ce_safedelete',
            description: 'Safe delete check for symbol (dry-run)',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: async () => {
                const dir = await makeTmpDir();
                const src = tsFiles3[0] ?? INJECTOR_FILE;
                const dest = join(dir, 'test.ts');
                await copyFile(src, dest);
                return codeedit.ceDeleteSafe({
                    path: dest,
                    name: 'Injectable',
                    dir: CORE_SRC,
                    apply: false,
                    dryRun: true,
                });
            },
        },

        // ─── treesitter ──────────────────────────────────────────────────────
        {
            brick: 'treesitter',
            tool: 'ts_index',
            description: 'Index core src with treesitter',
            native: () => Promise.resolve(nativeFindTs(CORE_SRC)),
            brickOp: () => treesitter.tsIndex({ dir: CORE_SRC }),
        },
        {
            brick: 'treesitter',
            tool: 'ts_status',
            description: 'Treesitter index status',
            native: () => Promise.resolve(nativeFindTs(CORE_SRC)),
            brickOp: async () => {
                await treesitter.tsIndex({ dir: CORE_SRC });
                return treesitter.tsStatus();
            },
        },
        {
            brick: 'treesitter',
            tool: 'ts_langs',
            description: 'List supported languages',
            native: () => Promise.resolve('typescript,javascript,python,rust,go,java,php,cpp,c,ruby,go,swift,kotlin,scala,haskell,ocaml'),
            brickOp: async () => {
                await treesitter.tsIndex({ dir: CORE_SRC });
                return treesitter.tsLangs();
            },
        },
        {
            brick: 'treesitter',
            tool: 'ts_reindex',
            description: 'Reindex a single file',
            native: () => nativeReadFile(INJECTOR_FILE),
            brickOp: async () => {
                await treesitter.tsIndex({ dir: CORE_SRC });
                return treesitter.tsReindex({ path: INJECTOR_FILE });
            },
        },
        {
            brick: 'treesitter',
            tool: 'ts_cleanup',
            description: 'Cleanup treesitter index',
            native: () => Promise.resolve(''),
            brickOp: async () => {
                await treesitter.tsIndex({ dir: CORE_SRC });
                return treesitter.tsCleanup();
            },
        },

        // ─── semanticsearch ──────────────────────────────────────────────────
        {
            brick: 'semanticsearch',
            tool: 'sem_search',
            description: 'Semantic search "dependency injection" in core',
            native: () => nativeGrepTs('inject\\|depend', CORE_SRC),
            brickOp: async () => {
                // Build a small corpus from ts files
                const corpus = await Promise.all(
                    tsFiles5.map(async (f) => ({
                        id: f,
                        text: await readFile(f, 'utf-8').catch(() => ''),
                    })),
                );
                return semanticsearch.semSearch({ corpus, query: 'dependency injection', limit: 5 });
            },
        },
        {
            brick: 'semanticsearch',
            tool: 'sem_similar',
            description: 'Find files similar to injector.ts',
            native: () => nativeGrepTs('Injector', CORE_SRC),
            brickOp: async () => {
                const corpus = await Promise.all(
                    tsFiles5.map(async (f) => ({
                        id: f,
                        text: await readFile(f, 'utf-8').catch(() => ''),
                    })),
                );
                const targetId = tsFiles5[0] ?? INJECTOR_FILE;
                return semanticsearch.semSimilar({ corpus, targetId, limit: 3 });
            },
        },
        {
            brick: 'semanticsearch',
            tool: 'sem_intent',
            description: 'Classify intent of "show me the injector"',
            native: () => Promise.resolve('native: no intent classification'),
            brickOp: () =>
                semanticsearch.semIntent({
                    query: 'show me the injector',
                    intents: [
                        { label: 'read_file', examples: ['show file', 'read file', 'open file'] },
                        { label: 'search_symbol', examples: ['find symbol', 'search class', 'where is'] },
                    ],
                }),
        },
        {
            brick: 'semanticsearch',
            tool: 'sem_embeddings',
            description: 'Generate embeddings for 3 short texts',
            native: () =>
                Promise.resolve(
                    'native: no embedding without model — raw text length as proxy',
                ),
            brickOp: () =>
                semanticsearch.semEmbeddings({
                    texts: ['dependency injection', 'module registry', 'event bus'],
                }),
        },
    ];
}

// ─── Measure ──────────────────────────────────────────────────────────────────

async function measure(pair: EquivalencePair): Promise<EquivalenceResult> {
    const native = await pair.native();
    const brick = await pair.brickOp();

    const native_str = typeof native === 'string' ? native : JSON.stringify(native);
    const brick_str = JSON.stringify(brick);

    const native_chars = native_str.length;
    const brick_chars = brick_str.length;
    const native_tokens = countTokens(native);
    const brick_tokens = countTokens(brick);
    const delta_pct =
        native_chars === 0 ? 0 : ((brick_chars - native_chars) / native_chars) * 100;

    return {
        brick: pair.brick,
        tool: pair.tool,
        description: pair.description,
        native_chars,
        brick_chars,
        native_tokens,
        brick_tokens,
        delta_pct,
        status: 'ok',
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    process.stderr.write(`Running static equivalence benchmark...\n`);
    process.stderr.write(`TEST_REPO = ${TEST_REPO}\n\n`);

    const pairs = await buildPairs();
    const results: EquivalenceResult[] = [];

    for (const pair of pairs) {
        try {
            const result = await measure(pair);
            results.push(result);
            const sign = result.delta_pct < 0 ? '' : '+';
            process.stderr.write(
                `  ok  ${pair.brick}.${pair.tool} → ${sign}${result.delta_pct.toFixed(1)}%\n`,
            );
        } catch (e) {
            const msg = (e as Error).message ?? String(e);
            process.stderr.write(`  ERR ${pair.brick}.${pair.tool}: ${msg}\n`);
            results.push({
                brick: pair.brick,
                tool: pair.tool,
                description: pair.description,
                native_chars: 0,
                brick_chars: 0,
                native_tokens: 0,
                brick_tokens: 0,
                delta_pct: 0,
                status: 'error',
                note: msg.slice(0, 120),
            });
        }
    }

    // Add skipped entries to results
    for (const s of SKIPPED) {
        results.push({
            brick: s.brick,
            tool: s.tool,
            description: '',
            native_chars: 0,
            brick_chars: 0,
            native_tokens: 0,
            brick_tokens: 0,
            delta_pct: 0,
            status: 'skip',
            note: s.reason,
        });
    }

    const ok = results.filter((r) => r.status === 'ok');
    const errors = results.filter((r) => r.status === 'error');
    const skipped = results.filter((r) => r.status === 'skip');

    // ─── Markdown report ───────────────────────────────────────────────────

    const sorted = [...ok].sort((a, b) => a.delta_pct - b.delta_pct);

    const tableRows = sorted
        .map((r) => {
            const sign = r.delta_pct < 0 ? '' : '+';
            return `| \`${r.brick}.${r.tool}\` | ${r.description} | ${r.native_tokens.toLocaleString()} | ${r.brick_tokens.toLocaleString()} | **${sign}${r.delta_pct.toFixed(1)}%** |`;
        })
        .join('\n');

    const avgDelta =
        ok.length > 0 ? ok.reduce((sum, r) => sum + r.delta_pct, 0) / ok.length : 0;

    const top10 = sorted.slice(0, 10);

    const top10rows = top10
        .map(
            (r) =>
                `| \`${r.brick}.${r.tool}\` | ${r.description} | ${r.native_tokens.toLocaleString()} | ${r.brick_tokens.toLocaleString()} | **${r.delta_pct.toFixed(1)}%** |`,
        )
        .join('\n');

    const errorRows =
        errors.length > 0
            ? errors
                  .map((r) => `| \`${r.brick}.${r.tool}\` | ${r.note ?? 'unknown error'} |`)
                  .join('\n')
            : '| — | none |';

    // Group skipped by category
    const skipRowsGrouped = (() => {
        const groups: Record<string, SkippedEntry[]> = {};
        for (const s of SKIPPED) {
            const cat = s.reason.split(' — ')[0] ?? s.reason;
            (groups[cat] ??= []).push(s);
        }
        return Object.entries(groups)
            .map(([cat, entries]) => {
                const rows = entries
                    .map((e) => `| \`${e.brick}.${e.tool}\` | ${e.reason} |`)
                    .join('\n');
                return `**${cat}**\n${rows}`;
            })
            .join('\n');
    })();

    const totalNative = ok.reduce((s, r) => s + r.native_tokens, 0);
    const totalBrick = ok.reduce((s, r) => s + r.brick_tokens, 0);
    const overallSavings = totalNative > 0 ? ((totalNative - totalBrick) / totalNative) * 100 : 0;

    const report = `# Static Equivalence Report

Per-tool measurement. No LLM, no variance.
Token approximation: \`Math.ceil(JSON.stringify(output).length / 4)\`
Test fixture: \`${TEST_REPO}\`
Date: ${new Date().toISOString()}

## Full Results (sorted by Δ%, best first)

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
${tableRows}

## Summary

| Metric | Value |
|---|---|
| Tools measured (ok) | ${ok.length} |
| Errors | ${errors.length} |
| Skipped (no native equivalent) | ${skipped.length} |
| Total tools in scope (ok + errors) | ${ok.length + errors.length} |
| Total catalog tools | ${ok.length + errors.length + skipped.length} |
| Coverage % | **${(((ok.length + errors.length) / (ok.length + errors.length + skipped.length)) * 100).toFixed(1)}%** |
| Average Δ% (ok tools) | **${avgDelta.toFixed(1)}%** |
| Total native tokens | ${totalNative.toLocaleString()} |
| Total brick tokens | ${totalBrick.toLocaleString()} |
| Overall token savings | **${overallSavings.toFixed(1)}%** |

## Top 10 Token Savers

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
${top10rows}

## Errors / Skipped

### Errors (${errors.length})

| Tool | Error |
|---|---|
${errorRows}

### Skipped (${skipped.length}) — no direct native equivalent

| Tool | Note |
|---|---|
${skipRowsGrouped}

## Notes

- **compress / format**: Native baseline = raw file content. The brick adds value via
  transformation. Delta reflects compression ratio vs. raw content, not discovery cost.
- **fts_***: Two-phase (index + search). Native baseline is grep (no ranking).
  The brick's value includes precision (TF-IDF ranked results), not just token reduction.
- **fr_read vs native Read**: Expected ~0% — both return full file content wrapped in JSON.
- **mr_batch / mr_dedup / mr_merge**: Native baseline concatenates raw text; brick wraps in JSON envelope.
  For large files the delta approaches 0%; for structured access the JSON format adds value.
- **refs_references**: Native reads 5 matching files in full to simulate what an agent would do.
- **filewrite / fileops / rename / codeedit / inline / filediff(patch)**: Write-side tools
  are measured using tmpdir copies so fixtures are never mutated. Output is a small status
  object vs. raw grep/find output used as native proxy — delta is biased toward 0%.
- **sem_intent / sem_embeddings**: No native LLM equivalent. Native baseline = trivial string.
  Delta reflects structural overhead only.
- **treesitter.***: Native = find(ts files) as proxy; brick builds a richer in-memory index.
- **routes.***: Native = grep for route patterns. Brick parses AST for structured route table.
- **Skipped categories** (${skipped.length} tools): compute pure transforms, stateful multi-call
  (cache/memory/session/share), orchestration (parallel/dispatch/agent/autopilot/batch),
  meta-AI (planning/thinking/debate/decision/review), CLI meta (focus_*), VM (sandbox),
  observability (metrics/heatmap/savings/tokenbudget), API-bound (validate/lastversion),
  workflow/state (repos/task/research/onboarding/fullaudit),
  graph state (graphbuild/graphquery/graphcluster/graphexport/callgraph/depgraph),
  composite (contextpack/smartcontext), trivial wrappers (echo/shell), meta-bundles.
`;

    process.stdout.write(report);
}

main().catch((err: unknown) => {
    process.stderr.write(`Fatal: ${(err as Error).message}\n${(err as Error).stack ?? ''}\n`);
    process.exitCode = 1;
});
