import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { IEpic, IFeature, ITask, IStatusConfig, IUserConfig } from '@/types';
import { countDays } from '@/lib/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  sampleRows: string[][];
  sheetNames?: string[];
}

export interface ColumnMapping {
  level: number;
  name: number;
  status?: number;
  owner?: number;
  completionPct?: number;
  plannedStart?: number;
  plannedEnd?: number;
  actualStart?: number;
  actualEnd?: number;
  description?: number;
  color?: number;
  notes?: number;
}

export type LevelType = 'epic' | 'feature' | 'task';

export interface LevelValueMapping {
  [fileValue: string]: LevelType;
}

export interface StatusValueMapping {
  [fileValue: string]: string;
}

export interface OwnerValueMapping {
  [fileValue: string]: string | null;
}

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-Mon-YYYY';

export interface ImportConfig {
  columns: ColumnMapping;
  levelValues: LevelValueMapping;
  statusValues: StatusValueMapping;
  ownerValues: OwnerValueMapping;
  dateFormat: DateFormat;
  defaultStatus: string;
  allowWeekends: boolean;
}

export interface ImportWarning {
  row: number;
  message: string;
}

export interface ImportResult {
  epics: Omit<IEpic, '_id'>[];
  warnings: ImportWarning[];
  counts: { epics: number; features: number; tasks: number };
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete(results) {
        const all = results.data as string[][];
        if (all.length === 0) {
          reject(new Error('File is empty'));
          return;
        }
        const headers = all[0].map((h) => String(h ?? '').trim());
        const rows = all.slice(1).map((r) => headers.map((_, i) => String(r[i] ?? '').trim()));
        resolve({ headers, rows, sampleRows: rows.slice(0, 5) });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export async function parseXLSX(file: File, sheetIndex = 0): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const sheetName = sheetNames[sheetIndex] ?? sheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length === 0) throw new Error('File is empty');

  const headers = (raw[0] as unknown[]).map((h) => String(h ?? '').trim());
  const rows = (raw.slice(1) as unknown[][])
    .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
    .map((r) => headers.map((_, i) => {
      const cell = r[i];
      if (cell instanceof Date) {
        // Format date as YYYY-MM-DD
        const y = cell.getFullYear();
        const m = String(cell.getMonth() + 1).padStart(2, '0');
        const d = String(cell.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return String(cell ?? '').trim();
    }));

  return { headers, rows, sampleRows: rows.slice(0, 5), sheetNames };
}

// ─── Auto-detection ───────────────────────────────────────────────────────────

const ATTR_ALIASES: Record<keyof Omit<ColumnMapping, 'level'>, string[]> = {
  name: ['name', 'title', 'item', 'task', 'nome', 'nombre', 'titulo', 'tarefa'],
  status: ['status', 'state', 'estado', 'situacao', 'situación'],
  owner: ['owner', 'assignee', 'assigned', 'responsible', 'responsavel', 'responsable', 'assigned to'],
  completionPct: ['completion', 'progress', 'percent', 'pct', '%', 'complete', 'conclusao', 'progresso', 'porcentagem'],
  plannedStart: ['planned start', 'start date', 'start', 'begin', 'inicio', 'inicio planejado', 'data inicio'],
  plannedEnd: ['planned end', 'end date', 'end', 'finish', 'due', 'deadline', 'fim', 'termino', 'fim planejado', 'data fim'],
  actualStart: ['actual start', 'real start', 'inicio real', 'real inicio'],
  actualEnd: ['actual end', 'real end', 'fim real', 'real fim'],
  description: ['description', 'desc', 'details', 'descricao', 'descripcion', 'detalhes'],
  color: ['color', 'colour', 'cor', 'color hex'],
  notes: ['notes', 'note', 'comments', 'notas', 'observacoes', 'obs'],
};

const LEVEL_ALIASES = ['level', 'type', 'tier', 'hierarchy', 'nivel', 'tipo', 'categoria', 'kind'];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export function autoDetectLevelColumn(headers: string[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = normalize(headers[i]);
    if (LEVEL_ALIASES.some((a) => h === a || h.includes(a))) return i;
  }
  return null;
}

export function autoDetectColumns(headers: string[]): Partial<ColumnMapping> {
  const result: Partial<ColumnMapping> = {};
  const levelIdx = autoDetectLevelColumn(headers);
  if (levelIdx !== null) result.level = levelIdx;

  for (const [attr, aliases] of Object.entries(ATTR_ALIASES) as [keyof typeof ATTR_ALIASES, string[]][]) {
    for (let i = 0; i < headers.length; i++) {
      const h = normalize(headers[i]);
      if (aliases.some((a) => h === a || h === normalize(a))) {
        result[attr] = i;
        break;
      }
    }
  }
  return result;
}

export function autoDetectStatusMapping(fileValues: string[], statuses: IStatusConfig[]): StatusValueMapping {
  const mapping: StatusValueMapping = {};
  const defaultStatus = statuses[0]?.value ?? 'todo';
  for (const fv of fileValues) {
    const n = normalize(fv);
    const match = statuses.find((s) => normalize(s.label) === n || normalize(s.value) === n);
    mapping[fv] = match?.value ?? defaultStatus;
  }
  return mapping;
}

export function autoDetectOwnerMapping(fileValues: string[], users: IUserConfig[]): OwnerValueMapping {
  const mapping: OwnerValueMapping = {};
  for (const fv of fileValues) {
    const n = normalize(fv);
    const match = users.find((u) => normalize(u.name) === n);
    mapping[fv] = match?.uid ?? null;
  }
  return mapping;
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

const MONTH_ABBR: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  // pt-BR
  fev: 1, abr: 3, mai: 4, ago: 7, set: 8, out: 9, dez: 11,
  // es
  ene: 0, dic: 11,
};

// Strip time suffix (e.g. " 12:00 AM", " 14:30") and return just the date part
function stripTime(v: string): string {
  return v.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i, '').trim();
}

function expandYear(y: string): number {
  const n = Number(y);
  if (y.length <= 2) return n < 70 ? 2000 + n : 1900 + n;
  return n;
}

export function parseDate(value: string, format: DateFormat): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  const v = stripTime(raw);

