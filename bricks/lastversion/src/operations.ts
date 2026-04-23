// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export type Source = 'npm' | 'pypi' | 'github' | 'gitlab' | 'cargo' | 'rubygems' | 'gomod';
export type OsvEcosystem = 'npm' | 'PyPI' | 'Go' | 'crates.io' | 'RubyGems';

export interface LvLatestInput {
    readonly source: Source;
    readonly target: string;
    readonly includePrerelease?: boolean;
}

export interface LvLatestOutput {
    version: string;
    publishedAt?: string;
    deprecated?: boolean;
    isLTS?: boolean;
    url?: string;
}

export interface LvVersionEntry {
    version: string;
    publishedAt?: string;
    prerelease?: boolean;
}

export interface LvVersionsInput {
    readonly source: Source;
    readonly target: string;
    readonly range?: string;
    readonly limit?: number;
    readonly stable?: boolean;
}

export interface LvVersionsOutput {
    versions: LvVersionEntry[];
    total: number;
}

export type BumpType = 'patch' | 'minor' | 'major' | 'breaking' | 'downgrade';

export interface LvDiffInput {
    readonly source: Source;
    readonly target: string;
    readonly from: string;
    readonly to: string;
}

export interface LvDiffOutput {
    from: string;
    to: string;
    bumpType: BumpType;
    daysBetween: number;
    breakingChange: boolean;
}

export interface LvChangelogInput {
    readonly repo: string;
    readonly from?: string;
    readonly to?: string;
    readonly limit?: number;
}

export interface LvReleaseEntry {
    tag: string;
    name?: string;
    publishedAt?: string;
    body?: string;
    url?: string;
}

export interface LvChangelogOutput {
    repo: string;
    releases: LvReleaseEntry[];
    total: number;
}

export interface LvCheckInput {
    readonly source: Source;
    readonly target: string;
    readonly current: string;
}

export interface LvCheckOutput {
    current: string;
    latest: string;
    stale: boolean;
    bumpType: string;
    daysBehind: number;
    hasAdvisories: boolean;
    advisoryCount: number;
}

export interface LvAuditInput {
    readonly source: Source;
    readonly target: string;
    readonly version?: string;
}

export interface LvAdvisory {
    id: string;
    severity: string;
    summary: string;
    fixedIn?: string;
    url?: string;
}

export interface LvAuditOutput {
    advisories: LvAdvisory[];
    count: number;
}

// ─── Semver helpers ───────────────────────────────────────────────────────────

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-z0-9.-]+))?(?:\+([a-z0-9.-]+))?$/i;

interface SemverParts {
    major: number;
    minor: number;
    patch: number;
    pre?: string;
}

export function parseSemver(version: string): SemverParts | null {
    const m = SEMVER_RE.exec(version);
    if (!m) return null;
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
        ...(m[4] !== undefined ? { pre: m[4] } : {}),
    };
}

export function isPrerelease(version: string): boolean {
    const parts = parseSemver(version);
    return parts !== null && parts.pre !== undefined;
}

export function compareSemver(a: string, b: string): number {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) return 0;
    if (pa.major !== pb.major) return pa.major - pb.major;
    if (pa.minor !== pb.minor) return pa.minor - pb.minor;
    return pa.patch - pb.patch;
}

export function determineBumpType(from: string, to: string): BumpType {
    const pf = parseSemver(from);
    const pt = parseSemver(to);
    if (!pf || !pt) return 'patch';

    const cmp = compareSemver(from, to);
    if (cmp > 0) return 'downgrade';
    if (pf.major !== pt.major) {
        return pf.major === 0 ? 'breaking' : 'major';
    }
    if (pf.minor !== pt.minor) return 'minor';
    return 'patch';
}

function semverCaretMatch(version: string, target: string): boolean {
    const pv = parseSemver(version);
    const pt = parseSemver(target);
    if (!pv || !pt) return false;
    return pv.major === pt.major && compareSemver(version, target) >= 0;
}

