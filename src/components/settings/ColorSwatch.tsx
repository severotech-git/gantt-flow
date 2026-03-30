'use client';

import { useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  // neutrals
  '#94a3b8', '#64748b', '#475569', '#1e293b',
  // blue / indigo
  '#a78bfa', '#7c3aed', '#6366f1', '#4338ca',
  // blue / cyan
  '#38bdf8', '#0284c7', '#06b6d4', '#0e7490',
  // green / blue
  '#34d399', '#059669', '#2dd4bf', '#0f766e',
  // amber / orange
  '#fbbf24', '#d97706', '#fb923c', '#c2410c',
  // red / rose / pink
  '#f87171', '#dc2626', '#fb7185', '#be185d',
];

interface ColorSwatchProps {
  color: string;
  onChange: (hex: string) => void;
  size?: number;
}

export function ColorSwatch({ color, onChange, size = 28 }: ColorSwatchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-white/[0.12] transition-all hover:ring-2 hover:ring-white/20 shrink-0"
          style={{ width: size, height: size, backgroundColor: color }}
          title="Pick color"
        />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        className="w-auto p-3 bg-[#1a2030] border-white/10 shadow-xl"
      >
        {/* Preset grid */}
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {PRESET_COLORS.map((preset) => {
            const active = preset.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className={cn(
                  'w-6 h-6 rounded-md border transition-all hover:scale-110 relative',
                  active ? 'border-white/80 ring-1 ring-white/40' : 'border-white/10 hover:border-white/30'
                )}
                style={{ backgroundColor: preset }}
                title={preset}
              >
                {active && (
                  <Check
                    size={11}
                    className="absolute inset-0 m-auto text-white drop-shadow"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider + custom */}
        <div className="border-t border-white/[0.08] pt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span
              className="w-6 h-6 rounded-md border border-dashed border-white/30 flex items-center justify-center text-2xs font-bold"
              style={{ backgroundColor: color }}
            >
              +
            </span>
            Custom
          </button>
          <span className="text-[11px] text-slate-500 font-mono">{color}</span>
          <input
            ref={inputRef}
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