  // Always try ISO first (YYYY-MM-DD, with optional time already stripped)
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  if (format === 'MM/DD/YYYY') {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const d = new Date(expandYear(m[3]), Number(m[1]) - 1, Number(m[2]));
      return isNaN(d.getTime()) ? null : d;
    }
  }

  if (format === 'DD/MM/YYYY') {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const d = new Date(expandYear(m[3]), Number(m[2]) - 1, Number(m[1]));
      return isNaN(d.getTime()) ? null : d;
    }
  }

  if (format === 'DD-Mon-YYYY') {
    // Matches: DD-Mon-YYYY, DD/Mon/YY, DD Mon YYYY, etc.
    const m = v.match(/^(\d{1,2})[\/\- ]([A-Za-z]{3})[\/\- ](\d{2,4})$/);
    if (m) {
      const month = MONTH_ABBR[m[2].toLowerCase()];
      if (month !== undefined) {
        const d = new Date(expandYear(m[3]), month, Number(m[1]));
        return isNaN(d.getTime()) ? null : d;
      }
    }
  }

  // Fallback: try native Date parse on the original (with time) — handles many locale formats
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultDates(): { plannedStart: string; plannedEnd: string } {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  return { plannedStart: dateToISO(today), plannedEnd: dateToISO(end) };
}

// ─── Transform ────────────────────────────────────────────────────────────────

