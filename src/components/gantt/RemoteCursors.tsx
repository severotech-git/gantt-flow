'use client';

import { useSyncExternalStore } from 'react';
import { usePresenceStore } from '@/store/usePresenceStore';

const FADE_TIMEOUT = 3000; // ms until cursor fades
const TICK_INTERVAL = 500; // ms between fade checks

// External clock store for the current time — avoids calling impure functions in render
let clockValue = performance.now();
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function startClock() {
  if (clockTimer) return;
  clockTimer = setInterval(() => {
    clockValue = performance.now();
    clockListeners.forEach((l) => l());
  }, TICK_INTERVAL);
}

function stopClock() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  startClock();
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) stopClock();
  };
}

function getClockSnapshot() {
  return clockValue;
}

/**
 * Renders remote users' cursors as an overlay inside the GanttTimeline
 * scrollable content div. Cursor x/y are content-relative coordinates
 * (computed on the sender as clientPos + scroll offset), so the cursor
 * scrolls naturally with the content — like Figma.
 *
 * The X coordinate is scaled by the ratio of local/remote pxPerDay
 * so cursors point at the correct date even when zoom levels differ.
 */
export function RemoteCursors({ localPxPerDay }: { localPxPerDay: number }) {
  const remoteCursors = usePresenceStore((s) => s.remoteCursors);
  const connectedUsers = usePresenceStore((s) => s.connectedUsers);

  // Pure external store for the current time
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockSnapshot);

  if (remoteCursors.size === 0) return null;

  return (
    <>
      {[...remoteCursors.entries()].map(([userId, cursor]) => {
        const age = now - cursor.lastSeen;
        if (age > FADE_TIMEOUT + 1000) return null; // fully gone

        const user = connectedUsers.find((u) => u.userId === userId);
        if (!user) return null;

        // cursor.x/y are content-relative (sender computed: clientPos + scrollOffset).
        // Scale X by zoom ratio so the cursor points at the correct date.
        const scale = cursor.pxPerDay > 0 ? localPxPerDay / cursor.pxPerDay : 1;
        const x = cursor.x * scale;
        const y = cursor.y;

        const opacity = age > FADE_TIMEOUT ? 0 : 1;

        return (
          <div
            key={userId}
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: x,
              top: y,
              zIndex: 50,
              transition: 'left 60ms linear, top 60ms linear, opacity 300ms ease',
              opacity,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L6.5 18L8.5 10.5L15 8.5L1 1Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {/* Name label */}
            <span
              className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </span>
          </div>
        );
      })}
    </>
  );
}
