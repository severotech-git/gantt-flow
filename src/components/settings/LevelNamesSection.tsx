'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCanManage } from '@/hooks/useAccountRole';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

const DEFAULTS = { epic: 'Epic', feature: 'Feature', task: 'Task' };
const LEVELS = [
  { key: 'epic' as const,    label: 'Level 1 (top-level)' },
  { key: 'feature' as const, label: 'Level 2 (mid-level)' },
  { key: 'task' as const,    label: 'Level 3 (leaf)' },
];

export function LevelNamesSection() {
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
        <h2 className="text-lg font-semibold text-foreground mb-1">Level Names</h2>
        <p className="text-sm text-muted-foreground">Rename the three hierarchy levels to match your team&apos;s terminology.</p>
      </div>

      {!canManage && <ReadOnlyBanner />}

      <div className="space-y-4">
        {LEVELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">{label}</label>
              {canManage && local[key] !== DEFAULTS[key] && (
                <button
                  onClick={() => setLocal((p) => ({ ...p, [key]: DEFAULTS[key] }))}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title={`Reset to "${DEFAULTS[key]}"`}
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              )}
            </div>
            <Input
              value={local[key]}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={DEFAULTS[key]}
              disabled={!canManage}
              className="focus-visible:ring-violet-500"
            />
            <p className="text-[10px] text-muted-foreground/50">Default: &quot;{DEFAULTS[key]}&quot;</p>
          </div>
        ))}
      </div>

      {canManage && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          {isSaving ? 'Saving…' : 'Save Level Names'}
        </Button>
      )}
    </div>
  );
}
