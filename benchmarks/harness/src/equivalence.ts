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
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

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
    const filelist = await import('../../../bricks/filelist/src/operations.js');
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

    // Pre-compute paths
    const tsFiles5 = await collectTsFiles(CORE_SRC, 5);
    const injectorContent = await readFile(INJECTOR_FILE, 'utf-8');
    const injectorLines = injectorContent.split('\n').length;
    const tsFilesForDiff = await collectTsFiles(CORE_SRC, 2);
    const diffA = tsFilesForDiff[0] ?? INJECTOR_FILE;
    const diffB = tsFilesForDiff[1] ?? INJECTOR_FILE;

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

        // ─── filesearch ─────────────────────────────────────────────────────
        {
            brick: 'filesearch',
            tool: 'fsrch_search',
            description: 'Search "Injectable" in core src',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: () =>
                filesearch.fsrchSearch({ path: CORE_SRC, pattern: 'Injectable' }),
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
            tool: 'txt_grouped',
            description: 'Grouped search "Injectable" by file',
            native: () => nativeGrepTs('Injectable', CORE_SRC),
            brickOp: () => textsearch.txtGrouped({ dir: CORE_SRC, pattern: 'Injectable' }),
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

        // ─── rename ─────────────────────────────────────────────────────────
        {
            brick: 'rename',
            tool: 'ren_preview',
            description: 'Preview rename "Injector" occurrences in core',
            native: () => nativeGrepTs('Injector', CORE_SRC),
            brickOp: () => rename.renPreview({ dir: CORE_SRC, oldName: 'Injector' }),
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

        // ─── fts (stateful index — 2-phase) ──────────────────────────────────
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

    const top5 = sorted.slice(0, 5);

    const top5rows = top5
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

    const skipRows =
        skipped.length > 0
            ? skipped
                  .map((r) => `| \`${r.brick}.${r.tool}\` | ${r.note ?? ''} |`)
                  .join('\n')
            : '';

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
| Tools measured | ${ok.length} |
| Errors | ${errors.length} |
| Skipped | ${skipped.length} |
| Average Δ% (all tools) | **${avgDelta.toFixed(1)}%** |
| Total native tokens | ${totalNative.toLocaleString()} |
| Total brick tokens | ${totalBrick.toLocaleString()} |
| Overall token savings | **${overallSavings.toFixed(1)}%** |

## Top 5 Token Savers

| Tool | Description | Native tokens | Brick tokens | Δ% |
|---|---|---:|---:|---:|
${top5rows}

## Errors / Skipped

### Errors (${errors.length})

| Tool | Error |
|---|---|
${errorRows}

${
    skipped.length > 0
        ? `### Skipped (${skipped.length}) — no direct native equivalent

| Tool | Note |
|---|---|
${skipRows}`
        : ''
}

## Notes

- **compress / format**: Native baseline = raw file content. The brick adds value via
  transformation. Delta reflects compression ratio vs. raw content, not discovery cost.
- **fts_search**: Two-phase (index + search). Native baseline is grep (no ranking).
  The brick's value includes precision (TF-IDF ranked results), not just token reduction.
- **fr_read vs native Read**: Expected ~0% — both return full file content wrapped in JSON.
- **mr_batch / mr_merge**: Native baseline concatenates raw text; brick wraps in JSON envelope.
  For large files the delta approaches 0%; for structured access the JSON format adds value.
- **refs_references**: Native reads 5 matching files in full to simulate what an agent would do.
`;

    process.stdout.write(report);
}

main().catch((err: unknown) => {
    process.stderr.write(`Fatal: ${(err as Error).message}\n${(err as Error).stack ?? ''}\n`);
    process.exitCode = 1;
});
