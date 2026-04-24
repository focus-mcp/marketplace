// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConvUnitsInput {
    readonly value: number;
    readonly from: string;
    readonly to: string;
    readonly pricePerMillion?: number;
}

export interface ConvUnitsOutput {
    result: number;
    from: string;
    to: string;
    formatted: string;
}

export type EncodingOperation =
    | 'base64encode'
    | 'base64decode'
    | 'hexencode'
    | 'hexdecode'
    | 'urlencode'
    | 'urldecode'
    | 'htmlescape'
    | 'htmlunescape';

export interface ConvEncodingInput {
    readonly text: string;
    readonly operation: EncodingOperation;
}

export interface ConvEncodingOutput {
    result: string;
    operation: EncodingOperation;
}

export type FormatFrom = 'json' | 'csv';
export type FormatTo = 'json' | 'csv' | 'yaml';

export interface ConvFormatInput {
    readonly data: string;
    readonly from: FormatFrom;
    readonly to: FormatTo;
}

export interface ConvFormatOutput {
    result: string;
    from: FormatFrom;
    to: FormatTo;
}

export type NamingConvention = 'camel' | 'snake' | 'kebab' | 'pascal';

export interface ConvLanguageInput {
    readonly text: string;
    readonly to: NamingConvention;
}

export interface ConvLanguageOutput {
    result: string;
    from: NamingConvention;
    to: NamingConvention;
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────

const BYTE_UNITS = new Set(['b', 'kb', 'mb', 'gb']);
const TIME_UNITS = new Set(['ms', 's', 'm', 'h']);

const BYTE_TO_BYTES: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
};

const TIME_TO_MS: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
};

function formatNumber(value: number): string {
    if (Number.isInteger(value)) return value.toString();
    return value.toPrecision(6).replace(/\.?0+$/, '');
}

// ─── convUnits ────────────────────────────────────────────────────────────────

export function convUnits(input: ConvUnitsInput): ConvUnitsOutput {
    const from = input.from.toLowerCase();
    const to = input.to.toLowerCase();

    if (BYTE_UNITS.has(from) && BYTE_UNITS.has(to)) {
        const bytes = input.value * (BYTE_TO_BYTES[from] ?? 1);
        const result = bytes / (BYTE_TO_BYTES[to] ?? 1);
        return { result, from, to, formatted: `${formatNumber(result)} ${to.toUpperCase()}` };
    }

    if (TIME_UNITS.has(from) && TIME_UNITS.has(to)) {
        const ms = input.value * (TIME_TO_MS[from] ?? 1);
        const result = ms / (TIME_TO_MS[to] ?? 1);
        return { result, from, to, formatted: `${formatNumber(result)} ${to}` };
    }

    if (from === 'tokens' && to === 'cost') {
        const price = input.pricePerMillion ?? 0;
        const result = (input.value / 1_000_000) * price;
        return {
            result,
            from,
            to,
            formatted: `$${result.toFixed(6)}`,
        };
    }

    throw new Error(`Unsupported unit conversion: ${from} → ${to}`);
}

// ─── convEncoding ─────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const HTML_UNESCAPE_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(HTML_ESCAPE_MAP).map(([k, v]) => [v, k]),
);

export function convEncoding(input: ConvEncodingInput): ConvEncodingOutput {
    const { text, operation } = input;
    let result: string;

    switch (operation) {
        case 'base64encode':
            result = Buffer.from(text, 'utf-8').toString('base64');
            break;
        case 'base64decode':
            result = Buffer.from(text, 'base64').toString('utf-8');
            break;
        case 'hexencode':
            result = Buffer.from(text, 'utf-8').toString('hex');
            break;
        case 'hexdecode':
            result = Buffer.from(text, 'hex').toString('utf-8');
            break;
        case 'urlencode':
            result = encodeURIComponent(text);
            break;
        case 'urldecode':
            result = decodeURIComponent(text);
            break;
        case 'htmlescape':
            result = text.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
            break;
        case 'htmlunescape':
            result = text.replace(
                /&(?:amp|lt|gt|quot|#39);/g,
                (entity) => HTML_UNESCAPE_MAP[entity] ?? entity,
            );
            break;
    }

    return { result, operation };
}

// ─── convFormat ───────────────────────────────────────────────────────────────

type JsonRow = Record<string, string>;

function csvToRows(csv: string): JsonRow[] {
    const lines = csv.trim().split('\n');
    const headers = parseCsvLine(lines[0] ?? '');
    const rows: JsonRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        const values = parseCsvLine(line);
        const row: JsonRow = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            if (key !== undefined) {
                row[key] = values[j] ?? '';
            }
        }
        rows.push(row);
    }
    return rows;
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function rowsToCsv(rows: JsonRow[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0] ?? {});
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(
            headers
                .map((h) => {
                    // Coerce to string before calling .includes to guard against
                    // null / number values that can appear in real JSON inputs.
                    const val = String(row[h] ?? '');
                    return val.includes(',') ? `"${val}"` : val;
                })
                .join(','),
        );
    }
    return lines.join('\n');
}