function semverTildeMatch(version: string, target: string): boolean {
    const pv = parseSemver(version);
    const pt = parseSemver(target);
    if (!pv || !pt) return false;
    return pv.major === pt.major && pv.minor === pt.minor && compareSemver(version, target) >= 0;
}

export function semverInRange(version: string, range: string): boolean {
    const trimmed = range.trim();
    const m = /^(>=|>|<=|<|=|\^|~)?(.+)$/.exec(trimmed);
    if (!m) return true;
    const op = m[1] ?? '=';
    const target = m[2] ?? '';
    const cmp = compareSemver(version, target);
    if (op === '>=') return cmp >= 0;
    if (op === '>') return cmp > 0;
    if (op === '<=') return cmp <= 0;
    if (op === '<') return cmp < 0;
    if (op === '^') return semverCaretMatch(version, target);
    if (op === '~') return semverTildeMatch(version, target);
    return cmp === 0;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.value as T;
}

function cacheSet<T>(key: string, value: T): void {
    cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** Clear all cached entries. Exposed for testing. */
export function clearCache(): void {
    cache.clear();
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const UA = 'focus-mcp/brick-lastversion';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...options,
        headers: {
            'User-Agent': UA,
            Accept: 'application/json',
            ...(options?.headers ?? {}),
        },
    });
    if (res.status === 404) {
        throw new Error('Package not found');
    }
    if (res.status === 429) {
        throw new Error(`Rate limit exceeded for ${url}`);
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return res.json() as Promise<T>;
}

