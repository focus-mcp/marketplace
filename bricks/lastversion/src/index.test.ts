// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearCache,
    compareSemver,
    determineBumpType,
    isPrerelease,
    lvAudit,
    lvChangelog,
    lvCheck,
    lvDiff,
    lvLatest,
    lvVersions,
    parseSemver,
    semverInRange,
} from './operations.ts';

// ─── Semver helpers ───────────────────────────────────────────────────────────

describe('parseSemver', () => {
    it('parses standard semver', () => {
        const p = parseSemver('1.2.3');
        expect(p).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('parses semver with v prefix', () => {
        const p = parseSemver('v2.0.0');
        expect(p).toEqual({ major: 2, minor: 0, patch: 0 });
    });

    it('parses pre-release', () => {
        const p = parseSemver('1.0.0-alpha.1');
        expect(p).toMatchObject({ major: 1, minor: 0, patch: 0, pre: 'alpha.1' });
    });

    it('returns null for invalid version', () => {
        expect(parseSemver('not-a-version')).toBeNull();
        expect(parseSemver('')).toBeNull();
    });
});

describe('isPrerelease', () => {
    it('detects pre-release versions', () => {
        expect(isPrerelease('1.0.0-beta.1')).toBe(true);
        expect(isPrerelease('2.0.0-rc.3')).toBe(true);
        expect(isPrerelease('1.0.0-alpha')).toBe(true);
    });

    it('returns false for stable versions', () => {
        expect(isPrerelease('1.0.0')).toBe(false);
        expect(isPrerelease('2.3.4')).toBe(false);
    });
});

describe('compareSemver', () => {
    it('returns positive when a > b', () => {
        expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
        expect(compareSemver('1.1.0', '1.0.9')).toBeGreaterThan(0);
        expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });

    it('returns negative when a < b', () => {
        expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('returns 0 for equal versions', () => {
        expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
    });
});

describe('determineBumpType', () => {
    it('identifies patch bump', () => {
        expect(determineBumpType('1.0.0', '1.0.1')).toBe('patch');
    });

    it('identifies minor bump', () => {
        expect(determineBumpType('1.0.0', '1.1.0')).toBe('minor');
    });

    it('identifies major bump', () => {
        expect(determineBumpType('1.0.0', '2.0.0')).toBe('major');
    });

    it('identifies breaking bump when from is 0.x', () => {
        expect(determineBumpType('0.5.0', '1.0.0')).toBe('breaking');
    });

    it('identifies downgrade', () => {
        expect(determineBumpType('2.0.0', '1.0.0')).toBe('downgrade');
    });
});

describe('semverInRange', () => {
    it('handles >= operator', () => {
        expect(semverInRange('2.0.0', '>=1.0.0')).toBe(true);
        expect(semverInRange('1.0.0', '>=2.0.0')).toBe(false);
    });

    it('handles > operator', () => {
        expect(semverInRange('2.0.0', '>1.0.0')).toBe(true);
        expect(semverInRange('1.0.0', '>1.0.0')).toBe(false);
    });

    it('handles <= operator', () => {
        expect(semverInRange('1.0.0', '<=2.0.0')).toBe(true);
        expect(semverInRange('3.0.0', '<=2.0.0')).toBe(false);
    });

    it('handles < operator', () => {
        expect(semverInRange('1.0.0', '<2.0.0')).toBe(true);
        expect(semverInRange('2.0.0', '<2.0.0')).toBe(false);
    });

    it('handles ^ (caret) operator', () => {
        expect(semverInRange('1.2.3', '^1.0.0')).toBe(true);
        expect(semverInRange('2.0.0', '^1.0.0')).toBe(false);
    });

    it('handles ~ (tilde) operator', () => {
        expect(semverInRange('1.2.3', '~1.2.0')).toBe(true);
        expect(semverInRange('1.3.0', '~1.2.0')).toBe(false);
    });
});

// ─── Mock fetch setup ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    clearCache();
});

afterEach(() => {
    vi.unstubAllGlobals();
    clearCache();
});

function makeResponse(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response;
}

// ─── npm mock data ────────────────────────────────────────────────────────────

const NPM_MOCK_DATA = {
    'dist-tags': { latest: '2.0.0' },
    versions: {
        '1.0.0': {},
        '1.1.0': {},
        '2.0.0': {},
        '2.1.0-beta.1': {},
    },
    time: {
        '1.0.0': '2023-01-01T00:00:00.000Z',
        '1.1.0': '2023-06-01T00:00:00.000Z',
        '2.0.0': '2024-01-01T00:00:00.000Z',
        '2.1.0-beta.1': '2024-06-01T00:00:00.000Z',
    },
};

// ─── lvLatest tests ───────────────────────────────────────────────────────────

describe('lvLatest', () => {
    it('returns latest npm version', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvLatest({ source: 'npm', target: 'express' });

        expect(result.version).toBe('2.0.0');
        expect(result.publishedAt).toBe('2024-01-01T00:00:00.000Z');
        expect(result.url).toContain('express');
    });

    it('includes pre-release when includePrerelease is true', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvLatest({
            source: 'npm',
            target: 'express',
            includePrerelease: true,
        });

        expect(result.version).toBe('2.1.0-beta.1');
    });

    it('returns latest pypi version', async () => {
        const pypiMock = {
            info: { version: '3.0.0', yanked: false },
            releases: {
                '2.0.0': [{ upload_time_iso_8601: '2023-01-01T00:00:00Z' }],
                '3.0.0': [{ upload_time_iso_8601: '2024-01-01T00:00:00Z' }],
            },
        };
        mockFetch.mockResolvedValueOnce(makeResponse(pypiMock));

        const result = await lvLatest({ source: 'pypi', target: 'requests' });

        expect(result.version).toBe('3.0.0');
        expect(result.url).toContain('requests');
    });

    it('returns latest github release', async () => {
        const githubMock = [
            {
                tag_name: 'v2.0.0',
                prerelease: false,
                published_at: '2024-01-01T00:00:00Z',
                html_url: 'https://github.com/owner/repo/releases/tag/v2.0.0',
            },
            {
                tag_name: 'v1.0.0',
                prerelease: false,
                published_at: '2023-01-01T00:00:00Z',
                html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
            },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(githubMock));

        const result = await lvLatest({ source: 'github', target: 'owner/repo' });

        expect(result.version).toBe('2.0.0');
        expect(result.publishedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('throws on 404', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({}, 404));

        await expect(lvLatest({ source: 'npm', target: 'nonexistent-pkg-xyz' })).rejects.toThrow(
            'Package not found',
        );
    });

    it('throws on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));

        await expect(lvLatest({ source: 'npm', target: 'some-pkg' })).rejects.toThrow(
            'Network failure',
        );
    });

    it('throws for unsupported source', async () => {
        await expect(lvLatest({ source: 'cargo' as 'npm', target: 'serde' })).rejects.toThrow(
            "Source 'cargo' is not yet supported for latest",
        );
    });
});

