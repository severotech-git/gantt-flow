'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProjectStore } from '@/store/useProjectStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImportUploadStep } from './ImportUploadStep';
import { ImportMapStep } from './ImportMapStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import {
  ParsedFile,
  ColumnMapping,
  LevelValueMapping,
  StatusValueMapping,
  OwnerValueMapping,
  DateFormat,
  ImportResult,
  autoDetectColumns,
  autoDetectStatusMapping,
  autoDetectOwnerMapping,
  uniqueColumnValues,
  transformToEpics,
} from '@/lib/importUtils';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

type Step = 0 | 1 | 2;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportProjectDialog({ open, onClose }: Props) {
  const t = useTranslations('dialogs.importProject');
  const router = useRouter();
  const { importProject } = useProjectStore();
  const { levelNames, statuses, users, allowWeekends } = useSettingsStore();

  // Step
  const [step, setStep] = useState<Step>(0);

  // Step 0 state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [selectedSheet, setSelectedSheet] = useState(0);

  // Step 1 state
  const [columns, setColumns] = useState<Partial<ColumnMapping>>({});
  const [levelValues, setLevelValues] = useState<LevelValueMapping>({});
  const [statusValues, setStatusValues] = useState<StatusValueMapping>({});
  const [ownerValues, setOwnerValues] = useState<OwnerValueMapping>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>('YYYY-MM-DD');

  // Step 2 state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // When file is parsed, auto-detect columns
  useEffect(() => {
    if (!parsedFile) return;
    const detected = autoDetectColumns(parsedFile.headers);
    setColumns(detected);
    // Reset mappings
    setLevelValues({});
    setStatusValues({});
    setOwnerValues({});
  }, [parsedFile]);

  // When level column changes, auto-init level values (keep existing, add new)
  useEffect(() => {
    if (!parsedFile || columns.level === undefined) return;
    const vals = uniqueColumnValues(parsedFile.rows, columns.level);
    const updated: LevelValueMapping = { ...levelValues };
    for (const v of vals) {
      if (!updated[v]) updated[v] = undefined as unknown as 'epic';
    }
    setLevelValues(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.level, parsedFile]);

  // When status column changes, auto-detect status mappings
  useEffect(() => {
    if (!parsedFile || columns.status === undefined) return;
    const vals = uniqueColumnValues(parsedFile.rows, columns.status);
    setStatusValues(autoDetectStatusMapping(vals, statuses));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.status, parsedFile]);

  // When owner column changes, auto-detect owner mappings
  useEffect(() => {
    if (!parsedFile || columns.owner === undefined) return;
    const vals = uniqueColumnValues(parsedFile.rows, columns.owner);
    setOwnerValues(autoDetectOwnerMapping(vals, users));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.owner, parsedFile]);

  function handleClose() {
    setStep(0);
    setProjectName('');
    setDescription('');
    setColor(COLORS[0]);
    setParsedFile(null);
    setSelectedSheet(0);
    setColumns({});
    setLevelValues({});
    setStatusValues({});
    setOwnerValues({});
    setDateFormat('YYYY-MM-DD');
    setImportResult(null);
    setImporting(false);
    setImportError(null);
    onClose();
  }

  function handleGoToPreview() {
    if (!parsedFile || columns.level === undefined || columns.name === undefined) return;
    const result = transformToEpics(parsedFile.rows, {
      columns: columns as ColumnMapping,
      levelValues,
      statusValues,
      ownerValues,
      dateFormat,
      defaultStatus: statuses[0]?.value ?? 'todo',
      allowWeekends,
    });
    setImportResult(result);
    setStep(2);
  }

  async function handleImport() {
    if (!importResult || importResult.epics.length === 0) return;
    setImporting(true);
    setImportError(null);
    const project = await importProject(projectName.trim(), description.trim(), color, importResult.epics);
    setImporting(false);
    if (project) {
      handleClose();
      router.push(`/projects/${project._id}`);
    } else {
      setImportError(t('errors.importFailed'));
    }
  }

  const STEP_LABELS = [t('stepUpload'), t('stepMap'), t('stepPreview')];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs ${i === step ? 'text-blue-600 font-medium' : i < step ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-muted text-muted-foreground' : 'bg-muted/40 text-muted-foreground/40'}`}>
                    {i + 1}
                  </div>
                  {label}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`h-px w-6 ${i < step ? 'bg-muted-foreground/40' : 'bg-muted/40'}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 mt-2">
          {step === 0 && (
            <ImportUploadStep
              projectName={projectName}
              onProjectNameChange={setProjectName}
              description={description}
              onDescriptionChange={setDescription}
              color={color}
              onColorChange={setColor}
              parsedFile={parsedFile}
              onParsedFile={setParsedFile}
              selectedSheet={selectedSheet}
              onSelectedSheet={setSelectedSheet}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && parsedFile && (
            <ImportMapStep
              parsedFile={parsedFile}
              levelNames={levelNames}
              statuses={statuses}
              users={users}
              columns={columns}
              onColumnsChange={setColumns}
              levelValues={levelValues}
              onLevelValuesChange={setLevelValues}
              statusValues={statusValues}
              onStatusValuesChange={setStatusValues}
              ownerValues={ownerValues}
              onOwnerValuesChange={setOwnerValues}
              dateFormat={dateFormat}
              onDateFormatChange={setDateFormat}
              onBack={() => setStep(0)}
              onNext={handleGoToPreview}
            />
          )}

          {step === 2 && importResult && (
            <>
              {importError && (
                <p className="text-xs text-red-500 mb-3">{importError}</p>
              )}
              <ImportPreviewStep
                result={importResult}
                levelNames={levelNames}
                statuses={statuses}
                onBack={() => setStep(1)}
                onImport={handleImport}
                importing={importing}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