export function transformToEpics(rows: string[][], config: ImportConfig): ImportResult {
  const { columns, levelValues, statusValues, ownerValues, dateFormat, defaultStatus, allowWeekends } = config;
  const warnings: ImportWarning[] = [];
  const epics: Omit<IEpic, '_id'>[] = [];
  let currentEpic: Omit<IEpic, '_id'> | null = null;
  let currentFeature: Omit<IFeature, '_id'> | null = null;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, +1 for header
    const levelRaw = row[columns.level] ?? '';
    const level: LevelType | undefined = levelValues[levelRaw];

    if (!level) {
      if (levelRaw.trim()) {
        warnings.push({ row: rowNum, message: `Unknown level value "${levelRaw}", row skipped` });
      }
      return;
    }

    const name = row[columns.name]?.trim() ?? '';
    if (!name) {
      warnings.push({ row: rowNum, message: `Row has no name, skipped` });
      return;
    }

    // Parse dates
    let plannedStart: string;
    let plannedEnd: string;
    const defaults = defaultDates();

    if (columns.plannedStart !== undefined) {
      const parsed = parseDate(row[columns.plannedStart] ?? '', dateFormat);
      if (!parsed) {
        if (row[columns.plannedStart]?.trim()) {
          warnings.push({ row: rowNum, message: `Could not parse planned start "${row[columns.plannedStart]}", using default` });
        }
        plannedStart = defaults.plannedStart;
      } else {
        plannedStart = dateToISO(parsed);
      }
    } else {
      plannedStart = defaults.plannedStart;
    }

    if (columns.plannedEnd !== undefined) {
      const parsed = parseDate(row[columns.plannedEnd] ?? '', dateFormat);
      if (!parsed) {
        if (row[columns.plannedEnd]?.trim()) {
          warnings.push({ row: rowNum, message: `Could not parse planned end "${row[columns.plannedEnd]}", using default` });
        }
        plannedEnd = defaults.plannedEnd;
      } else {
        plannedEnd = dateToISO(parsed);
      }
    } else {
      plannedEnd = defaults.plannedEnd;
    }

    // Ensure end >= start
    if (plannedEnd < plannedStart) plannedEnd = plannedStart;

    const parseOptionalDate = (colIdx: number | undefined, label: string): string | undefined => {
      if (colIdx === undefined) return undefined;
      const raw = row[colIdx]?.trim();
      if (!raw) return undefined;
      const parsed = parseDate(raw, dateFormat);
      if (!parsed) {
        warnings.push({ row: rowNum, message: `Could not parse ${label} "${raw}", ignored` });
        return undefined;
      }
      return dateToISO(parsed);
    };

    const actualStart = parseOptionalDate(columns.actualStart, 'actual start');
    const actualEnd = parseOptionalDate(columns.actualEnd, 'actual end');

    // Status
    const statusRaw = columns.status !== undefined ? row[columns.status]?.trim() ?? '' : '';
    const status = statusRaw ? (statusValues[statusRaw] ?? defaultStatus) : defaultStatus;

    // Owner
    const ownerRaw = columns.owner !== undefined ? row[columns.owner]?.trim() ?? '' : '';
    const ownerId = ownerRaw ? (ownerValues[ownerRaw] ?? undefined) : undefined;

    // Completion
    let completionPct = 0;
    if (columns.completionPct !== undefined) {
      const raw = row[columns.completionPct]?.trim().replace('%', '') ?? '';
      const n = parseFloat(raw);
      if (!isNaN(n)) completionPct = Math.max(0, Math.min(100, Math.round(n)));
    }

    const description = columns.description !== undefined ? row[columns.description]?.trim() || undefined : undefined;
    const color = columns.color !== undefined ? row[columns.color]?.trim() || undefined : undefined;
    const notes = columns.notes !== undefined ? row[columns.notes]?.trim() || undefined : undefined;

    const dayCount = countDays(new Date(plannedStart), new Date(plannedEnd), allowWeekends);
    const baseItem = { name, status, ownerId: ownerId ?? undefined, completionPct, plannedStart, plannedEnd, actualStart, actualEnd, description, color, dayCount, comments: [] };

    if (level === 'epic') {
      currentEpic = { ...baseItem, features: [], collapsed: false };
      currentFeature = null;
      epics.push(currentEpic);
    } else if (level === 'feature') {
      if (!currentEpic) {
        warnings.push({ row: rowNum, message: `Feature "${name}" has no parent Epic, auto-assigned to a default Epic` });
        currentEpic = { name: 'Imported', status: defaultStatus, ownerId: undefined, completionPct: 0, plannedStart, plannedEnd, dayCount, features: [], collapsed: false, comments: [] };
        epics.push(currentEpic);
      }
      currentFeature = { ...baseItem, tasks: [], collapsed: false };
      currentEpic.features.push(currentFeature as IFeature);
    } else {
      // task
      if (!currentFeature) {
        if (!currentEpic) {
          warnings.push({ row: rowNum, message: `Task "${name}" has no parent Epic, auto-assigned to defaults` });
          currentEpic = { name: 'Imported', status: defaultStatus, ownerId: undefined, completionPct: 0, plannedStart, plannedEnd, dayCount, features: [], collapsed: false, comments: [] };
          epics.push(currentEpic);
        }
        warnings.push({ row: rowNum, message: `Task "${name}" has no parent Feature, auto-assigned to a default Feature` });
        currentFeature = { name: 'Imported', status: defaultStatus, ownerId: undefined, completionPct: 0, plannedStart, plannedEnd, dayCount, tasks: [], collapsed: false, comments: [] };
        currentEpic.features.push(currentFeature as IFeature);
      }
      const task: Omit<ITask, '_id'> = { ...baseItem, notes };
      currentFeature.tasks.push(task as ITask);
    }
  });

  const counts = {
    epics: epics.length,
    features: epics.reduce((sum, e) => sum + e.features.length, 0),
    tasks: epics.reduce((sum, e) => sum + e.features.reduce((s, f) => s + f.tasks.length, 0), 0),
  };

  return { epics: epics as Omit<IEpic, '_id'>[], warnings, counts };
}

// ─── Helper: extract unique values from a column ──────────────────────────────

export function uniqueColumnValues(rows: string[][], colIdx: number): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const v = row[colIdx]?.trim();
    if (v) seen.add(v);
  }
  return Array.from(seen);
}