// ─── lvVersions tests ─────────────────────────────────────────────────────────

describe('lvVersions', () => {
    it('lists stable npm versions', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvVersions({ source: 'npm', target: 'express' });

        expect(result.versions.every((v) => !v.prerelease)).toBe(true);
        expect(result.versions.length).toBeGreaterThan(0);
    });

    it('includes pre-releases when stable is false', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvVersions({ source: 'npm', target: 'express', stable: false });

        expect(result.versions.some((v) => v.prerelease === true)).toBe(true);
    });

    it('filters by semver range', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvVersions({ source: 'npm', target: 'express', range: '>=2.0.0' });

        expect(result.versions.every((v) => compareSemver(v.version, '2.0.0') >= 0)).toBe(true);
    });

    it('respects limit', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvVersions({
            source: 'npm',
            target: 'express',
            limit: 2,
            stable: false,
        });

        expect(result.versions.length).toBeLessThanOrEqual(2);
    });

    it('lists pypi versions', async () => {
        const pypiMock = {
            info: { version: '3.0.0', yanked: false },
            releases: {
                '1.0.0': [{ upload_time_iso_8601: '2022-01-01T00:00:00Z' }],
                '2.0.0': [{ upload_time_iso_8601: '2023-01-01T00:00:00Z' }],
                '3.0.0': [{ upload_time_iso_8601: '2024-01-01T00:00:00Z' }],
            },
        };
        mockFetch.mockResolvedValueOnce(makeResponse(pypiMock));

        const result = await lvVersions({ source: 'pypi', target: 'requests' });

        expect(result.versions.length).toBe(3);
    });

    it('lists github versions', async () => {
        const githubMock = [
            { tag_name: 'v3.0.0', prerelease: false, published_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v2.0.0', prerelease: false, published_at: '2023-01-01T00:00:00Z' },
            { tag_name: 'v2.0.0-rc.1', prerelease: true, published_at: '2022-12-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(githubMock));

        const result = await lvVersions({ source: 'github', target: 'owner/repo', stable: false });

        expect(result.versions.length).toBe(3);
        expect(result.versions.some((v) => v.prerelease === true)).toBe(true);
    });

    it('lists gitlab versions', async () => {
        const gitlabMock = [
            { tag_name: 'v2.0.0', released_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v1.0.0', released_at: '2023-01-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(gitlabMock));

        const result = await lvVersions({ source: 'gitlab', target: 'owner/repo' });

        expect(result.versions.length).toBe(2);
    });
});

// ─── lvDiff tests ─────────────────────────────────────────────────────────────

describe('lvDiff', () => {
    it('computes major bump with days between', async () => {
        // lvDiff calls npmPublishedAt(from) and npmPublishedAt(to) in parallel — 2 fetches
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvDiff({
            source: 'npm',
            target: 'express',
            from: '1.0.0',
            to: '2.0.0',
        });

        expect(result.bumpType).toBe('major');
        expect(result.breakingChange).toBe(true);
        expect(result.daysBetween).toBeGreaterThan(0);
    });

    it('computes patch bump', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvDiff({
            source: 'npm',
            target: 'express',
            from: '1.0.0',
            to: '1.0.1',
        });

        expect(result.bumpType).toBe('patch');
        expect(result.breakingChange).toBe(false);
    });

    it('computes downgrade', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvDiff({
            source: 'npm',
            target: 'express',
            from: '2.0.0',
            to: '1.0.0',
        });

        expect(result.bumpType).toBe('downgrade');
    });

    it('computes diff for pypi source', async () => {
        const pypiMock = {
            info: { version: '3.0.0', yanked: false },
            releases: {
                '2.0.0': [{ upload_time_iso_8601: '2023-01-01T00:00:00Z' }],
                '3.0.0': [{ upload_time_iso_8601: '2024-01-01T00:00:00Z' }],
            },
        };
        mockFetch.mockResolvedValueOnce(makeResponse(pypiMock));
        mockFetch.mockResolvedValueOnce(makeResponse(pypiMock));

        const result = await lvDiff({
            source: 'pypi',
            target: 'requests',
            from: '2.0.0',
            to: '3.0.0',
        });

        expect(result.bumpType).toBe('major');
        expect(result.daysBetween).toBeGreaterThan(0);
    });

    it('computes diff for github source', async () => {
        const githubMock = [
            { tag_name: 'v3.0.0', prerelease: false, published_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v2.0.0', prerelease: false, published_at: '2023-01-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(githubMock));
        mockFetch.mockResolvedValueOnce(makeResponse(githubMock));

        const result = await lvDiff({
            source: 'github',
            target: 'owner/repo',
            from: '2.0.0',
            to: '3.0.0',
        });

        expect(result.bumpType).toBe('major');
    });

    it('computes diff for gitlab source', async () => {
        const gitlabMock = [
            { tag_name: 'v3.0.0', released_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v2.0.0', released_at: '2023-01-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(gitlabMock));
        mockFetch.mockResolvedValueOnce(makeResponse(gitlabMock));

        const result = await lvDiff({
            source: 'gitlab',
            target: 'owner/repo',
            from: '2.0.0',
            to: '3.0.0',
        });

        expect(result.bumpType).toBe('major');
    });
});

// ─── lvChangelog tests ────────────────────────────────────────────────────────

describe('lvChangelog', () => {
    const GITHUB_RELEASES = [
        {
            tag_name: 'v3.0.0',
            name: 'Release 3.0.0',
            prerelease: false,
            published_at: '2024-03-01T00:00:00Z',
            body: 'Breaking changes',
            html_url: 'https://github.com/owner/repo/releases/tag/v3.0.0',
        },
        {
            tag_name: 'v2.1.0',
            name: 'Release 2.1.0',
            prerelease: false,
            published_at: '2024-01-01T00:00:00Z',
            body: 'Minor features',
            html_url: 'https://github.com/owner/repo/releases/tag/v2.1.0',
        },
        {
            tag_name: 'v2.0.0',
            name: 'Release 2.0.0',
            prerelease: false,
            published_at: '2023-06-01T00:00:00Z',
            body: 'Initial stable',
            html_url: 'https://github.com/owner/repo/releases/tag/v2.0.0',
        },
    ];

    it('returns all releases', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(GITHUB_RELEASES));

        const result = await lvChangelog({ repo: 'owner/repo' });

        expect(result.releases.length).toBe(3);
        expect(result.repo).toBe('owner/repo');
    });

    it('filters between from and to versions', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(GITHUB_RELEASES));

        const result = await lvChangelog({ repo: 'owner/repo', from: 'v2.0.0', to: 'v3.0.0' });

        // slices starting from v3.0.0 (to), up to but not including v2.0.0 (from)
        // => v3.0.0, v2.1.0 (v2.0.0 excluded)
        expect(result.releases.every((r) => r.tag !== 'v2.0.0')).toBe(true);
        expect(result.releases.some((r) => r.tag === 'v3.0.0')).toBe(true);
    });

    it('respects limit', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(GITHUB_RELEASES));

        const result = await lvChangelog({ repo: 'owner/repo', limit: 2 });

        expect(result.releases.length).toBeLessThanOrEqual(2);
    });

    it('includes release metadata', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(GITHUB_RELEASES));

        const result = await lvChangelog({ repo: 'owner/repo' });
        const first = result.releases[0];

        expect(first?.tag).toBe('v3.0.0');
        expect(first?.name).toBe('Release 3.0.0');
        expect(first?.body).toBe('Breaking changes');
        expect(first?.url).toContain('v3.0.0');
    });
});

