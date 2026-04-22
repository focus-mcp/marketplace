// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FmtJsonInput {
    readonly data: string;
    readonly indent?: number;
    readonly sortKeys?: boolean;
}

export interface FmtJsonOutput {
    readonly formatted: string;
    readonly lines: number;
}

export interface FmtYamlInput {
    readonly data: string;
}

export interface FmtYamlOutput {
    readonly yaml: string;
}

export type MarkdownStyle = 'list' | 'table' | 'headings';

export interface FmtMarkdownInput {
    readonly data: string;
    readonly style?: MarkdownStyle;
}

export interface FmtMarkdownOutput {
    readonly markdown: string;
}

export type ColumnAlign = 'left' | 'right' | 'center';

export interface FmtTableInput {
    readonly headers: readonly string[];
    readonly rows: readonly (readonly string[])[];
    readonly align?: readonly ColumnAlign[];
}

export interface FmtTableOutput {
    readonly table: string;
    readonly width: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortObjectKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortObjectKeys);
    }
    if (value !== null && typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
            sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return value;
}

function toYamlValue(value: unknown, indentLevel: number): string {
    const pad = '  '.repeat(indentLevel);

    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);

    if (typeof value === 'string') {
        if (value === '' || /[:#[{}&*!,|>'"?%@`]/.test(value) || /^\s|\s$/.test(value)) {
            return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        }
        return value;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map((item) => {
            const rendered = toYamlValue(item, indentLevel + 1);
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                return `${pad}- ${rendered.trimStart()}`;
            }
            return `${pad}- ${rendered}`;
        });
        return `\n${items.join('\n')}`;
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return '{}';
        const lines = entries.map(([k, v]) => {
            const rendered = toYamlValue(v, indentLevel + 1);
            if (typeof v === 'object' && v !== null) {
                return `${pad}${k}:${rendered}`;
            }
            return `${pad}${k}: ${rendered}`;
        });
        return `\n${lines.join('\n')}`;
    }

    return String(value);
}

function objToYaml(obj: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const rendered = toYamlValue(value, 1);
        if (typeof value === 'object' && value !== null) {
            lines.push(`${key}:${rendered}`);
        } else {
            lines.push(`${key}: ${rendered}`);
        }
    }
    return lines.join('\n');
}

function padCell(text: string, width: number, align: ColumnAlign): string {
    const len = text.length;
    if (len >= width) return text;
    const extra = width - len;
    if (align === 'right') return ' '.repeat(extra) + text;
    if (align === 'center') {
        const left = Math.floor(extra / 2);
        const right = extra - left;
        return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
    }
    return `${text}${' '.repeat(extra)}`;
}

function objectToMarkdownList(obj: Record<string, unknown>, depth: number): string {
    const indent = '  '.repeat(depth);
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            lines.push(`${indent}- **${key}**:`);
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    lines.push(objectToMarkdownList(item as Record<string, unknown>, depth + 2));
                } else {
                    lines.push(`${indent}  - ${String(item)}`);
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            lines.push(`${indent}- **${key}**:`);
            lines.push(objectToMarkdownList(value as Record<string, unknown>, depth + 1));
        } else {
            lines.push(`${indent}- **${key}**: ${String(value)}`);
        }
    }
    return lines.join('\n');
}

function objectToMarkdownHeadings(obj: Record<string, unknown>, level: number): string {
    const hashes = '#'.repeat(Math.min(level, 6));
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        lines.push(`${hashes} ${key}`);
        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    lines.push(
                        objectToMarkdownHeadings(item as Record<string, unknown>, level + 1),
                    );
                } else {
                    lines.push(`- ${String(item)}`);
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            lines.push(objectToMarkdownHeadings(value as Record<string, unknown>, level + 1));
        } else {
            lines.push(String(value));
        }
        lines.push('');
    }
    return lines.join('\n').trimEnd();
}

function arrayToMarkdownTable(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0] ?? {});
    const dataRows = rows.map((row) => headers.map((h) => String(row[h] ?? '')));
    const colWidths = headers.map((h, i) =>
        Math.max(h.length, ...dataRows.map((r) => (r[i] ?? '').length)),
    );
    const sep = `| ${colWidths.map((w) => '-'.repeat(w)).join(' | ')} |`;
    const header = `| ${headers.map((h, i) => padCell(h, colWidths[i] ?? h.length, 'left')).join(' | ')} |`;
    const body = dataRows.map(
        (row) =>
            `| ${row.map((cell, i) => padCell(cell, colWidths[i] ?? cell.length, 'left')).join(' | ')} |`,
    );
    return [header, sep, ...body].join('\n');
}

