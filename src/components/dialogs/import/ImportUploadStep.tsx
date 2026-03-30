'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ParsedFile, parseCSV, parseXLSX } from '@/lib/importUtils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  projectName: string;
  onProjectNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  parsedFile: ParsedFile | null;
  onParsedFile: (pf: ParsedFile) => void;
  selectedSheet: number;
  onSelectedSheet: (idx: number) => void;
  onNext: () => void;
}

export function ImportUploadStep({
  projectName, onProjectNameChange,
  description, onDescriptionChange,
  color, onColorChange,
  parsedFile, onParsedFile,
  selectedSheet, onSelectedSheet,
  onNext,
}: Props) {
  const t = useTranslations('dialogs.importProject');
  const tCommon = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError(t('upload.fileTooLarge'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let pf: ParsedFile;
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        pf = await parseXLSX(file, selectedSheet);
      } else {
        pf = await parseCSV(file);
      }
      setFileName(file.name);
      onParsedFile(pf);
      // Default project name from filename
      const base = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
      if (!projectName) onProjectNameChange(base);
    } catch {
      setError(t('upload.parseError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSheetChange(idx: number) {
    onSelectedSheet(idx);
    if (!fileInputRef.current?.files?.[0]) return;
    setIsLoading(true);
    setError(null);
    try {
      const pf = await parseXLSX(fileInputRef.current.files[0], idx);
      onParsedFile(pf);
    } catch {
      setError(t('upload.parseError'));
    } finally {
      setIsLoading(false);
    }
  }

  const canProceed = !!parsedFile && parsedFile.rows.length > 0 && projectName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          parsedFile && 'border-green-500/50 bg-green-500/5'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {parsedFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Upload size={18} className="text-green-600" />
            </div>
            <p className="text-sm text-foreground font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {t('upload.fileLoaded', { fileName: '', rowCount: parsedFile.rows.length, colCount: parsedFile.headers.length })}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
              onClick={(e) => { e.stopPropagation(); onParsedFile(null as unknown as ParsedFile); setFileName(null); }}
            >
              <X size={12} />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Upload size={18} className="text-muted-foreground" />
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('upload.dropzone')}</p>
                <p className="text-xs text-muted-foreground/60">{t('upload.acceptedFormats')}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Sheet selector (XLSX only) */}
      {parsedFile?.sheetNames && parsedFile.sheetNames.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t('upload.multipleSheets')}</label>
          <div className="flex flex-wrap gap-2">
            {parsedFile.sheetNames.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSheetChange(idx)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs border transition-colors',
                  selectedSheet === idx
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-muted text-muted-foreground hover:border-muted-foreground'
                )}
              >
                {t('upload.sheetLabel')} {idx + 1}: {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Project name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">{t('upload.projectName')}</label>
        <Input
          autoFocus
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder={t('upload.projectNamePlaceholder')}
          className="focus-visible:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">{t('upload.descriptionLabel')}</label>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('upload.descriptionPlaceholder')}
          className="focus-visible:ring-blue-500"
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">{t('upload.colorLabel')}</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                'w-6 h-6 rounded-full transition-all ring-offset-background',
                color === c ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-2">
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
