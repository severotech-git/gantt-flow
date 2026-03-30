'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  ColumnMapping,
  LevelType,
  LevelValueMapping,
  StatusValueMapping,
  OwnerValueMapping,
  DateFormat,
  ParsedFile,
  uniqueColumnValues,
} from '@/lib/importUtils';
import { IStatusConfig, IUserConfig } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  parsedFile: ParsedFile;
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  users: IUserConfig[];
  columns: Partial<ColumnMapping>;
  onColumnsChange: (c: Partial<ColumnMapping>) => void;
  levelValues: LevelValueMapping;
  onLevelValuesChange: (v: LevelValueMapping) => void;
  statusValues: StatusValueMapping;
  onStatusValuesChange: (v: StatusValueMapping) => void;
  ownerValues: OwnerValueMapping;
  onOwnerValuesChange: (v: OwnerValueMapping) => void;
  dateFormat: DateFormat;
  onDateFormatChange: (f: DateFormat) => void;
  onBack: () => void;
  onNext: () => void;
}

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-03-28)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 03/28/2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 28/03/2026)' },
  { value: 'DD-Mon-YYYY', label: 'DD-Mon-YYYY (e.g. 28-Mar-2026)' },
];

const LEVEL_OPTIONS: LevelType[] = ['epic', 'feature', 'task'];

type AttrKey = keyof Omit<ColumnMapping, 'level'>;

interface AttrDef {
  key: AttrKey;
  labelKey: string;
  required?: boolean;
}

const ATTRS: AttrDef[] = [
  { key: 'name', labelKey: 'map.fieldName', required: true },
  { key: 'status', labelKey: 'map.fieldStatus' },
  { key: 'owner', labelKey: 'map.fieldOwner' },
  { key: 'completionPct', labelKey: 'map.fieldCompletionPct' },
  { key: 'plannedStart', labelKey: 'map.fieldPlannedStart' },
  { key: 'plannedEnd', labelKey: 'map.fieldPlannedEnd' },
  { key: 'actualStart', labelKey: 'map.fieldActualStart' },
  { key: 'actualEnd', labelKey: 'map.fieldActualEnd' },
  { key: 'description', labelKey: 'map.fieldDescription' },
  { key: 'color', labelKey: 'map.fieldColor' },
  { key: 'notes', labelKey: 'map.fieldNotes' },
];

function ColSelect({ headers, value, onChange, placeholder }: {
  headers: string[];
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className={cn(
        'flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs',
        'focus:outline-none focus:ring-1 focus:ring-blue-500',
        'text-foreground'
      )}
    >
      <option value="">{placeholder}</option>
      {headers.map((h, i) => (
        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
      ))}
    </select>
  );
}

