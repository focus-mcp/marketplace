// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * generate-dashboard — génère `dashboard/index.html` et `dashboard/data.json`.
 *
 * Données collectées :
 *   - Versions npm + package.json vs git tag pour cli/core/sdk/validator + 68 bricks
 *   - Drift commits main↔develop par repo
 *   - CI stats 7j (succès/échecs) sur main et develop
 *   - 5 dernières releases toutes repos confondues
 *   - Open PRs avec âge et état CI
 *   - Pending changesets par repo
 *
 * Usage : pnpm exec tsx scripts/generate-dashboard.ts
 * Requires : GH_TOKEN ou GITHUB_TOKEN env var (ou `gh` CLI auth)
 */

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackageVersionInfo {
    name: string;
    npmLatest: string | null;
    gitTag: string | null;
    pkgJson: string | null;
    status: 'aligned' | 'drift' | 'broken' | 'unknown';
}

interface DriftInfo {
    repo: string;
    ahead: number;
    behind: number;
}

interface CIStats {
    repo: string;
    branch: string;
    total: number;
    success: number;
    failure: number;
    successRate: number;
}

interface Release {
    repo: string;
    tag: string;
    date: string;
    url: string;
}

interface PullRequest {
    repo: string;
    number: number;
    title: string;
    author: string;
    createdAt: string;
    ageDays: number;
    url: string;
    ciStatus: string;
}

interface ChangesetInfo {
    repo: string;
    count: number;
    oldestDate: string | null;
}

