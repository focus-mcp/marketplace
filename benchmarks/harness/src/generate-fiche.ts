/**
 * generate-fiche.ts — generates benchmarks/bricks/<name>.md from a native + brick JSON pair.
 *
 * Usage (standalone):
 *   pnpm tsx src/generate-fiche.ts <native.json> <brick.json>
 *
 * Returns the path to the written fiche file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { type RunResult, type BrickManifest, BRICKS_DIR, extractResultBlock } from './runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson(p: string): RunResult {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as RunResult;
}

function loadManifest(brickName: string): BrickManifest {
    const p = path.join(BRICKS_DIR, brickName, 'mcp-brick.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as BrickManifest;
}

function delta(n: number, b: number, warnIfPositive = false): string {
    if (n === 0) return 'n/a';
    const pct = ((b - n) / n) * 100;
    const sign = pct > 0 ? '+' : '';
    const str = `${sign}${pct.toFixed(1)}%`;
    if (warnIfPositive && pct > 0) return `${str} ⚠️`;
    return str;
}

function durationDelta(nativeMs: number, brickMs: number): string {
    if (nativeMs === 0) return 'n/a';
    const pct = ((brickMs - nativeMs) / nativeMs) * 100;
    const sign = pct > 0 ? '+' : '';
    const str = `${sign}${pct.toFixed(0)}%`;
    return pct > 20 ? `${str} ⚠️` : str;
}

function fmt(n: number): string {
    return n.toLocaleString('en-US');
}

/**
 * Extract a single-line field value from a Result block.
 * For multi-line values (code fences), captures everything up to the closing fence.
 */
function extractField(resultBlock: string, field: string): string {
    // Match the field label and everything after the colon on the same line
    const re = new RegExp(`\\*\\*${field}\\*\\*\\s*:\\s*([\\s\\S]*?)(?=\\n- \\*\\*|$)`);
    const m = resultBlock.match(re);
    if (!m) return '—';
    const raw = m[1].trim();
    // If the answer starts with a code fence, return the full fenced block trimmed to a reasonable length
    if (raw.startsWith('```')) {
        const lines = raw.split('\n');
        // Return first 5 paths as a sample, note count if truncated
        const pathLines = lines.filter((l) => l && !l.startsWith('```'));
        const sample = pathLines.slice(0, 5).join('\n');
        const suffix = pathLines.length > 5 ? `\n... (${pathLines.length} total)` : '';
        return `\`\`\`\n${sample}${suffix}\n\`\`\``;
    }
    return raw;
}