// ─── lvCheck tests ────────────────────────────────────────────────────────────

describe('lvCheck', () => {
    it('detects outdated version', async () => {
        // First call: lvLatest → fetchNpmData
        // Second call: npmPublishedAt (current) + npmPublishedAt (latest) via same cached data
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));

        const result = await lvCheck({ source: 'npm', target: 'express', current: '1.0.0' });

        expect(result.stale).toBe(true);
        expect(result.latest).toBe('2.0.0');
        expect(result.bumpType).toBe('major');
        expect(result.daysBehind).toBeGreaterThan(0);
    });

    it('returns not stale when up-to-date', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));
        // OSV audit call
        mockFetch.mockResolvedValueOnce(makeResponse({ vulns: [] }));

        const result = await lvCheck({ source: 'npm', target: 'express', current: '2.0.0' });

        expect(result.stale).toBe(false);
        expect(result.bumpType).toBe('none');
        expect(result.daysBehind).toBe(0);
    });

    it('reports advisory count', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(NPM_MOCK_DATA));
        // OSV audit
        mockFetch.mockResolvedValueOnce(
            makeResponse({
                vulns: [
                    {
                        id: 'GHSA-xxxx',
                        summary: 'Critical vulnerability',
                        database_specific: { severity: 'CRITICAL' },
                    },
                ],
            }),
        );

        const result = await lvCheck({ source: 'npm', target: 'express', current: '2.0.0' });

        expect(result.hasAdvisories).toBe(true);
        expect(result.advisoryCount).toBe(1);
    });

    it('detects outdated pypi version', async () => {
        const pypiMock = {
            info: { version: '3.0.0', yanked: false },
            releases: {
                '1.0.0': [{ upload_time_iso_8601: '2022-01-01T00:00:00Z' }],
                '3.0.0': [{ upload_time_iso_8601: '2024-01-01T00:00:00Z' }],
            },
        };
        // lvLatest calls fetchPypiData once, then lvCheck uses same cache for dates
        mockFetch.mockResolvedValueOnce(makeResponse(pypiMock));
        // OSV audit
        mockFetch.mockResolvedValueOnce(makeResponse({ vulns: [] }));

        const result = await lvCheck({ source: 'pypi', target: 'requests', current: '1.0.0' });

        expect(result.stale).toBe(true);
        expect(result.latest).toBe('3.0.0');
        expect(result.bumpType).toBe('major');
    });

    it('detects outdated github version', async () => {
        const githubMock = [
            { tag_name: 'v2.0.0', prerelease: false, published_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v1.0.0', prerelease: false, published_at: '2023-01-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(githubMock));

        const result = await lvCheck({ source: 'github', target: 'owner/repo', current: '1.0.0' });

        expect(result.stale).toBe(true);
        expect(result.latest).toBe('2.0.0');
    });

    it('detects outdated gitlab version', async () => {
        const gitlabMock = [
            { tag_name: 'v2.0.0', released_at: '2024-01-01T00:00:00Z' },
            { tag_name: 'v1.0.0', released_at: '2023-01-01T00:00:00Z' },
        ];
        mockFetch.mockResolvedValueOnce(makeResponse(gitlabMock));

        const result = await lvCheck({ source: 'gitlab', target: 'owner/repo', current: '1.0.0' });

        expect(result.stale).toBe(true);
        expect(result.latest).toBe('2.0.0');
    });
});

