import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { IStatusConfig, IUserConfig, AppLocale, TimelineScale } from '@/types';

export const DEFAULT_STATUSES: IStatusConfig[] = [
  { value: 'todo',        label: 'To Do',       color: '#64748b', isFinal: false },
  { value: 'in-progress', label: 'In Progress', color: '#7c3aed', isFinal: false },
  { value: 'qa',          label: 'QA',          color: '#1d4ed8', isFinal: false },
  { value: 'done',        label: 'Done',        color: '#059669', isFinal: true  },
  { value: 'canceled',    label: 'Canceled',    color: '#475569', isFinal: true  },
  { value: 'blocked',     label: 'Blocked',     color: '#c2410c', isFinal: false },
];

type SettingsKey = 'users' | 'theme' | 'locale' | 'levelNames' | 'statuses' | 'allowWeekends' | 'ganttScale';

interface SettingsState {
  users: IUserConfig[];
  theme: 'dark' | 'light' | 'system';
  locale: AppLocale;
  ganttScale: TimelineScale;
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  allowWeekends: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

interface SettingsActions {
  fetchSettings: () => Promise<void>;
  /** Persist only the specified keys — avoids sending managed fields when the user lacks permission. */
  persistSettings: (...keys: SettingsKey[]) => Promise<void>;
  setTheme: (t: 'dark' | 'light' | 'system') => void;
  setLocale: (l: AppLocale) => void;
  setGanttScale: (s: TimelineScale) => void;
  setAllowWeekends: (v: boolean) => void;
  setLevelName: (level: 'epic' | 'feature' | 'task', v: string) => void;
  // User list CRUD
  addUser: (user: IUserConfig) => void;
  updateUser: (uid: string, patch: Partial<IUserConfig>) => void;
  deleteUser: (uid: string) => void;
  // Status list CRUD
  addStatus: (config: IStatusConfig) => void;
  updateStatus: (value: string, patch: Partial<IStatusConfig>) => void;
  deleteStatus: (value: string) => void;
  reorderStatuses: (newOrder: IStatusConfig[]) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  immer((set, get) => ({
    users: [],
    theme: 'system',
    locale: 'en',
    ganttScale: 'week',
    levelNames: { epic: 'Epic', feature: 'Feature', task: 'Task' },
    statuses: DEFAULT_STATUSES,
    allowWeekends: false,
    isLoading: false,
    isSaving: false,

    fetchSettings: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        const savedScale: TimelineScale = data.ganttScale ?? 'week';
        set((s) => {
          s.users = data.users ?? [];
          s.theme = data.theme ?? 'system';
          s.locale = data.locale ?? 'en';
          s.ganttScale = savedScale;
          s.levelNames = data.levelNames ?? { epic: 'Epic', feature: 'Feature', task: 'Task' };
          s.statuses = data.statuses?.length ? data.statuses : DEFAULT_STATUSES;
          s.allowWeekends = data.allowWeekends ?? false;
        });
        // Apply saved scale to project store without re-persisting
        const { useProjectStore } = await import('@/store/useProjectStore');
        useProjectStore.getState().applyTimelineScale(savedScale);
      } finally {
        set((s) => { s.isLoading = false; });
      }
    },

    persistSettings: async (...keys: SettingsKey[]) => {
      set((s) => { s.isSaving = true; });
      try {
        const state = get();
        const body: Partial<Record<SettingsKey, unknown>> = {};
        for (const k of keys) body[k] = state[k];

        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('[persistSettings] API error', res.status, err);
        }
      } catch (err) {
        console.error('[persistSettings] Network error', err);
      } finally {
        set((s) => { s.isSaving = false; });
      }
    },

    setTheme: (t) => {
      set((s) => { s.theme = t; });
      setTimeout(() => get().persistSettings('theme'), 0);
    },

    setLocale: (l) => {
      set((s) => { s.locale = l; });
      setTimeout(() => get().persistSettings('locale'), 0);
    },

    setGanttScale: (scale) => {
      set((s) => { s.ganttScale = scale; });
      setTimeout(() => get().persistSettings('ganttScale'), 0);
    },

    setAllowWeekends: (v) => {
      set((s) => { s.allowWeekends = v; });
      setTimeout(() => get().persistSettings('allowWeekends'), 0);
    },

    setLevelName: (level, v) => set((s) => { s.levelNames[level] = v; }),

    addUser: (user) => set((s) => { s.users.push(user); }),
    updateUser: (uid, patch) => set((s) => {
      const idx = s.users.findIndex((u) => u.uid === uid);
      if (idx !== -1) Object.assign(s.users[idx], patch);
    }),
    deleteUser: (uid) => set((s) => {
      s.users = s.users.filter((u) => u.uid !== uid);
    }),

    addStatus: (config) => set((s) => { s.statuses.push(config); }),
    updateStatus: (value, patch) => set((s) => {
      const idx = s.statuses.findIndex((st) => st.value === value);
      if (idx !== -1) Object.assign(s.statuses[idx], patch);
    }),
    deleteStatus: (value) => set((s) => {
      s.statuses = s.statuses.filter((st) => st.value !== value);
    }),
    reorderStatuses: (newOrder) => set((s) => { s.statuses = newOrder; }),
  }))
);