function githubHeaders(): Record<string, string> {
    const token = process.env['GITHUB_TOKEN'];
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── npm source ───────────────────────────────────────────────────────────────

interface NpmPackageData {
    'dist-tags': Record<string, string>;
    versions: Record<string, { deprecated?: string }>;
    time: Record<string, string>;
}

async function fetchNpmData(pkg: string): Promise<NpmPackageData> {
    const cacheKey = `npm:${pkg}`;
    const cached = cacheGet<NpmPackageData>(cacheKey);
    if (cached) return cached;
    const data = await fetchJson<NpmPackageData>(
        `https://registry.npmjs.org/${encodeURIComponent(pkg)}`,
    );
    cacheSet(cacheKey, data);
    return data;
}

async function npmLatest(target: string, includePrerelease: boolean): Promise<LvLatestOutput> {
    const data = await fetchNpmData(target);
    let version: string;
    if (includePrerelease) {
        const allVersions = Object.keys(data.versions);
        allVersions.sort((a, b) => compareSemver(b, a));
        version = allVersions[0] ?? data['dist-tags']['latest'] ?? '';
    } else {
        version = data['dist-tags']['latest'] ?? '';
    }
    const publishedAt = data.time[version];
    const versionMeta = data.versions[version];
    const deprecated = versionMeta?.deprecated !== undefined && versionMeta.deprecated !== '';
    const result: LvLatestOutput = {
        version,
        url: `https://www.npmjs.com/package/${target}/v/${version}`,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(deprecated ? { deprecated: true } : {}),
    };
    return result;
}

async function npmVersions(
    target: string,
    range: string | undefined,
    limit: number,
    stableOnly: boolean,
): Promise<LvVersionsOutput> {
    const data = await fetchNpmData(target);
    let versions = Object.keys(data.versions);
    if (stableOnly) versions = versions.filter((v) => !isPrerelease(v));
    if (range !== undefined) versions = versions.filter((v) => semverInRange(v, range));
    versions.sort((a, b) => compareSemver(b, a));
    const sliced = versions.slice(0, limit);
    const result: LvVersionEntry[] = sliced.map((v) => {
        const publishedAt = data.time[v];
        const pre = isPrerelease(v);
        const entry: LvVersionEntry = {
            version: v,
            ...(publishedAt !== undefined ? { publishedAt } : {}),
            ...(pre ? { prerelease: true } : {}),
        };
        return entry;
    });
    return { versions: result, total: versions.length };
}

async function npmPublishedAt(target: string, version: string): Promise<string | undefined> {
    const data = await fetchNpmData(target);
    return data.time[version];
}

// ─── PyPI source ──────────────────────────────────────────────────────────────

interface PypiPackageData {
    info: {
        version: string;
        yanked: boolean;
    };
    releases: Record<string, Array<{ upload_time_iso_8601?: string }>>;
}

async function fetchPypiData(pkg: string): Promise<PypiPackageData> {
    const cacheKey = `pypi:${pkg}`;
    const cached = cacheGet<PypiPackageData>(cacheKey);
    if (cached) return cached;
    const data = await fetchJson<PypiPackageData>(
        `https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`,
    );
    cacheSet(cacheKey, data);
    return data;
}

async function pypiLatest(target: string, includePrerelease: boolean): Promise<LvLatestOutput> {
    const data = await fetchPypiData(target);
    let version: string;
    if (includePrerelease) {
        const all = Object.keys(data.releases);
        all.sort((a, b) => compareSemver(b, a));
        version = all[0] ?? data.info.version;
    } else {
        const stable = Object.keys(data.releases).filter((v) => !isPrerelease(v));
        stable.sort((a, b) => compareSemver(b, a));
        version = stable[0] ?? data.info.version;
    }
    const uploads = data.releases[version] ?? [];
    const publishedAt = uploads[0]?.upload_time_iso_8601;
    const deprecated = data.info.yanked;
    const result: LvLatestOutput = {
        version,
        url: `https://pypi.org/project/${target}/${version}/`,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
        ...(deprecated ? { deprecated: true } : {}),
    };
    return result;
}

async function pypiVersions(
    target: string,
    range: string | undefined,
    limit: number,
    stableOnly: boolean,
): Promise<LvVersionsOutput> {
    const data = await fetchPypiData(target);
    let versions = Object.keys(data.releases);
    if (stableOnly) versions = versions.filter((v) => !isPrerelease(v));
    if (range !== undefined) versions = versions.filter((v) => semverInRange(v, range));
    versions.sort((a, b) => compareSemver(b, a));
    const sliced = versions.slice(0, limit);
    const result: LvVersionEntry[] = sliced.map((v) => {
        const uploads = data.releases[v] ?? [];
        const publishedAt = uploads[0]?.upload_time_iso_8601;
        const pre = isPrerelease(v);
        const entry: LvVersionEntry = {
            version: v,
            ...(publishedAt !== undefined ? { publishedAt } : {}),
            ...(pre ? { prerelease: true } : {}),
        };
        return entry;
    });
    return { versions: result, total: versions.length };
}

async function pypiPublishedAt(target: string, version: string): Promise<string | undefined> {
    const data = await fetchPypiData(target);
    const uploads = data.releases[version] ?? [];
    return uploads[0]?.upload_time_iso_8601;
}

// ─── GitHub source ────────────────────────────────────────────────────────────

interface GithubRelease {
    tag_name: string;
    name?: string;
    prerelease: boolean;
    published_at?: string;
    body?: string;
    html_url?: string;
}

async function fetchGithubReleases(repo: string): Promise<GithubRelease[]> {
    const cacheKey = `github:${repo}`;
    const cached = cacheGet<GithubRelease[]>(cacheKey);
    if (cached) return cached;
    const data = await fetchJson<GithubRelease[]>(
        `https://api.github.com/repos/${repo}/releases?per_page=100`,
        { headers: githubHeaders() },
    );
    cacheSet(cacheKey, data);
    return data;
}

function stripVPrefix(tag: string): string {
    return tag.startsWith('v') ? tag.slice(1) : tag;
}

async function githubLatest(repo: string, includePrerelease: boolean): Promise<LvLatestOutput> {
    const releases = await fetchGithubReleases(repo);
    const filtered = includePrerelease ? releases : releases.filter((r) => !r.prerelease);
    const latest = filtered[0];
    if (!latest) throw new Error('Package not found');
    const version = stripVPrefix(latest.tag_name);
    const result: LvLatestOutput = {
        version,
        ...(latest.published_at !== undefined ? { publishedAt: latest.published_at } : {}),
        ...(latest.html_url !== undefined ? { url: latest.html_url } : {}),
    };
    return result;
}

async function githubVersions(
    repo: string,
    range: string | undefined,
    limit: number,
    stableOnly: boolean,
): Promise<LvVersionsOutput> {
    const releases = await fetchGithubReleases(repo);
    let filtered = stableOnly ? releases.filter((r) => !r.prerelease) : releases;
    if (range !== undefined) {
        filtered = filtered.filter((r) => semverInRange(stripVPrefix(r.tag_name), range));
    }
    const sliced = filtered.slice(0, limit);
    const result: LvVersionEntry[] = sliced.map((r) => {
        const v = stripVPrefix(r.tag_name);
        const entry: LvVersionEntry = {
            version: v,
            ...(r.published_at !== undefined ? { publishedAt: r.published_at } : {}),
            ...(r.prerelease ? { prerelease: true } : {}),
        };
        return entry;
    });
    return { versions: result, total: filtered.length };
}

async function githubPublishedAt(repo: string, version: string): Promise<string | undefined> {
    const releases = await fetchGithubReleases(repo);
    const match = releases.find(
        (r) => stripVPrefix(r.tag_name) === version || r.tag_name === version,
    );
    return match?.published_at;
}

// ─── GitLab source ────────────────────────────────────────────────────────────

interface GitlabRelease {
    tag_name: string;
    name?: string;
    released_at?: string;
    description?: string;
}

async function fetchGitlabReleases(repo: string): Promise<GitlabRelease[]> {
    const cacheKey = `gitlab:${repo}`;
    const cached = cacheGet<GitlabRelease[]>(cacheKey);
    if (cached) return cached;
    const encoded = encodeURIComponent(repo);
    const data = await fetchJson<GitlabRelease[]>(
        `https://gitlab.com/api/v4/projects/${encoded}/releases?per_page=100`,
    );
    cacheSet(cacheKey, data);
    return data;
}

async function gitlabLatest(repo: string, includePrerelease: boolean): Promise<LvLatestOutput> {
    const releases = await fetchGitlabReleases(repo);
    const filtered = includePrerelease
        ? releases
        : releases.filter((r) => !isPrerelease(stripVPrefix(r.tag_name)));
    const latest = filtered[0];
    if (!latest) throw new Error('Package not found');
    const version = stripVPrefix(latest.tag_name);
    const result: LvLatestOutput = {
        version,
        url: `https://gitlab.com/${repo}/-/releases/${latest.tag_name}`,
        ...(latest.released_at !== undefined ? { publishedAt: latest.released_at } : {}),
    };
    return result;
}

async function gitlabVersions(
    repo: string,
    range: string | undefined,
    limit: number,
    stableOnly: boolean,
): Promise<LvVersionsOutput> {
    const releases = await fetchGitlabReleases(repo);
    let filtered = stableOnly
        ? releases.filter((r) => !isPrerelease(stripVPrefix(r.tag_name)))
        : releases;
    if (range !== undefined) {
        filtered = filtered.filter((r) => semverInRange(stripVPrefix(r.tag_name), range));
    }
    const sliced = filtered.slice(0, limit);
    const result: LvVersionEntry[] = sliced.map((r) => {
        const v = stripVPrefix(r.tag_name);
        const pre = isPrerelease(v);
        const entry: LvVersionEntry = {
            version: v,
            ...(r.released_at !== undefined ? { publishedAt: r.released_at } : {}),
            ...(pre ? { prerelease: true } : {}),
        };
        return entry;
    });
    return { versions: result, total: filtered.length };
}

async function gitlabPublishedAt(repo: string, version: string): Promise<string | undefined> {
    const releases = await fetchGitlabReleases(repo);
    const match = releases.find(
        (r) => stripVPrefix(r.tag_name) === version || r.tag_name === version,
    );
    return match?.released_at;
}

// ─── Days between helper ──────────────────────────────────────────────────────

function daysBetweenDates(a: string | undefined, b: string | undefined): number {
    if (!a || !b) return 0;
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    if (Number.isNaN(da) || Number.isNaN(db)) return 0;
    return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
}

// ─── OSV.dev audit ────────────────────────────────────────────────────────────

interface OsvResponse {
    vulns?: Array<{
        id: string;
        summary?: string;
        database_specific?: { severity?: string };
        affected?: Array<{
            ranges?: Array<{
                events?: Array<{ fixed?: string }>;
            }>;
        }>;
        references?: Array<{ url?: string; type?: string }>;
    }>;
}

function sourceToOsvEcosystem(source: Source): OsvEcosystem | null {
    const map: Partial<Record<Source, OsvEcosystem>> = {
        npm: 'npm',
        pypi: 'PyPI',
        gomod: 'Go',
        cargo: 'crates.io',
        rubygems: 'RubyGems',
    };
    return map[source] ?? null;
}

async function fetchOsvAdvisories(
    pkg: string,
    ecosystem: OsvEcosystem,
    version: string | undefined,
): Promise<LvAdvisory[]> {
    const body: Record<string, unknown> = {
        package: { name: pkg, ecosystem },
    };
    if (version !== undefined) {
        body['version'] = version;
    }
    const res = await fetchJson<OsvResponse>('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const vulns = res.vulns ?? [];
    return vulns.map((v) => {
        const severity = v.database_specific?.severity ?? 'UNKNOWN';
        const summary = v.summary ?? v.id;
        const fixedEvents = v.affected?.[0]?.ranges?.[0]?.events ?? [];
        const fixedIn = fixedEvents.findLast((e) => e.fixed !== undefined)?.fixed;
        const url = v.references?.find((r) => r.type === 'WEB' || r.type === 'ADVISORY')?.url;
        const advisory: LvAdvisory = {
            id: v.id,
            severity,
            summary,
            ...(fixedIn !== undefined ? { fixedIn } : {}),
            ...(url !== undefined ? { url } : {}),
        };
        return advisory;
    });
}

// ─── Public operations ────────────────────────────────────────────────────────

export async function lvLatest(input: LvLatestInput): Promise<LvLatestOutput> {
    const includePrerelease = input.includePrerelease ?? false;
    switch (input.source) {
        case 'npm':
            return npmLatest(input.target, includePrerelease);
        case 'pypi':
            return pypiLatest(input.target, includePrerelease);
        case 'github':
            return githubLatest(input.target, includePrerelease);
        case 'gitlab':
            return gitlabLatest(input.target, includePrerelease);
        default:
            throw new Error(`Source '${input.source}' is not yet supported for latest`);
    }
}

export async function lvVersions(input: LvVersionsInput): Promise<LvVersionsOutput> {
    const limit = input.limit ?? 50;
    const stable = input.stable ?? true;
    switch (input.source) {
        case 'npm':
            return npmVersions(input.target, input.range, limit, stable);
        case 'pypi':
            return pypiVersions(input.target, input.range, limit, stable);
        case 'github':
            return githubVersions(input.target, input.range, limit, stable);
        case 'gitlab':
            return gitlabVersions(input.target, input.range, limit, stable);
        default:
            throw new Error(`Source '${input.source}' is not yet supported for versions`);
    }
}

export async function lvDiff(input: LvDiffInput): Promise<LvDiffOutput> {
    const bumpType = determineBumpType(input.from, input.to);
    const breakingChange = bumpType === 'breaking' || bumpType === 'major';

    let fromDate: string | undefined;
    let toDate: string | undefined;

    switch (input.source) {
        case 'npm':
            [fromDate, toDate] = await Promise.all([
                npmPublishedAt(input.target, input.from),
                npmPublishedAt(input.target, input.to),
            ]);
            break;
        case 'pypi':
            [fromDate, toDate] = await Promise.all([
                pypiPublishedAt(input.target, input.from),
                pypiPublishedAt(input.target, input.to),
            ]);
            break;
        case 'github':
            [fromDate, toDate] = await Promise.all([
                githubPublishedAt(input.target, input.from),
                githubPublishedAt(input.target, input.to),
            ]);
            break;
        case 'gitlab':
            [fromDate, toDate] = await Promise.all([
                gitlabPublishedAt(input.target, input.from),
                gitlabPublishedAt(input.target, input.to),
            ]);
            break;
        default:
            break;
    }

    return {
        from: input.from,
        to: input.to,
        bumpType,
        daysBetween: daysBetweenDates(fromDate, toDate),
        breakingChange,
    };
}

export async function lvChangelog(input: LvChangelogInput): Promise<LvChangelogOutput> {
    const limit = input.limit ?? 20;
    const releases = await fetchGithubReleases(input.repo);

    let filtered = releases;

    if (input.to !== undefined) {
        const toTag = input.to;
        const toIdx = filtered.findIndex(
            (r) => r.tag_name === toTag || stripVPrefix(r.tag_name) === stripVPrefix(toTag),
        );
        if (toIdx >= 0) filtered = filtered.slice(toIdx);
    }

    if (input.from !== undefined) {
        const fromTag = input.from;
        const fromIdx = filtered.findIndex(
            (r) => r.tag_name === fromTag || stripVPrefix(r.tag_name) === stripVPrefix(fromTag),
        );
        if (fromIdx >= 0) filtered = filtered.slice(0, fromIdx);
    }

    const sliced = filtered.slice(0, limit);
    const result: LvReleaseEntry[] = sliced.map((r) => {
        const entry: LvReleaseEntry = {
            tag: r.tag_name,
            ...(r.name !== undefined && r.name !== '' ? { name: r.name } : {}),
            ...(r.published_at !== undefined ? { publishedAt: r.published_at } : {}),
            ...(r.body !== undefined && r.body !== '' ? { body: r.body } : {}),
            ...(r.html_url !== undefined ? { url: r.html_url } : {}),
        };
        return entry;
    });

    return { repo: input.repo, releases: result, total: filtered.length };
}

export async function lvCheck(input: LvCheckInput): Promise<LvCheckOutput> {
    const latestResult = await lvLatest({ source: input.source, target: input.target });
    const latest = latestResult.version;
    const stale = compareSemver(input.current, latest) < 0;
    const bumpType = stale ? determineBumpType(input.current, latest) : 'none';

    let daysBehind = 0;
    if (stale) {
        let currentDate: string | undefined;
        let latestDate: string | undefined;
        switch (input.source) {
            case 'npm':
                [currentDate, latestDate] = await Promise.all([
                    npmPublishedAt(input.target, input.current),
                    npmPublishedAt(input.target, latest),
                ]);
                break;
            case 'pypi':
                [currentDate, latestDate] = await Promise.all([
                    pypiPublishedAt(input.target, input.current),
                    pypiPublishedAt(input.target, latest),
                ]);
                break;
            case 'github':
                [currentDate, latestDate] = await Promise.all([
                    githubPublishedAt(input.target, input.current),
                    githubPublishedAt(input.target, latest),
                ]);
                break;
            case 'gitlab':
                [currentDate, latestDate] = await Promise.all([
                    gitlabPublishedAt(input.target, input.current),
                    gitlabPublishedAt(input.target, latest),
                ]);
                break;
            default:
                break;
        }
        daysBehind = daysBetweenDates(currentDate, latestDate);
    }

    const osvEcosystem = sourceToOsvEcosystem(input.source);
    let advisoryCount = 0;
    if (osvEcosystem !== null) {
        const advisories = await fetchOsvAdvisories(
            input.target,
            osvEcosystem,
            input.current,
        ).catch(() => []);
        advisoryCount = advisories.length;
    }

    return {
        current: input.current,
        latest,
        stale,
        bumpType,
        daysBehind,
        hasAdvisories: advisoryCount > 0,
        advisoryCount,
    };
}

export async function lvAudit(input: LvAuditInput): Promise<LvAuditOutput> {
    const ecosystem = sourceToOsvEcosystem(input.source);
    if (ecosystem === null) {
        throw new Error(`Source '${input.source}' is not supported for audit`);
    }
    const advisories = await fetchOsvAdvisories(input.target, ecosystem, input.version);
    return { advisories, count: advisories.length };
}
