'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
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
  const [local, setLocal] = useState({ ...levelNames });

  function handleSave() {
    setLevelName('epic', local.epic);
    setLevelName('feature', local.feature);
    setLevelName('task', local.task);
    persistSettings();
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Level Names</h2>
        <p className="text-sm text-slate-400">Rename the three hierarchy levels to match your team&apos;s terminology.</p>
      </div>

      <div className="space-y-4">
        {LEVELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">{label}</label>
              {local[key] !== DEFAULTS[key] && (
                <button
                  onClick={() => setLocal((p) => ({ ...p, [key]: DEFAULTS[key] }))}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
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
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
            />
            <p className="text-[10px] text-slate-600">Default: &quot;{DEFAULTS[key]}&quot;</p>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-violet-600 hover:bg-violet-500 text-white"
      >
        {isSaving ? 'Saving…' : 'Save Level Names'}
      </Button>
    </div>
  );
}