function rowsToYaml(rows: JsonRow[]): string {
    if (rows.length === 0) return '[]';
    return rows
        .map((row) => {
            const entries = Object.entries(row)
                .map(([k, v]) => `  ${k}: ${v}`)
                .join('\n');
            return `-\n${entries}`;
        })
        .join('\n');
}

function jsonToYaml(obj: unknown, indent = 0): string {
    const pad = ' '.repeat(indent);
    if (obj === null) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') {
        const needsQuotes = obj.includes(':') || obj.includes('#') || obj === '';
        return needsQuotes ? `"${obj}"` : obj;
    }
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        return obj.map((item) => `${pad}- ${jsonToYaml(item, indent + 2)}`).join('\n');
    }
    if (typeof obj === 'object') {
        const entries = Object.entries(obj as Record<string, unknown>);
        if (entries.length === 0) return '{}';
        return entries
            .map(([k, v]) => {
                const val = jsonToYaml(v, indent + 2);
                const isBlock = val.includes('\n');
                return isBlock ? `${pad}${k}:\n${val}` : `${pad}${k}: ${val}`;
            })
            .join('\n');
    }
    return String(obj);
}

export function convFormat(input: ConvFormatInput): ConvFormatOutput {
    const { data, from, to } = input;

    if (from === to) {
        return { result: data, from, to };
    }

    if (from === 'json') {
        const parsed: unknown = JSON.parse(data);
        if (to === 'csv') {
            const rows = Array.isArray(parsed) ? (parsed as JsonRow[]) : [parsed as JsonRow];
            return { result: rowsToCsv(rows), from, to };
        }
        if (to === 'yaml') {
            return { result: jsonToYaml(parsed), from, to };
        }
    }

    if (from === 'csv') {
        const rows = csvToRows(data);
        if (to === 'json') {
            return { result: JSON.stringify(rows, null, 2), from, to };
        }
        if (to === 'yaml') {
            return { result: rowsToYaml(rows), from, to };
        }
    }

    throw new Error(`Unsupported format conversion: ${from} → ${to}`);
}

// ─── convLanguage ─────────────────────────────────────────────────────────────

function detectConvention(text: string): NamingConvention {
    if (text.includes('_')) return 'snake';
    if (text.includes('-')) return 'kebab';
    if (
        text.length > 0 &&
        text[0] === text[0]?.toUpperCase() &&
        text[0] !== text[0]?.toLowerCase()
    ) {
        return 'pascal';
    }
    return 'camel';
}

function splitWords(text: string): string[] {
    if (text.includes('_')) return text.split('_').filter(Boolean);
    if (text.includes('-')) return text.split('-').filter(Boolean);
    // camelCase or PascalCase — split on uppercase boundaries
    return text
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .split('_')
        .filter(Boolean);
}

export function convLanguage(input: ConvLanguageInput): ConvLanguageOutput {
    const { text, to } = input;
    const from = detectConvention(text);
    const words = splitWords(text).map((w) => w.toLowerCase());

    let result: string;
    switch (to) {
        case 'camel':
            result = words
                .map((w, i) => (i === 0 ? w : `${w[0]?.toUpperCase() ?? ''}${w.slice(1)}`))
                .join('');
            break;
        case 'pascal':
            result = words.map((w) => `${w[0]?.toUpperCase() ?? ''}${w.slice(1)}`).join('');
            break;
        case 'snake':
            result = words.join('_');
            break;
        case 'kebab':
            result = words.join('-');
            break;
    }

    return { result, from, to };
}
