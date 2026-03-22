'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const COLORS = [
  'bg-blue-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-blue-600',
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
  color?: string;
  className?: string;
}

export function OwnerAvatar({ name, avatar, size = 'sm', color, className }: OwnerAvatarProps) {
  const isNumeric = typeof size === 'number';

  // Pixel size for numeric, or lookup for named sizes
  const px = isNumeric ? size : (size === 'sm' ? 24 : 32);

  // Single initial for small avatars (< 22 px), two for larger
  const maxInitials = px < 22 ? 1 : 2;

  const dimClass = isNumeric ? '' : (size === 'sm' ? 'w-6 h-6' : 'w-8 h-8');
  const dimStyle: React.CSSProperties = isNumeric
    ? { width: px, height: px, fontSize: Math.round(px * 0.42), lineHeight: `${px}px` }
    : { fontSize: size === 'sm' ? 11 : 13 };

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? ''}
        referrerPolicy="no-referrer"
        width={px}
        height={px}
        className={cn('rounded-full object-cover shrink-0', dimClass, className)}
        style={isNumeric ? { width: px, height: px } : undefined}
        title={name}
        unoptimized
      />
    );
  }

  if (!name) {
    return (
      <span
        className={cn('rounded-full bg-slate-700 flex items-center justify-center shrink-0', dimClass, className)}
        style={isNumeric ? { width: px, height: px } : undefined}
      >
        <svg
          style={{ width: Math.max(10, px * 0.55), height: Math.max(10, px * 0.55) }}
          className="text-slate-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z" />
        </svg>
      </span>
    );
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, maxInitials)
    .join('')
    .toUpperCase();

  const bgClass = color ? '' : colorFromName(name);

  return (
    <span
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0 leading-none',
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