function extractNotesLine(resultBlock: string): string {
    return extractField(resultBlock, 'Notes');
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateFiche(nativeResult: RunResult, brickResult: RunResult): string {
    const brickName = nativeResult.brick;
    const manifest = loadManifest(brickName);

    const nu = nativeResult.usage;
    const bu = brickResult.usage;

    // Tool coverage: which brick tools were actually called
    // calledToolNames holds short names after stripping "mcp__focus__<prefix>_"
    const brickToolPrefix = `mcp__focus__${manifest.prefix}_`;
    const calledBrickTools = brickResult.tools_used.filter((t) => t.startsWith(brickToolPrefix));
    const calledToolNames = new Set(calledBrickTools.map((t) => t.slice(brickToolPrefix.length)));
    const coverageScore = `${calledToolNames.size}/${manifest.tools.length}`;

    // notCalledTools: manifest tool short names NOT in calledToolNames
    const notCalledToolNames = manifest.tools
        .map((t) => t.name)
        .filter((n) => !calledToolNames.has(n));

    const toolCoverageLines = manifest.tools
        .map((t) => {
            const called = calledToolNames.has(t.name);
            return `- \`${manifest.prefix}_${t.name}\` : ${called ? 'called ✓' : 'not called ⚠️'}`;
        })
        .join('\n');

    // Answers
    const nativeAnswer = extractField(nativeResult.result_block, 'Answer');
    const brickAnswer = extractField(brickResult.result_block, 'Answer');

    // Match heuristic
    let matchLabel: string;
    if (!nativeAnswer || !brickAnswer || nativeAnswer === '—' || brickAnswer === '—') {
        matchLabel = '? (missing)';
    } else {
        const na = nativeAnswer.toLowerCase();
        const ba = brickAnswer.toLowerCase();
        if (na.includes('partial') || ba.includes('partial') ||
            na.includes('not found') || ba.includes('not found')) {
            matchLabel = 'partial';
        } else if (na === ba) {
            matchLabel = '✓ identical';
        } else {
            // For file-list answers, compare sets of paths (ignore order)
            const extractPaths = (s: string) =>
                s.split('\n').map((l) => l.trim()).filter((l) => l.includes('/') && !l.startsWith('`'));
            const np = new Set(extractPaths(na));
            const bp = new Set(extractPaths(ba));
            if (np.size > 0 && np.size === bp.size && [...np].every((p) => bp.has(p))) {
                matchLabel = '✓ same set (order may differ)';
            } else {
                matchLabel = 'divergent (manual check needed)';
            }
        }
    }

    // Auto-detected issues
    const issues: string[] = [];
    if (notCalledToolNames.length > 0) {
        issues.push(`Tools not called: ${notCalledToolNames.map((n) => `\`${manifest.prefix}_${n}\``).join(', ')}`);
    }
    if (brickResult.turns > 15) {
        issues.push(`Turns > 15 (brick): ${brickResult.turns}`);
    }
    if (nativeResult.turns > 15) {
        issues.push(`Turns > 15 (native): ${nativeResult.turns}`);
    }
    const brickAnswer2 = brickAnswer.toLowerCase();
    if (brickAnswer2.includes('partial') || brickAnswer2.includes('not found')) {
        issues.push(`Brick answer is partial/not found`);
    }
    if (brickResult.focus_stderr) {
        issues.push(`focus_stderr non-empty: "${brickResult.focus_stderr.slice(0, 120)}..."`);
    }
    // Extract agent notes mentioning limitations
    const brickNotes = extractNotesLine(brickResult.result_block).toLowerCase();
    const nativeNotes = extractNotesLine(nativeResult.result_block).toLowerCase();
    const limitationWords = ['bug', 'limitation', 'fallback', 'not support', 'no support', 'failed', 'error'];
    const brickLimitations = limitationWords.filter((w) => brickNotes.includes(w));
    const nativeLimitations = limitationWords.filter((w) => nativeNotes.includes(w));
    if (brickLimitations.length > 0) {
        issues.push(`Brick notes flagged: ${brickLimitations.join(', ')} — "${extractNotesLine(brickResult.result_block).slice(0, 200)}"`);
    }
    if (nativeLimitations.length > 0) {
        issues.push(`Native notes flagged: ${nativeLimitations.join(', ')} — "${extractNotesLine(nativeResult.result_block).slice(0, 200)}"`);
    }
    if (brickResult.exit_reason !== 'ok') {
        issues.push(`Brick exit_reason: ${brickResult.exit_reason}`);
    }
    if (nativeResult.duration_ms > 0) {
        const durPct = ((brickResult.duration_ms - nativeResult.duration_ms) / nativeResult.duration_ms) * 100;
        if (durPct > 20) {
            issues.push(`Brick slower than native by ${durPct.toFixed(0)}% (UX concern)`);
        }
    }
    if (bu.total > nu.total) {
        issues.push(`Brick uses MORE tokens than native (${fmt(bu.total)} vs ${fmt(nu.total)})`);
    }

    const issuesSection =
        issues.length === 0
            ? '_None detected_'
            : issues.map((i) => `- ${i}`).join('\n');

    const taskSpec = nativeResult.mini_task_spec ?? '_(not available)_';

    const fiche = `# Fiche brick — ${brickName}

**Domaine** : ${manifest.description}
**Prefix** : \`${manifest.prefix}\`
**Tools** : ${manifest.tools.length} (${manifest.tools.map((t) => `\`${t.name}\``).join(', ')})

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | ${fmt(nu.total)} | ${fmt(bu.total)} | ${delta(nu.total, bu.total, true)} |
| cache_creation | ${fmt(nu.cache_creation_input_tokens)} | ${fmt(bu.cache_creation_input_tokens)} | |
| cache_read | ${fmt(nu.cache_read_input_tokens)} | ${fmt(bu.cache_read_input_tokens)} | |
| output | ${fmt(nu.output_tokens)} | ${fmt(bu.output_tokens)} | |
| Turns (SDK) | ${nativeResult.turns} | ${brickResult.turns} | |
| Duration (s) | ${(nativeResult.duration_ms / 1000).toFixed(1)} | ${(brickResult.duration_ms / 1000).toFixed(1)} | ${durationDelta(nativeResult.duration_ms, brickResult.duration_ms)} |

## Mini-task (iso)

${taskSpec}

## Tool coverage (brick mode)

${toolCoverageLines}

**Coverage score**: ${coverageScore} tools used

## Answers comparison

**Native answer**: ${nativeAnswer}

**Brick answer**: ${brickAnswer}

**Match**: ${matchLabel}

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

${issuesSection}

## Recommendations

_(empty — to be filled after analysis)_
`;

    // Write to benchmarks/bricks/<name>.md
    const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
    const MARKETPLACE_DIR = path.resolve(HARNESS_DIR, '../..');
    const fichesDir = path.join(MARKETPLACE_DIR, 'benchmarks', 'bricks');
    fs.mkdirSync(fichesDir, { recursive: true });
    const fichePath = path.join(fichesDir, `${brickName}.md`);
    fs.writeFileSync(fichePath, fiche);
    return fichePath;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] && path.basename(process.argv[1]) === 'generate-fiche.ts') {
    const [, , nativePath, brickPath] = process.argv;
    if (!nativePath || !brickPath) {
        console.error('Usage: tsx src/generate-fiche.ts <native.json> <brick.json>');
        process.exit(1);
    }
    const native = loadJson(nativePath);
    const brick = loadJson(brickPath);
    const fichePath = generateFiche(native, brick);
    console.log(`Fiche written to: ${fichePath}`);
}
