'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCanManage } from '@/hooks/useAccountRole';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DEFAULTS = { epic: 'Epic', feature: 'Feature', task: 'Task' };
const LEVEL_KEYS = [
  { key: 'epic' as const,    labelKey: 'level1' },
  { key: 'feature' as const, labelKey: 'level2' },
  { key: 'task' as const,    labelKey: 'level3' },
];

export function LevelNamesSection() {
  const t = useTranslations('settings.levels');
  const { levelNames, setLevelName, persistSettings, isSaving } = useSettingsStore();
  const canManage = useCanManage();
  const [local, setLocal] = useState({ ...levelNames });

  function handleSave() {
    setLevelName('epic', local.epic);
    setLevelName('feature', local.feature);
    setLevelName('task', local.task);
    persistSettings('levelNames');
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {!canManage && <ReadOnlyBanner />}

      <div className="space-y-4">
        {LEVEL_KEYS.map(({ key, labelKey }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">{t(labelKey)}</label>
              {canManage && local[key] !== DEFAULTS[key] && (
                <button
                  onClick={() => setLocal((p) => ({ ...p, [key]: DEFAULTS[key] }))}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title={`${t('reset')} "${DEFAULTS[key]}"`}
                >
                  <RotateCcw size={10} />
                  {t('reset')}
                </button>
              )}
            </div>
            <Input
              value={local[key]}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={DEFAULTS[key]}
              maxLength={100}
              disabled={!canManage}
              className="focus-visible:ring-blue-500"
            />
            <p className="text-[10px] text-muted-foreground/50">{t('default', { value: DEFAULTS[key] })}</p>
          </div>
        ))}
      </div>

      {canManage && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {isSaving ? t('saving') : t('saveButton')}
        </Button>
      )}
    </div>
  );
}