// ─── lvAudit tests ────────────────────────────────────────────────────────────

describe('lvAudit', () => {
    it('returns advisories from OSV.dev', async () => {
        const osvMock = {
            vulns: [
                {
                    id: 'GHSA-test-1234',
                    summary: 'Prototype pollution',
                    database_specific: { severity: 'HIGH' },
                    affected: [
                        {
                            ranges: [
                                {
                                    events: [{ introduced: '0' }, { fixed: '1.2.3' }],
                                },
                            ],
                        },
                    ],
                    references: [
                        { type: 'ADVISORY', url: 'https://github.com/advisories/GHSA-test-1234' },
                    ],
                },
            ],
        };
        mockFetch.mockResolvedValueOnce(makeResponse(osvMock));

        const result = await lvAudit({ source: 'npm', target: 'lodash', version: '4.17.20' });

        expect(result.count).toBe(1);
        expect(result.advisories[0]?.id).toBe('GHSA-test-1234');
        expect(result.advisories[0]?.severity).toBe('HIGH');
        expect(result.advisories[0]?.fixedIn).toBe('1.2.3');
        expect(result.advisories[0]?.url).toContain('GHSA-test-1234');
    });

    it('returns empty when no advisories', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ vulns: [] }));

        const result = await lvAudit({ source: 'npm', target: 'safe-package' });

        expect(result.count).toBe(0);
        expect(result.advisories).toHaveLength(0);
    });

    it('handles missing vulns key', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({}));

        const result = await lvAudit({ source: 'pypi', target: 'flask' });

        expect(result.count).toBe(0);
    });

    it('throws for unsupported source', async () => {
        await expect(lvAudit({ source: 'gitlab' as 'npm', target: 'owner/repo' })).rejects.toThrow(
            "Source 'gitlab' is not supported for audit",
        );
    });

    it('sends correct ecosystem for pypi', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ vulns: [] }));

        await lvAudit({ source: 'pypi', target: 'requests' });

        const firstCall = mockFetch.mock.calls[0];
        expect(firstCall).toBeDefined();
        const callBody = JSON.parse((firstCall?.[1] as RequestInit).body as string);
        expect(callBody.package.ecosystem).toBe('PyPI');
    });

    it('includes version in request when provided', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ vulns: [] }));

        await lvAudit({ source: 'npm', target: 'express', version: '4.18.0' });

        const firstCall = mockFetch.mock.calls[0];
        expect(firstCall).toBeDefined();
        const callBody = JSON.parse((firstCall?.[1] as RequestInit).body as string);
        expect(callBody.version).toBe('4.18.0');
    });
});

// ─── Brick registration tests ─────────────────────────────────────────────────

describe('lastversion brick registration', () => {
    it('registers 6 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(6);
        expect(bus.handle).toHaveBeenCalledWith('lastversion:latest', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('lastversion:versions', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('lastversion:diff', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('lastversion:changelog', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('lastversion:check', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('lastversion:audit', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