export function ImportMapStep({
  parsedFile,
  levelNames,
  statuses,
  users,
  columns,
  onColumnsChange,
  levelValues,
  onLevelValuesChange,
  statusValues,
  onStatusValuesChange,
  ownerValues,
  onOwnerValuesChange,
  dateFormat,
  onDateFormatChange,
  onBack,
  onNext,
}: Props) {
  const t = useTranslations('dialogs.importProject');

  const { headers, rows } = parsedFile;

  // Unique values in level column
  const uniqueLevelVals = columns.level !== undefined
    ? uniqueColumnValues(rows, columns.level)
    : [];

  // Unique values in status column
  const uniqueStatusVals = columns.status !== undefined
    ? uniqueColumnValues(rows, columns.status)
    : [];

  // Unique values in owner column
  const uniqueOwnerVals = columns.owner !== undefined
    ? uniqueColumnValues(rows, columns.owner)
    : [];

  const levelNameFor = (l: LevelType) => {
    if (l === 'epic') return levelNames.epic;
    if (l === 'feature') return levelNames.feature;
    return levelNames.task;
  };

  // Validation for Next button
  const allLevelsMapped = uniqueLevelVals.length > 0 && uniqueLevelVals.every((v) => !!levelValues[v]);
  const canProceed =
    columns.level !== undefined &&
    columns.name !== undefined &&
    allLevelsMapped;

  return (
    <div className="flex flex-col gap-5">

      {/* Section A: Level Column */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t('map.levelSection')}</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">
            {t('map.levelColumnLabel', {
              epic: levelNames.epic,
              feature: levelNames.feature,
              task: levelNames.task,
            })}
          </label>
          <ColSelect
            headers={headers}
            value={columns.level}
            onChange={(v) => onColumnsChange({ ...columns, level: v })}
            placeholder={t('map.levelColumnPlaceholder')}
          />
        </div>

        {/* Level value mapping */}
        {uniqueLevelVals.length > 0 && (
          <div className="flex flex-col gap-2 pl-3 border-l-2 border-muted">
            <p className="text-xs text-muted-foreground">{t('map.levelValuesHint')}</p>
            {uniqueLevelVals.map((val) => (
              <div key={val} className="flex items-center gap-3">
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[80px] truncate">{val}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <select
                  value={levelValues[val] ?? ''}
                  onChange={(e) => onLevelValuesChange({ ...levelValues, [val]: e.target.value as LevelType })}
                  className={cn(
                    'h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground'
                  )}
                >
                  <option value="">{t('map.selectColumn')}</option>
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{levelNameFor(l)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Date Format */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t('map.dateFormatSection')}</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t('map.dateFormatLabel')}</label>
          <select
            value={dateFormat}
            onChange={(e) => onDateFormatChange(e.target.value as DateFormat)}
            className={cn(
              'h-8 rounded-md border border-input bg-background px-2 text-xs',
              'focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground'
            )}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Section C: Attribute Mapping */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t('map.attributeSection')}</h3>
        <p className="text-xs text-muted-foreground">{t('map.attributeHint')}</p>
        <div className="flex flex-col gap-2">
          {ATTRS.map(({ key, labelKey, required }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-32 shrink-0">
                {t(labelKey as Parameters<typeof t>[0])}
                {required && <span className="text-red-500 ml-1">*</span>}
              </span>
              <ColSelect
                headers={headers}
                value={(columns as Record<string, number | undefined>)[key]}
                onChange={(v) => onColumnsChange({ ...columns, [key]: v })}
                placeholder={required ? t('map.selectColumn') : t('map.none')}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section D: Status value mapping */}
      {columns.status !== undefined && uniqueStatusVals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t('map.statusMappingSection')}</h3>
          <p className="text-xs text-muted-foreground">{t('map.statusMappingHint')}</p>
          <div className="flex flex-col gap-2 pl-3 border-l-2 border-muted">
            {uniqueStatusVals.map((val) => (
              <div key={val} className="flex items-center gap-3">
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[80px] truncate">{val}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <select
                  value={statusValues[val] ?? ''}
                  onChange={(e) => onStatusValuesChange({ ...statusValues, [val]: e.target.value })}
                  className={cn(
                    'h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground'
                  )}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section E: Owner mapping */}
      {columns.owner !== undefined && uniqueOwnerVals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{t('map.ownerMappingSection')}</h3>
          <p className="text-xs text-muted-foreground">{t('map.ownerMappingHint')}</p>
          <div className="flex flex-col gap-2 pl-3 border-l-2 border-muted">
            {uniqueOwnerVals.map((val) => (
              <div key={val} className="flex items-center gap-3">
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[80px] truncate">{val}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <select
                  value={ownerValues[val] ?? ''}
                  onChange={(e) => onOwnerValuesChange({ ...ownerValues, [val]: e.target.value || null })}
                  className={cn(
                    'h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground'
                  )}
                >
                  <option value="">{t('map.unassigned')}</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          {t('actions.back')}
        </Button>
        <Button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
        >
          {t('actions.next')}
        </Button>
      </div>
    </div>
  );
}