// ─── fmtJson ─────────────────────────────────────────────────────────────────

export function fmtJson(input: FmtJsonInput): FmtJsonOutput {
    const parsed: unknown = JSON.parse(input.data);
    const indent = input.indent ?? 2;
    const value = input.sortKeys === true ? sortObjectKeys(parsed) : parsed;
    const formatted = JSON.stringify(value, null, indent);
    const lines = formatted.split('\n').length;
    return { formatted, lines };
}

// ─── fmtYaml ─────────────────────────────────────────────────────────────────

export function fmtYaml(input: FmtYamlInput): FmtYamlOutput {
    const parsed: unknown = JSON.parse(input.data);

    if (Array.isArray(parsed)) {
        const lines = parsed.map((item) => {
            if (typeof item === 'object' && item !== null) {
                const rendered = toYamlValue(item, 1).trimStart();
                return `- ${rendered}`;
            }
            return `- ${toYamlValue(item, 0)}`;
        });
        return { yaml: lines.join('\n') };
    }

    if (typeof parsed === 'object' && parsed !== null) {
        return { yaml: objToYaml(parsed as Record<string, unknown>) };
    }

    return { yaml: toYamlValue(parsed, 0) as string };
}

// ─── fmtMarkdown ─────────────────────────────────────────────────────────────

function mdTable(parsed: unknown): string {
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return arrayToMarkdownTable(parsed as Record<string, unknown>[]);
    }
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const rows = Object.entries(parsed as Record<string, unknown>).map(([k, v]) => ({
            Key: k,
            Value: String(v),
        }));
        return arrayToMarkdownTable(rows);
    }
    return String(parsed);
}

function mdHeadings(parsed: unknown): string {
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return objectToMarkdownHeadings(parsed as Record<string, unknown>, 2);
    }
    if (Array.isArray(parsed)) {
        return parsed
            .map((item) =>
                typeof item === 'object' && item !== null
                    ? objectToMarkdownHeadings(item as Record<string, unknown>, 2)
                    : `- ${String(item)}`,
            )
            .join('\n\n');
    }
    return String(parsed);
}

function mdList(parsed: unknown): string {
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return objectToMarkdownList(parsed as Record<string, unknown>, 0);
    }
    if (Array.isArray(parsed)) {
        return parsed
            .map((item) =>
                typeof item === 'object' && item !== null
                    ? objectToMarkdownList(item as Record<string, unknown>, 0)
                    : `- ${String(item)}`,
            )
            .join('\n');
    }
    return `- ${String(parsed)}`;
}

export function fmtMarkdown(input: FmtMarkdownInput): FmtMarkdownOutput {
    const parsed: unknown = JSON.parse(input.data);
    const style = input.style ?? 'list';
    if (style === 'table') return { markdown: mdTable(parsed) };
    if (style === 'headings') return { markdown: mdHeadings(parsed) };
    return { markdown: mdList(parsed) };
}

// ─── fmtTable ────────────────────────────────────────────────────────────────

export function fmtTable(input: FmtTableInput): FmtTableOutput {
    const { headers, rows } = input;
    const align: readonly ColumnAlign[] = input.align ?? headers.map(() => 'left' as ColumnAlign);

    const colWidths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
    );

    const totalWidth = colWidths.reduce((sum, w) => sum + w + 3, 1);

    function separator(): string {
        return `+${colWidths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
    }

    function renderRow(cells: readonly string[]): string {
        const parts = colWidths.map((w, i) => {
            const cell = cells[i] ?? '';
            const colAlign = align[i] ?? 'left';
            return ` ${padCell(cell, w, colAlign)} `;
        });
        return `|${parts.join('|')}|`;
    }

    const sep = separator();
    const headerRow = renderRow(headers);
    const bodyRows = rows.map((r) => renderRow(r));

    const tableLines = [sep, headerRow, sep, ...bodyRows, sep];
    const table = tableLines.join('\n');

    return { table, width: totalWidth };
}
