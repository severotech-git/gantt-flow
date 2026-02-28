'use client';

import { cn } from '@/lib/utils';

const COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-teal-600',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return COLORS[hash % COLORS.length];
}

interface OwnerAvatarProps {
  name?: string;
  avatar?: string;
  size?: 'sm' | 'md' | number;
  color?: string; // override hex color
  className?: string;
}

export function OwnerAvatar({ name, avatar, size = 'sm', color, className }: OwnerAvatarProps) {
  const isNumeric = typeof size === 'number';
  const dimClass = isNumeric ? '' : (size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs');
  const dimStyle = isNumeric ? { width: size, height: size, fontSize: Math.max(10, size * 0.35) } : undefined;

  if (!name) {
    return (
      <span
        className={cn('rounded-full bg-slate-700 flex items-center justify-center', dimClass, className)}
        style={dimStyle}
      >
        <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
        </svg>
      </span>
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const bgClass = color ? '' : colorFromName(name);

  return (
    <span
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white',
        bgClass,
        dimClass,
        className
      )}
      style={{ ...dimStyle, ...(color ? { backgroundColor: color } : {}) }}
      title={name}
    >
      {initials}
    </span>
  );
}