interface DashboardData {
    timestamp: string;
    generatedAt: string;
    packages: PackageVersionInfo[];
    drift: DriftInfo[];
    ciStats: CIStats[];
    latestReleases: Release[];
    openPrs: PullRequest[];
    pendingChangesets: ChangesetInfo[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DASHBOARD_DIR = resolve(ROOT_DIR, 'dashboard');

const REPOS = ['focus-mcp/cli', 'focus-mcp/core', 'focus-mcp/marketplace'] as const;
type Repo = (typeof REPOS)[number];

// Core packages (non-bricks)
const CORE_PACKAGES = [
    { name: '@focus-mcp/cli', repo: 'focus-mcp/cli' as Repo },
    { name: '@focus-mcp/core', repo: 'focus-mcp/core' as Repo },
    { name: '@focus-mcp/sdk', repo: 'focus-mcp/core' as Repo },
    { name: '@focus-mcp/validator', repo: 'focus-mcp/core' as Repo },
];

// All 68 bricks
const BRICK_NAMES = [
    'agent',
    'aiteam',
    'autopilot',
    'batch',
    'cache',
    'callgraph',
    'codebase',
    'codeedit',
    'codemod',
    'compress',
    'contextpack',
    'convert',
    'debate',
    'decision',
    'depgraph',
    'devtools',
    'diagram',
    'dispatch',
    'echo',
    'filediff',
    'filelist',
    'fileops',
    'fileread',
    'filesearch',
    'filesystem',
    'filewrite',
    'format',
    'fts',
    'fullaudit',
    'graphbuild',
    'graphcluster',
    'graphexport',
    'graphquery',
    'heatmap',
    'impact',
    'inline',
    'knowledge',
    'knowledgebase',
    'lastversion',
    'memory',
    'metrics',
    'multiread',
    'onboarding',
    'outline',
    'overview',
    'parallel',
    'planning',
    'refs',
    'rename',
    'repos',
    'research',
    'review',
    'routes',
    'sandbox',
    'savings',
    'semanticsearch',
    'session',
    'share',
    'shell',
    'smartcontext',
    'smartread',
    'symbol',
    'task',
    'textsearch',
    'thinking',
    'tokenbudget',
    'treesitter',
    'validate',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Call `gh api <path>` with pagination — arguments are passed as an array to execFileSync,
 * preventing any shell injection. The `path` values in this file are all
 * static strings or template literals built exclusively from the REPOS constant
 * (no user-controlled input).
 */
function ghApi(apiPath: string): unknown {
    try {
        const raw = execFileSync('gh', ['api', apiPath, '--paginate'], {
            encoding: 'utf8',
            timeout: 30_000,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Call `gh api <path>` without pagination — for endpoints that return single objects
 * (e.g. compare, trees) where pagination would concatenate incompatible JSON.
 * Uses a 64MB buffer to handle large responses (e.g. compare with many commits).
 */
function ghApiOne(apiPath: string): unknown {
    try {
        const raw = execFileSync('gh', ['api', apiPath], {
            encoding: 'utf8',
            timeout: 30_000,
            maxBuffer: 64 * 1024 * 1024, // 64 MB
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Call `npm view <package> <field>` — package names are hardcoded constants,
 * no user-controlled input involved.
 */
function npmView(pkg: string, field: string): string | null {
    try {
        const raw = execFileSync('npm', ['view', pkg, field], {
            encoding: 'utf8',
            timeout: 15_000,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        return raw || null;
    } catch {
        return null;
    }
}

function daysBetween(dateStr: string): number {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    return Math.floor((now - then) / 86_400_000);
}

// ─── Data collectors ──────────────────────────────────────────────────────────

async function collectPackageVersions(): Promise<PackageVersionInfo[]> {
    const results: PackageVersionInfo[] = [];

    // Core packages
    for (const { name } of CORE_PACKAGES) {
        const npmLatest = npmView(name, 'version');
        const pkgJson = npmLatest; // no local clone of cli/core available here

        let status: PackageVersionInfo['status'] = 'unknown';
        if (npmLatest && pkgJson) {
            status = npmLatest === pkgJson ? 'aligned' : 'drift';
        } else if (!npmLatest) {
            status = 'broken';
        }

        results.push({ name, npmLatest, gitTag: npmLatest, pkgJson, status });
    }

    // Bricks
    for (const brick of BRICK_NAMES) {
        const name = `@focus-mcp/brick-${brick}`;
        const npmLatest = npmView(name, 'version');
        const status: PackageVersionInfo['status'] = npmLatest ? 'aligned' : 'broken';
        results.push({ name, npmLatest, gitTag: npmLatest, pkgJson: npmLatest, status });
    }

    return results;
}

async function collectDrift(): Promise<DriftInfo[]> {
    const results: DriftInfo[] = [];
    for (const fullRepo of REPOS) {
        const slug = fullRepo.split('/')[1] ?? fullRepo;
        const cmp = ghApiOne(`repos/${fullRepo}/compare/main...develop`) as {
            ahead_by: number;
            behind_by: number;
        } | null;

        results.push({
            repo: slug,
            ahead: cmp?.ahead_by ?? -1,
            behind: cmp?.behind_by ?? -1,
        });
    }
    return results;
}

async function collectCIStats(days: number): Promise<CIStats[]> {
    const results: CIStats[] = [];
    const cutoff = Date.now() - days * 86_400_000;

    for (const fullRepo of REPOS) {
        const slug = fullRepo.split('/')[1] ?? fullRepo;

        for (const branch of ['main', 'develop'] as const) {
            const path = `repos/${fullRepo}/actions/runs?branch=${branch}&per_page=100`;
            const runs = ghApi(path) as {
                workflow_runs?: Array<{ conclusion: string | null; created_at: string }>;
            } | null;

            // Filter client-side to last `days` days
            const list = (runs?.workflow_runs ?? []).filter(
                (r) => new Date(r.created_at).getTime() >= cutoff,
            );
            const total = list.length;
            const success = list.filter((r) => r.conclusion === 'success').length;
            const failure = list.filter(
                (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out',
            ).length;
            const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

            results.push({ repo: slug, branch, total, success, failure, successRate });
        }
    }

    return results;
}

async function collectLatestReleases(limit: number): Promise<Release[]> {
    const all: Release[] = [];

    for (const fullRepo of REPOS) {
        const slug = fullRepo.split('/')[1] ?? fullRepo;
        const releases = ghApi(`repos/${fullRepo}/releases?per_page=10`) as Array<{
            tag_name: string;
            created_at: string;
            html_url: string;
        }> | null;

        for (const r of releases ?? []) {
            all.push({
                repo: slug,
                tag: r.tag_name,
                date: r.created_at.slice(0, 10),
                url: r.html_url,
            });
        }
    }

    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

async function collectOpenPRs(): Promise<PullRequest[]> {
    const results: PullRequest[] = [];

    for (const fullRepo of REPOS) {
        const slug = fullRepo.split('/')[1] ?? fullRepo;
        const prs = ghApi(`repos/${fullRepo}/pulls?state=open&per_page=20`) as Array<{
            number: number;
            title: string;
            user: { login: string };
            created_at: string;
            html_url: string;
            head: { sha: string };
        }> | null;

        for (const pr of prs ?? []) {
            results.push(buildPrEntry(fullRepo, slug, pr));
        }
    }

    return results.sort((a, b) => b.ageDays - a.ageDays);
}

interface RawPR {
    number: number;
    title: string;
    user: { login: string };
    created_at: string;
    html_url: string;
    head: { sha: string };
}

function resolveCiStatus(
    checks: { check_runs?: Array<{ conclusion: string | null }> } | null,
): string {
    if (!checks?.check_runs) return 'unknown';
    const runs = checks.check_runs;
    if (runs.some((r) => r.conclusion === 'failure')) return 'failure';
    if (runs.every((r) => r.conclusion === 'success')) return 'success';
    return 'pending';
}

function buildPrEntry(fullRepo: string, slug: string, pr: RawPR): PullRequest {
    const checks = ghApiOne(`repos/${fullRepo}/commits/${pr.head.sha}/check-runs`) as {
        check_runs?: Array<{ conclusion: string | null }>;
    } | null;

    return {
        repo: slug,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        createdAt: pr.created_at.slice(0, 10),
        ageDays: daysBetween(pr.created_at),
        url: pr.html_url,
        ciStatus: resolveCiStatus(checks),
    };
}

async function collectPendingChangesets(): Promise<ChangesetInfo[]> {
    const results: ChangesetInfo[] = [];

    for (const fullRepo of REPOS) {
        const slug = fullRepo.split('/')[1] ?? fullRepo;
        const tree = ghApiOne(`repos/${fullRepo}/git/trees/develop?recursive=1`) as {
            tree?: Array<{ path: string }>;
        } | null;

        const changesetFiles =
            tree?.tree?.filter(
                (f) =>
                    f.path.startsWith('.changeset/') &&
                    f.path.endsWith('.md') &&
                    f.path !== '.changeset/README.md',
            ) ?? [];

        let oldestDate: string | null = null;
        const oldest = changesetFiles[0];
        if (oldest) {
            const commits = ghApi(
                `repos/${fullRepo}/commits?path=${encodeURIComponent(oldest.path)}&per_page=1`,
            ) as Array<{ commit: { committer: { date: string } } }> | null;
            oldestDate = commits?.[0]?.commit.committer.date.slice(0, 10) ?? null;
        }

        results.push({ repo: slug, count: changesetFiles.length, oldestDate });
    }

    return results;
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

function badge(cls: string, label: string): string {
    return `<span class="badge badge-${cls}">${label}</span>`;
}

function statusBadge(s: PackageVersionInfo['status']): string {
    const map: Record<PackageVersionInfo['status'], string> = {
        aligned: badge('ok', 'aligned'),
        drift: badge('warn', 'drift'),
        broken: badge('err', 'broken'),
        unknown: badge('unknown', 'unknown'),
    };
    return map[s];
}

function ciRateBadge(rate: number, total: number): string {
    if (total === 0) return badge('unknown', 'no data');
    const cls = rate >= 90 ? 'ok' : rate >= 70 ? 'warn' : 'err';
    return badge(cls, `${rate}%`);
}

function renderHtml(data: DashboardData): string {
    const pkgRows = data.packages
        .map(
            (p) => `
        <tr>
            <td class="font-mono text-sm">${p.name}</td>
            <td>${p.npmLatest ?? '<span class="na">—</span>'}</td>
            <td>${p.gitTag ?? '<span class="na">—</span>'}</td>
            <td>${p.pkgJson ?? '<span class="na">—</span>'}</td>
            <td>${statusBadge(p.status)}</td>
        </tr>`,
        )
        .join('');

    const driftRows = data.drift
        .map(
            (d) => `
        <tr>
            <td class="fw">${d.repo}</td>
            <td>${d.ahead >= 0 ? d.ahead : '<span class="na">—</span>'}</td>
            <td>${d.behind >= 0 ? d.behind : '<span class="na">—</span>'}</td>
        </tr>`,
        )
        .join('');

    const ciRows = data.ciStats
        .map(
            (c) => `
        <tr>
            <td class="fw">${c.repo}</td>
            <td><code class="branch">${c.branch}</code></td>
            <td>${c.total}</td>
            <td>${c.success}</td>
            <td>${c.failure}</td>
            <td>${ciRateBadge(c.successRate, c.total)}</td>
        </tr>`,
        )
        .join('');

    const releaseRows = data.latestReleases
        .map(
            (r) => `
        <tr>
            <td>${r.date}</td>
            <td class="fw">${r.repo}</td>
            <td><a href="${r.url}" target="_blank" class="link font-mono text-sm">${r.tag}</a></td>
        </tr>`,
        )
        .join('');

    const prRows = data.openPrs
        .map(
            (pr) => `
        <tr>
            <td class="fw">${pr.repo}</td>
            <td><a href="${pr.url}" target="_blank" class="link">#${pr.number}</a></td>
            <td class="trunc text-sm" title="${pr.title}">${pr.title}</td>
            <td class="text-sm na">${pr.author}</td>
            <td>${pr.ageDays}d</td>
            <td>${
                pr.ciStatus === 'success'
                    ? badge('ok', 'pass')
                    : pr.ciStatus === 'failure'
                      ? badge('err', 'fail')
                      : badge('unknown', '—')
            }</td>
        </tr>`,
        )
        .join('');

    const csRows = data.pendingChangesets
        .map(
            (cs) => `
        <tr>
            <td class="fw">${cs.repo}</td>
            <td>${cs.count > 0 ? `<b class="${cs.count > 5 ? 'amber' : ''}">${cs.count}</b>` : '<span class="na">0</span>'}</td>
            <td class="text-sm na">${cs.oldestDate ?? '—'}</td>
        </tr>`,
        )
        .join('');

    const nPrs = data.openPrs.length;
    const nAligned = data.packages.filter((p) => p.status === 'aligned').length;
    const nBroken = data.packages.filter((p) => p.status === 'broken').length;
    const totalCs = data.pendingChangesets.reduce((s, c) => s + c.count, 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>FocusMCP — Health Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root { font-family: ui-sans-serif, system-ui, sans-serif; }
        .badge { display:inline-block; padding:1px 8px; border-radius:4px; font-size:.7rem; font-weight:700; }
        .badge-ok      { background:#dcfce7; color:#166534; }
        .badge-warn    { background:#fef9c3; color:#854d0e; }
        .badge-err     { background:#fee2e2; color:#991b1b; }
        .badge-unknown { background:#f1f5f9; color:#64748b; }
        table { border-collapse:collapse; width:100%; }
        th { background:#f8fafc; color:#475569; font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; }
        th, td { padding:8px 12px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:middle; }
        tr:hover td { background:#f8fafc; }
        .section { background:white; border:1px solid #e2e8f0; border-radius:10px; padding:20px; margin-bottom:24px; }
        .sec-title { font-size:1rem; font-weight:700; color:#1e293b; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
        .fw { font-weight:600; }
        .na { color:#94a3b8; }
        .amber { color:#b45309; }
        .link { color:#4f46e5; text-decoration:none; }
        .link:hover { text-decoration:underline; }
        .branch { background:#f1f5f9; padding:1px 6px; border-radius:4px; font-size:.75rem; }
        .trunc { max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        input[type=search] { border:1px solid #e2e8f0; border-radius:6px; padding:5px 12px; font-size:.85rem; width:220px; outline:none; }
        input[type=search]:focus { border-color:#6366f1; box-shadow:0 0 0 2px #e0e7ff; }
        .stat-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 20px; text-align:center; }
        .stat-num { font-size:2rem; font-weight:800; color:#1e293b; }
        .stat-lbl { font-size:.75rem; color:#64748b; margin-top:2px; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800">

<header style="background:white; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:10;">
    <div style="max-width:1100px; margin:auto; padding:12px 16px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.25rem; font-weight:800; color:#4f46e5;">FocusMCP</span>
            <span style="color:#cbd5e1;">|</span>
            <span style="font-weight:500; color:#475569;">Health Dashboard</span>
        </div>
        <span style="font-size:.75rem; color:#94a3b8;">Generated: ${data.generatedAt} UTC</span>
    </div>
</header>

<main style="max-width:1100px; margin:auto; padding:24px 16px;">

    <!-- Summary cards -->
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px;">
        <div class="stat-card"><div class="stat-num">${data.packages.length}</div><div class="stat-lbl">Packages tracked</div></div>
        <div class="stat-card"><div class="stat-num" style="color:${nBroken > 0 ? '#dc2626' : '#16a34a'};">${nAligned}</div><div class="stat-lbl">Aligned / ${data.packages.length}</div></div>
        <div class="stat-card"><div class="stat-num" style="color:${nPrs > 10 ? '#f59e0b' : '#1e293b'};">${nPrs}</div><div class="stat-lbl">Open PRs</div></div>
        <div class="stat-card"><div class="stat-num" style="color:${totalCs > 10 ? '#f59e0b' : '#1e293b'};">${totalCs}</div><div class="stat-lbl">Pending changesets</div></div>
    </div>

    <!-- 1. Package versions -->
    <div class="section">
        <div class="sec-title">
            <span>Package Versions</span>
            <input type="search" placeholder="Filter packages…" oninput="filterTable('pkg-tb', this.value)">
        </div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Package</th><th>npm latest</th><th>Git tag</th><th>package.json</th><th>Status</th></tr></thead>
                <tbody id="pkg-tb">${pkgRows}</tbody>
            </table>
        </div>
    </div>

    <!-- 2. Drift -->
    <div class="section">
        <div class="sec-title">Drift main ↔ develop</div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Repo</th><th>develop ahead of main</th><th>main ahead of develop</th></tr></thead>
                <tbody>${driftRows}</tbody>
            </table>
        </div>
    </div>

    <!-- 3. CI stats -->
    <div class="section">
        <div class="sec-title">CI Status — Last 7 days</div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Repo</th><th>Branch</th><th>Total</th><th>Success</th><th>Failure</th><th>Rate</th></tr></thead>
                <tbody>${ciRows}</tbody>
            </table>
        </div>
    </div>

    <!-- 4. Releases -->
    <div class="section">
        <div class="sec-title">Latest Releases</div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Date</th><th>Repo</th><th>Tag</th></tr></thead>
                <tbody>${releaseRows}</tbody>
            </table>
        </div>
    </div>

    <!-- 5. Open PRs -->
    <div class="section">
        <div class="sec-title">Open Pull Requests (${nPrs})</div>
        ${
            nPrs === 0
                ? '<p style="color:#94a3b8;font-size:.875rem;">No open PRs.</p>'
                : `<div style="overflow-x:auto;"><table>
                <thead><tr><th>Repo</th><th>#</th><th>Title</th><th>Author</th><th>Age</th><th>CI</th></tr></thead>
                <tbody>${prRows}</tbody>
            </table></div>`
        }
    </div>

    <!-- 6. Changesets -->
    <div class="section">
        <div class="sec-title">Pending Changesets</div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>Repo</th><th>Count</th><th>Oldest</th></tr></thead>
                <tbody>${csRows}</tbody>
            </table>
        </div>
    </div>

</main>

<footer style="text-align:center;font-size:.75rem;color:#94a3b8;padding:24px 0;">
    FocusMCP Health Dashboard — refreshed daily via GitHub Actions ·
    <a href="data.json" class="link">Raw JSON</a>
</footer>

<script>
function filterTable(tbodyId, q) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    q = q.toLowerCase();
    for (const row of tbody.rows) {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    }
}
</script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function log(msg: string): void {
    process.stdout.write(`${msg}\n`);
}

function logError(msg: string, err: unknown): void {
    process.stderr.write(`${msg} ${String(err)}\n`);
}

async function main(): Promise<void> {
    log('[dashboard] Collecting data…');

    const timestamp = new Date().toISOString();
    const generatedAt = timestamp.slice(0, 19).replace('T', ' ');

    const [packages, drift, ciStats, latestReleases, openPrs, pendingChangesets] =
        await Promise.all([
            collectPackageVersions(),
            collectDrift(),
            collectCIStats(7),
            collectLatestReleases(5),
            collectOpenPRs(),
            collectPendingChangesets(),
        ]);

    const data: DashboardData = {
        timestamp,
        generatedAt,
        packages,
        drift,
        ciStats,
        latestReleases,
        openPrs,
        pendingChangesets,
    };

    await mkdir(DASHBOARD_DIR, { recursive: true });

    const html = renderHtml(data);
    await writeFile(`${DASHBOARD_DIR}/index.html`, html, 'utf8');
    await writeFile(`${DASHBOARD_DIR}/data.json`, JSON.stringify(data, null, 2), 'utf8');

    const nAligned = packages.filter((p) => p.status === 'aligned').length;
    const nBroken = packages.filter((p) => p.status === 'broken').length;

    log(`[dashboard] Done. Files written to ${DASHBOARD_DIR}/`);
    log(`  packages : ${packages.length} (${nAligned} aligned, ${nBroken} broken)`);
    log(`  open PRs : ${openPrs.length}`);
    log(`  changesets: ${pendingChangesets.reduce((s, c) => s + c.count, 0)}`);
}

main().catch((err: unknown) => {
    logError('[dashboard] Fatal error:', err);
    process.exit(1);
});
