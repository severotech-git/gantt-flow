import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { IStatusConfig, IUserConfig } from '@/types';

export const DEFAULT_STATUSES: IStatusConfig[] = [
  { value: 'todo',        label: 'To Do',       color: '#64748b', isFinal: false },
  { value: 'in-progress', label: 'In Progress', color: '#7c3aed', isFinal: false },
  { value: 'qa',          label: 'QA',          color: '#1d4ed8', isFinal: false },
  { value: 'done',        label: 'Done',        color: '#059669', isFinal: true  },
  { value: 'canceled',    label: 'Canceled',    color: '#475569', isFinal: true  },
  { value: 'blocked',     label: 'Blocked',     color: '#c2410c', isFinal: false },
];

interface SettingsState {
  users: IUserConfig[];
  theme: 'dark' | 'light';
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  isLoading: boolean;
  isSaving: boolean;
}

interface SettingsActions {
  fetchSettings: () => Promise<void>;
  persistSettings: () => Promise<void>;
  setTheme: (t: 'dark' | 'light') => void;
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
    theme: 'dark',
    levelNames: { epic: 'Epic', feature: 'Feature', task: 'Task' },
    statuses: DEFAULT_STATUSES,
    isLoading: false,
    isSaving: false,

    fetchSettings: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        set((s) => {
          s.users = data.users ?? [];
          s.theme = data.theme ?? 'dark';
          s.levelNames = data.levelNames ?? { epic: 'Epic', feature: 'Feature', task: 'Task' };
          s.statuses = data.statuses?.length ? data.statuses : DEFAULT_STATUSES;
        });
      } finally {
        set((s) => { s.isLoading = false; });
      }
    },

    persistSettings: async () => {
      set((s) => { s.isSaving = true; });
      try {
        const { users, theme, levelNames, statuses } = get();
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users, theme, levelNames, statuses }),
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
      setTimeout(() => get().persistSettings(), 0);
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
