import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { IEpic, IFeature, IProject, IProjectSnapshot, ITask, TimelineScale, IComment } from '@/types';
import { rollupEpicDates, rollupFeatureDates, getDefaultStartDate, getProjectTimelineStart, countDays, addWorkdays } from '@/lib/dateUtils';
import { parseISO, isValid } from 'date-fns';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { getSocket } from '@/lib/socket';
import type { ProjectAction } from '@/lib/socketEvents';

function computeDayCount(s: string, e: string, allowWeekends: boolean): number {
  const start = parseISO(s);
  const end = parseISO(e);
  if (!isValid(start) || !isValid(end)) return 0;
  return countDays(start, end, allowWeekends);
}

// ─── State shape ─────────────────────────────────────────────────────────────

interface ProjectState {
  // Projects list (lightweight, no epics)
  projects: Omit<IProject, 'epics'>[];
  archivedProjects: Omit<IProject, 'epics'>[];
  showArchived: boolean;
  isLoadingProjects: boolean;

  // Active project (full, with epics)
  activeProject: IProject | null;
  isLoadingProject: boolean;
  projectError: string | null;

  // Version control
  activeVersion: IProjectSnapshot | null; // null = live draft
  isVersionReadOnly: boolean;
  versions: Omit<IProjectSnapshot, 'snapshotData'>[]; // list without heavy data

  // Timeline display
  timelineScale: TimelineScale;
  timelineStartDate: Date;
  timelineScrollTarget: number | null; // px to set scrollLeft after a start-date reset
  zoomLevel: number;

  // UI state
  isSaving: boolean;
  focusedBarId: string | null;
  viewMode: 'gantt' | 'kanban';

  // Item detail drawer
  openItemRef: { epicId: string; featureId?: string; taskId?: string } | null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface ProjectActions {
  // Project list
  fetchProjects: () => Promise<void>;
  fetchArchivedProjects: () => Promise<void>;
  setShowArchived: (v: boolean) => void;
  archiveProject: (id: string) => Promise<void>;
  unarchiveProject: (id: string) => Promise<void>;
  createProject: (name: string, description?: string, color?: string) => Promise<IProject | null>;
  importProject: (name: string, description: string, color: string, epics: Omit<IEpic, '_id'>[]) => Promise<IProject | null>;
  deleteProject: (id: string) => Promise<void>;

  // Active project
  fetchProject: (id: string) => Promise<void>;
  updateProject: (patch: { name?: string; description?: string; color?: string }) => Promise<void>;
  clearActiveProject: () => void;

  // Timeline
  setTimelineScale: (scale: TimelineScale) => void;
  applyTimelineScale: (scale: TimelineScale) => void; // applies without persisting to settings
  setTimelineStartDate: (date: Date) => void;
  setZoomLevel: (z: number) => void;
  jumpToToday: () => void;
  clearTimelineScrollTarget: () => void;

  // Version control
  fetchVersions: (projectId: string) => Promise<void>;
  saveVersion: (versionName: string) => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  clearVersion: () => void;
  deleteVersion: (versionId: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;

  // Epics
  addEpic: (epic: Omit<IEpic, '_id'>, createdBy?: string) => Promise<void>;
  updateEpic: (epicId: string, patch: Partial<IEpic>) => Promise<void>;
  removeEpic: (epicId: string) => Promise<void>;

  // Features
  addFeature: (epicId: string, feature: Omit<IFeature, '_id'>, createdBy?: string) => Promise<void>;
  updateFeature: (epicId: string, featureId: string, patch: Partial<IFeature>) => Promise<void>;
  removeFeature: (epicId: string, featureId: string) => Promise<void>;

  // Tasks
  addTask: (epicId: string, featureId: string, task: Omit<ITask, '_id'>, createdBy?: string) => Promise<void>;
  updateTask: (epicId: string, featureId: string, taskId: string, patch: Partial<ITask>) => Promise<void>;
  removeTask: (epicId: string, featureId: string, taskId: string) => Promise<void>;
  updateDayCount: (epicId: string, featureId: string | undefined, taskId: string | undefined, n: number) => Promise<void>;

  // UI toggles
  toggleEpic: (epicId: string) => void;
  toggleFeature: (epicId: string, featureId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFocusedBarId: (id: string | null) => void;
  setViewMode: (mode: 'gantt' | 'kanban') => void;

  // Item detail drawer
  openItem: (ref: { epicId: string; featureId?: string; taskId?: string }) => void;
  closeItem: () => void;
  addComment: (epicId: string, featureId: string | undefined, taskId: string | undefined, text: string, authorId: string, mentionedUserIds?: string[]) => Promise<void>;

  // Persist to server
  persistProject: () => Promise<void>;

  // Real-time collaboration
  _applyRemoteAction: (action: ProjectAction) => void;
}

type ProjectStore = ProjectState & ProjectActions;

// ─── ID generator (client-side temp ID for optimistic updates) ───────────────

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Real-time action emission ───────────────────────────────────────────────

function emitAction(action: ProjectAction) {
  if (typeof window === 'undefined') return; // Skip during SSR
  const projectId = usePresenceStore.getState().currentProjectId;
  if (!projectId) return;
  try {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('remote-action', { projectId, action });
    }
  } catch {
    // Socket not available — skip silently
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────
    projects: [],
    archivedProjects: [],
    showArchived: false,
    isLoadingProjects: false,
    activeProject: null,
    isLoadingProject: false,
    projectError: null,
    activeVersion: null,
    isVersionReadOnly: false,
    versions: [],
    timelineScale: 'week',
    timelineStartDate: getDefaultStartDate('week'),
    timelineScrollTarget: null,
    zoomLevel: 1,
    isSaving: false,
    focusedBarId: null,
    viewMode: 'gantt',
    openItemRef: null,

    // ── Project list ────────────────────────────────────────────────────────
    fetchProjects: async () => {
      set((s) => { s.isLoadingProjects = true; });
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        set((s) => { s.projects = Array.isArray(data) ? data : []; s.isLoadingProjects = false; });
      } catch {
        set((s) => { s.isLoadingProjects = false; });
      }
    },

    fetchArchivedProjects: async () => {
      try {
        const res = await fetch('/api/projects?archived=true');
        const data = await res.json();
        set((s) => { s.archivedProjects = Array.isArray(data) ? data : []; });
      } catch { /* swallow */ }
    },

    setShowArchived: (v) => {
      set((s) => { s.showArchived = v; });
      if (v) get().fetchArchivedProjects();
    },

    archiveProject: async (id) => {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      set((s) => {
        const proj = s.projects.find((p) => p._id === id);
        s.projects = s.projects.filter((p) => p._id !== id);
        if (proj && s.showArchived) s.archivedProjects.unshift({ ...proj, archived: true });
      });
    },

    unarchiveProject: async (id) => {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      set((s) => {
        const proj = s.archivedProjects.find((p) => p._id === id);
        s.archivedProjects = s.archivedProjects.filter((p) => p._id !== id);
        if (proj) s.projects.unshift({ ...proj, archived: false });
      });
    },

    createProject: async (name, description, color) => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color }),
        });
        if (!res.ok) return null;
        const project: IProject = await res.json();
        set((s) => {
          if (!Array.isArray(s.projects)) s.projects = [];
          s.projects.unshift(project as unknown as Omit<IProject, 'epics'>);
        });
        return project;
      } catch {
        return null;
      }
    },

    importProject: async (name, description, color, epics) => {
      try {
        const res = await fetch('/api/projects/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color, epics }),
        });
        if (!res.ok) return null;
        const project: IProject = await res.json();
        set((s) => {
          if (!Array.isArray(s.projects)) s.projects = [];
          s.projects.unshift(project as unknown as Omit<IProject, 'epics'>);
        });
        return project;
      } catch {
        return null;
      }
    },

    deleteProject: async (id) => {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      set((s) => {
        s.projects = s.projects.filter((p) => p._id !== id);
        s.archivedProjects = s.archivedProjects.filter((p) => p._id !== id);
      });
    },

    // ── Active project ──────────────────────────────────────────────────────
    fetchProject: async (id) => {
      set((s) => {
        s.isLoadingProject = true;
        s.activeProject = null;
        s.projectError = null; // Clear previous errors
      });
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
           const errorData = await res.json().catch(() => ({}));
           set((s) => {
             s.activeProject = null;
             s.isLoadingProject = false;
             s.projectError = errorData.error || (res.status === 404 ? 'Not Found' : 'Failed to fetch');
           });
           return;
        }
        const data: IProject = await res.json();
        set((s) => {
          const BASE_PX: Record<string, number> = { week: 28, month: 10, quarter: 4 };
          const pxPerDay = BASE_PX[s.timelineScale] * s.zoomLevel;
          const { startDate, todayOffsetDays } = getProjectTimelineStart(data, s.timelineScale);
          s.activeProject = data;
          s.isLoadingProject = false;
          s.activeVersion = null;
          s.isVersionReadOnly = false;
          s.projectError = null;
          s.timelineStartDate = startDate;
          // Scroll so today appears ~200px from the left edge on first render
          s.timelineScrollTarget = Math.max(todayOffsetDays * pxPerDay - 200, 0);
        });
      } catch {
        set((s) => {
          s.activeProject = null;
          s.isLoadingProject = false;
          s.projectError = 'Network error';
        });
      }
    },

    updateProject: async (patch) => {
      const project = get().activeProject;
      if (!project) return;
      const res = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const updated: IProject = await res.json();
      set((s) => { s.activeProject = updated; });
    },

    clearActiveProject: () => {
      set((s) => {
        s.activeProject = null;
        s.activeVersion = null;
        s.isVersionReadOnly = false;
      });
    },

    // ── Timeline ────────────────────────────────────────────────────────────
    setTimelineScale: (scale) => {
      set((s) => {
        const BASE_PX: Record<string, number> = { week: 28, month: 10, quarter: 4 };
        const pxPerDay = BASE_PX[scale] * s.zoomLevel;
        if (s.activeProject) {
          const { startDate, todayOffsetDays } = getProjectTimelineStart(s.activeProject, scale);
          s.timelineScale = scale;
          s.timelineStartDate = startDate;
          s.timelineScrollTarget = Math.max(todayOffsetDays * pxPerDay - 200, 0);
        } else {
          s.timelineScale = scale;
          s.timelineStartDate = getDefaultStartDate(scale);
          s.timelineScrollTarget = null;
        }
      });
      // Persist the preference
      useSettingsStore.getState().setGanttScale(scale);
    },

    applyTimelineScale: (scale) => {
      set((s) => {
        const BASE_PX: Record<string, number> = { week: 28, month: 10, quarter: 4 };
        const pxPerDay = BASE_PX[scale] * s.zoomLevel;
        s.timelineScale = scale;
        if (s.activeProject) {
          const { startDate, todayOffsetDays } = getProjectTimelineStart(s.activeProject, scale);
          s.timelineStartDate = startDate;
          s.timelineScrollTarget = Math.max(todayOffsetDays * pxPerDay - 200, 0);
        } else {
          s.timelineStartDate = getDefaultStartDate(scale);
        }
      });
    },

    setTimelineStartDate: (date) => {
      set((s) => { s.timelineStartDate = date; });
    },

    setZoomLevel: (z) => {
      set((s) => { s.zoomLevel = Math.min(4, Math.max(0.25, z)); });
    },

    jumpToToday: () => {
      const { timelineScale, zoomLevel, activeProject } = get();
      const BASE_PX: Record<string, number> = { week: 28, month: 10, quarter: 4 };
      const pxPerDay = BASE_PX[timelineScale] * zoomLevel;
      if (activeProject) {
        const { startDate, todayOffsetDays } = getProjectTimelineStart(activeProject, timelineScale);
        set((s) => {
          s.timelineStartDate = startDate;
          s.timelineScrollTarget = Math.max(todayOffsetDays * pxPerDay - 200, 0);
        });
      } else {
        const offsetDays = Math.max(2, Math.round(200 / pxPerDay));
        const startDate = new Date(Date.now() - offsetDays * 86_400_000);
        set((s) => { s.timelineStartDate = startDate; s.timelineScrollTarget = null; });
      }
    },

    clearTimelineScrollTarget: () => {
      set((s) => { s.timelineScrollTarget = null; });
    },

    // ── Version control ─────────────────────────────────────────────────────
    fetchVersions: async (projectId) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/versions`);
        const data = await res.json();
        set((s) => { s.versions = Array.isArray(data) ? data : []; });
      } catch { /* swallow */ }
    },

    saveVersion: async (versionName) => {
      const project = get().activeProject;
      if (!project) return;
      set((s) => { s.isSaving = true; });
      try {
        // First persist current state
        await get().persistProject();
        const res = await fetch(`/api/projects/${project._id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionName }),
        });
        if (res.ok) {
          const snapshot = await res.json();
          set((s) => {
            s.versions.unshift(snapshot);
            if (s.activeProject) {
              s.activeProject.currentVersion = `${versionName} (Current)`;
            }
          });
        }
      } finally {
        set((s) => { s.isSaving = false; });
      }
    },

    loadVersion: async (versionId) => {
      const project = get().activeProject;
      if (!project) return;
      try {
        const res = await fetch(`/api/projects/${project._id}/versions/${versionId}`);
        const snapshot: IProjectSnapshot = await res.json();
        set((s) => {
          s.activeVersion = snapshot;
          s.isVersionReadOnly = true;
        });
      } catch { /* swallow */ }
    },

    clearVersion: () => {
      set((s) => {
        s.activeVersion = null;
        s.isVersionReadOnly = false;
      });
    },

    deleteVersion: async (versionId) => {
      const project = get().activeProject;
      if (!project) return;
      const res = await fetch(`/api/projects/${project._id}/versions/${versionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        set((s) => {
          s.versions = s.versions.filter((v) => v._id !== versionId);
          if (s.activeVersion?._id === versionId) {
            s.activeVersion = null;
            s.isVersionReadOnly = false;
          }
        });
      }
    },

    restoreVersion: async (versionId) => {
      const project = get().activeProject;
      if (!project) return;
      set((s) => { s.isSaving = true; });
      try {
        const res = await fetch(`/api/projects/${project._id}/versions/${versionId}`, {
          method: 'PATCH',
        });
        if (res.ok) {
          await get().fetchProject(project._id);
          set((s) => {
            s.activeVersion = null;
            s.isVersionReadOnly = false;
          });
        }
      } finally {
        set((s) => { s.isSaving = false; });
      }
    },

    // ── Epics ───────────────────────────────────────────────────────────────
    addEpic: async (epic, createdBy?) => {
      const newEpic = { ...epic, _id: tempId(), createdBy } as IEpic;
      set((s) => {
        if (!s.activeProject) return;
        const allowWeekends = useSettingsStore.getState().allowWeekends;
        newEpic.dayCount = computeDayCount(newEpic.plannedStart, newEpic.plannedEnd, allowWeekends);
        s.activeProject.epics.push(newEpic);
      });
      emitAction({ type: 'addEpic', epic: newEpic });
      await get().persistProject();
    },

    updateEpic: async (epicId, patch) => {
      set((s) => {
        if (!s.activeProject) return;
        const idx = s.activeProject.epics.findIndex((e) => e._id === epicId);
        if (idx === -1) return;
        s.activeProject.epics[idx] = { ...s.activeProject.epics[idx], ...patch };
        const epic = s.activeProject.epics[idx];
        const allowWeekends = useSettingsStore.getState().allowWeekends;
        epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
      });
      emitAction({ type: 'updateEpic', epicId, patch });
      await get().persistProject();
    },

    removeEpic: async (epicId) => {
      set((s) => {
        if (!s.activeProject) return;
        s.activeProject.epics = s.activeProject.epics.filter((e) => e._id !== epicId);
      });
      emitAction({ type: 'removeEpic', epicId });
      await get().persistProject();
    },

    // ── Features ────────────────────────────────────────────────────────────
    addFeature: async (epicId, feature, createdBy?) => {
      const newFeat = { ...feature, _id: tempId(), createdBy } as IFeature;
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const { allowWeekends, statuses } = useSettingsStore.getState();
        newFeat.dayCount = computeDayCount(newFeat.plannedStart, newFeat.plannedEnd, allowWeekends);
        epic.features.push(newFeat);
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
        epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
      });
      emitAction({ type: 'addFeature', epicId, feature: newFeat });
      await get().persistProject();
    },

    updateFeature: async (epicId, featureId, patch) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const fIdx = epic.features.findIndex((f) => f._id === featureId);
        if (fIdx === -1) return;
        const { allowWeekends, statuses } = useSettingsStore.getState();
        epic.features[fIdx] = { ...epic.features[fIdx], ...patch } as IFeature;
        const feat = epic.features[fIdx];
        feat.dayCount = computeDayCount(feat.plannedStart, feat.plannedEnd, allowWeekends);
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
        epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
      });
      emitAction({ type: 'updateFeature', epicId, featureId, patch });
      await get().persistProject();
    },

    removeFeature: async (epicId, featureId) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        epic.features = epic.features.filter((f) => f._id !== featureId);
        const { statuses } = useSettingsStore.getState();
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
      });
      emitAction({ type: 'removeFeature', epicId, featureId });
      await get().persistProject();
    },

    // ── Tasks ────────────────────────────────────────────────────────────────
    addTask: async (epicId, featureId, task, createdBy?) => {
      const newTask = { ...task, _id: tempId(), createdBy } as ITask;
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const feature = epic.features.find((f) => f._id === featureId);
        if (!feature) return;
        const { allowWeekends, statuses } = useSettingsStore.getState();
        newTask.dayCount = computeDayCount(newTask.plannedStart, newTask.plannedEnd, allowWeekends);
        feature.tasks.push(newTask);
        const rolledFeature = rollupFeatureDates(feature as IFeature, statuses);
        Object.assign(feature, rolledFeature);
        feature.dayCount = computeDayCount(feature.plannedStart, feature.plannedEnd, allowWeekends);
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
        epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
      });
      emitAction({ type: 'addTask', epicId, featureId, task: newTask });
      await get().persistProject();
    },

    updateTask: async (epicId, featureId, taskId, patch) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const feature = epic.features.find((f) => f._id === featureId);
        if (!feature) return;
        const tIdx = feature.tasks.findIndex((t) => t._id === taskId);
        if (tIdx === -1) return;
        const { allowWeekends, statuses } = useSettingsStore.getState();
        feature.tasks[tIdx] = { ...feature.tasks[tIdx], ...patch } as ITask;
        const taskItem = feature.tasks[tIdx];
        // Auto-manage actualEnd based on status finality
        if ('status' in patch) {
          const isFinal = statuses.find((st) => st.value === taskItem.status)?.isFinal ?? false;
          if (isFinal) {
            // Moving to a final status → stamp actualEnd if not already set
            if (!taskItem.actualEnd) {
              taskItem.actualEnd = new Date().toISOString();
            }
          } else {
            // Moving away from a final status → clear actualEnd
            taskItem.actualEnd = undefined;
          }
        }
        taskItem.dayCount = computeDayCount(taskItem.plannedStart, taskItem.plannedEnd, allowWeekends);
        // Rollup dates bottom-up
        const rolledFeature = rollupFeatureDates(feature as IFeature, statuses);
        Object.assign(feature, rolledFeature);
        feature.dayCount = computeDayCount(feature.plannedStart, feature.plannedEnd, allowWeekends);
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
        epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
      });
      emitAction({ type: 'updateTask', epicId, featureId, taskId, patch });
      await get().persistProject();
    },

    removeTask: async (epicId, featureId, taskId) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const feature = epic.features.find((f) => f._id === featureId);
        if (!feature) return;
        feature.tasks = feature.tasks.filter((t) => t._id !== taskId);
        const { statuses } = useSettingsStore.getState();
        const rolledFeature = rollupFeatureDates(feature as IFeature, statuses);
        Object.assign(feature, rolledFeature);
        const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
        Object.assign(epic, rolledEpic);
      });
      emitAction({ type: 'removeTask', epicId, featureId, taskId });
      await get().persistProject();
    },

    updateDayCount: async (epicId, featureId, taskId, n) => {
      const { allowWeekends } = useSettingsStore.getState();
      if (taskId && featureId) {
        const project = get().activeProject;
        const task = project?.epics.find((e) => e._id === epicId)?.features.find((f) => f._id === featureId)?.tasks.find((t) => t._id === taskId);
        if (!task?.plannedStart) return;
        const newEnd = addWorkdays(parseISO(task.plannedStart), n, allowWeekends).toISOString();
        await get().updateTask(epicId, featureId, taskId, { plannedEnd: newEnd, dayCount: n });
      } else if (featureId) {
        const project = get().activeProject;
        const feat = project?.epics.find((e) => e._id === epicId)?.features.find((f) => f._id === featureId);
        if (!feat?.plannedStart) return;
        const newEnd = addWorkdays(parseISO(feat.plannedStart), n, allowWeekends).toISOString();
        await get().updateFeature(epicId, featureId, { plannedEnd: newEnd, dayCount: n });
      } else {
        const project = get().activeProject;
        const epic = project?.epics.find((e) => e._id === epicId);
        if (!epic?.plannedStart) return;
        const newEnd = addWorkdays(parseISO(epic.plannedStart), n, allowWeekends).toISOString();
        await get().updateEpic(epicId, { plannedEnd: newEnd, dayCount: n });
      }
    },

    // ── UI toggles ───────────────────────────────────────────────────────────
    toggleEpic: (epicId) => {
      let newCollapsed: boolean | undefined;
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        epic.collapsed = !epic.collapsed;
        newCollapsed = epic.collapsed;
      });
      if (newCollapsed !== undefined) {
        emitAction({ type: 'toggleEpicCollapse', epicId, collapsed: newCollapsed });
        get().persistProject();
      }
    },

    toggleFeature: (epicId, featureId) => {
      let newCollapsed: boolean | undefined;
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const feat = epic.features.find((f) => f._id === featureId);
        if (!feat) return;
        feat.collapsed = !feat.collapsed;
        newCollapsed = feat.collapsed;
      });
      if (newCollapsed !== undefined) {
        emitAction({ type: 'toggleFeatureCollapse', epicId, featureId, collapsed: newCollapsed });
        get().persistProject();
      }
    },

    expandAll: () => {
      set((s) => {
        if (!s.activeProject) return;
        for (const epic of s.activeProject.epics) {
          epic.collapsed = false;
          for (const feat of epic.features) {
            feat.collapsed = false;
          }
        }
      });
      emitAction({ type: 'setAllCollapsed', collapsed: false });
      get().persistProject();
    },

    collapseAll: () => {
      set((s) => {
        if (!s.activeProject) return;
        for (const epic of s.activeProject.epics) {
          epic.collapsed = true;
          for (const feat of epic.features) {
            feat.collapsed = true;
          }
        }
      });
      emitAction({ type: 'setAllCollapsed', collapsed: true });
      get().persistProject();
    },

    setFocusedBarId: (id) => {
      set((s) => { s.focusedBarId = id; });
    },

    setViewMode: (mode) => {
      set((s) => { s.viewMode = mode; });
    },

    // ── Real-time: apply remote action without persisting ──────────────────
    _applyRemoteAction: (action: ProjectAction) => {
      set((s) => {
        if (!s.activeProject) return;
        const { allowWeekends, statuses } = useSettingsStore.getState();

        switch (action.type) {
          case 'addEpic': {
            const newEpic = { ...action.epic };
            newEpic.dayCount = computeDayCount(newEpic.plannedStart, newEpic.plannedEnd, allowWeekends);
            s.activeProject.epics.push(newEpic);
            break;
          }
          case 'updateEpic': {
            const idx = s.activeProject.epics.findIndex((e) => e._id === action.epicId);
            if (idx === -1) return;
            s.activeProject.epics[idx] = { ...s.activeProject.epics[idx], ...action.patch };
            const epic = s.activeProject.epics[idx];
            epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
            break;
          }
          case 'removeEpic': {
            s.activeProject.epics = s.activeProject.epics.filter((e) => e._id !== action.epicId);
            break;
          }
          case 'addFeature': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            const newFeat = { ...action.feature };
            newFeat.dayCount = computeDayCount(newFeat.plannedStart, newFeat.plannedEnd, allowWeekends);
            epic.features.push(newFeat);
            const rolledEpic = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rolledEpic);
            epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
            break;
          }
          case 'updateFeature': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            const fIdx = epic.features.findIndex((f) => f._id === action.featureId);
            if (fIdx === -1) return;
            epic.features[fIdx] = { ...epic.features[fIdx], ...action.patch } as IFeature;
            const feat = epic.features[fIdx];
            feat.dayCount = computeDayCount(feat.plannedStart, feat.plannedEnd, allowWeekends);
            const rolledEpic2 = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rolledEpic2);
            epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
            break;
          }
          case 'removeFeature': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            epic.features = epic.features.filter((f) => f._id !== action.featureId);
            const rolledEpic3 = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rolledEpic3);
            break;
          }
          case 'addTask': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            const feature = epic.features.find((f) => f._id === action.featureId);
            if (!feature) return;
            const newTask = { ...action.task };
            newTask.dayCount = computeDayCount(newTask.plannedStart, newTask.plannedEnd, allowWeekends);
            feature.tasks.push(newTask);
            const rF = rollupFeatureDates(feature as IFeature, statuses);
            Object.assign(feature, rF);
            feature.dayCount = computeDayCount(feature.plannedStart, feature.plannedEnd, allowWeekends);
            const rE = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rE);
            epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
            break;
          }
          case 'updateTask': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            const feature = epic.features.find((f) => f._id === action.featureId);
            if (!feature) return;
            const tIdx = feature.tasks.findIndex((t) => t._id === action.taskId);
            if (tIdx === -1) return;
            feature.tasks[tIdx] = { ...feature.tasks[tIdx], ...action.patch } as ITask;
            const taskItem = feature.tasks[tIdx];
            if (action.patch.status !== undefined) {
              const isFinal = statuses.find((st) => st.value === taskItem.status)?.isFinal ?? false;
              if (isFinal && !taskItem.actualEnd) {
                taskItem.actualEnd = new Date().toISOString();
              } else if (!isFinal) {
                taskItem.actualEnd = undefined;
              }
            }
            taskItem.dayCount = computeDayCount(taskItem.plannedStart, taskItem.plannedEnd, allowWeekends);
            const rF2 = rollupFeatureDates(feature as IFeature, statuses);
            Object.assign(feature, rF2);
            feature.dayCount = computeDayCount(feature.plannedStart, feature.plannedEnd, allowWeekends);
            const rE2 = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rE2);
            epic.dayCount = computeDayCount(epic.plannedStart, epic.plannedEnd, allowWeekends);
            break;
          }
          case 'removeTask': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) return;
            const feature = epic.features.find((f) => f._id === action.featureId);
            if (!feature) return;
            feature.tasks = feature.tasks.filter((t) => t._id !== action.taskId);
            const rF3 = rollupFeatureDates(feature as IFeature, statuses);
            Object.assign(feature, rF3);
            const rE3 = rollupEpicDates(epic as IEpic, statuses);
            Object.assign(epic, rE3);
            break;
          }
          case 'updateDayCount': {
            // Handled via updateTask/updateFeature/updateEpic on the originating client,
            // which emits those specific actions instead. No-op here.
            break;
          }
          case 'toggleEpicCollapse': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (epic) epic.collapsed = action.collapsed;
            break;
          }
          case 'toggleFeatureCollapse': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) break;
            const feat = epic.features.find((f) => f._id === action.featureId);
            if (feat) feat.collapsed = action.collapsed;
            break;
          }
          case 'setAllCollapsed': {
            for (const epic of s.activeProject.epics) {
              epic.collapsed = action.collapsed;
              for (const feat of epic.features) {
                feat.collapsed = action.collapsed;
              }
            }
            break;
          }
          case 'addComment': {
            const epic = s.activeProject.epics.find((e) => e._id === action.epicId);
            if (!epic) break;
            let target: { comments?: typeof action.comment[] } | undefined;
            if (!action.featureId) {
              target = epic;
            } else {
              const feature = epic.features.find((f) => f._id === action.featureId);
              if (!feature) break;
              target = action.taskId
                ? feature.tasks.find((t) => t._id === action.taskId)
                : feature;
            }
            if (!target) break;
            if (!target.comments) target.comments = [];
            target.comments.push(action.comment);
            break;
          }
        }
      });
    },

    // ── Item detail drawer ──────────────────────────────────────────────────────
    openItem: (ref) => {
      set((s) => { s.openItemRef = ref; });
    },

    closeItem: () => {
      set((s) => { s.openItemRef = null; });
    },

    addComment: async (epicId, featureId, taskId, text, authorId, mentionedUserIds) => {
      const { activeProject } = get();
      if (!activeProject) return;

      const commentId = tempId();
      const comment: IComment = {
        _id: commentId,
        authorId,
        text,
        mentionedUserIds,
        createdAt: new Date().toISOString(),
      };

      // Optimistic update: add comment to local state
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        let target;
        if (!featureId) {
          target = epic;
        } else {
          const feature = epic.features.find((f) => f._id === featureId);
          if (!feature) return;
          if (!taskId) {
            target = feature;
          } else {
            const task = feature.tasks.find((t) => t._id === taskId);
            if (!task) return;
            target = task;
          }
        }
        if (!target.comments) target.comments = [];
        target.comments.push(comment);
      });

      // Emit to other clients for real-time sync
      emitAction({ type: 'addComment', epicId, featureId, taskId, comment });

      // Post to dedicated comment endpoint (will trigger notifications)
      try {
        await fetch(`/api/projects/${activeProject._id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            epicId,
            featureId,
            taskId,
            text,
            authorId,
            mentionedUserIds,
          }),
        });
      } catch (err) {
        console.error('[addComment] API call failed', err);
      }
    },

    // ── Persist ──────────────────────────────────────────────────────────────
    persistProject: async () => {
      const project = get().activeProject;
      if (!project || get().isVersionReadOnly) return;

      set((s) => { s.isSaving = true; });
      try {
        const res = await fetch(`/api/projects/${project._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: project.name,
            description: project.description,
            color: project.color,
            epics: project.epics,
            currentVersion: project.currentVersion,
          }),
        });

        if (res.ok) {
          const updatedProject: IProject = await res.json();
          // We update the active project with the server response to sync IDs (tmp_ -> real)
          // but we only do this if the user hasn't moved to another version/project.
          set((s) => {
            if (s.activeProject && s.activeProject._id === updatedProject._id) {
              s.activeProject = updatedProject;
            }
          });
        } else {
          const err = await res.json();
          console.error('[persistProject] Failed:', err);
        }
      } catch (err) {
        console.error('[persistProject] Error:', err);
      } finally {
        set((s) => { s.isSaving = false; });
      }
    },
  }))
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Returns the project data to display (snapshot if viewing history, live otherwise). */
export function selectDisplayProject(state: ProjectStore): IProject | null {
  if (state.isVersionReadOnly && state.activeVersion) {
    return state.activeVersion.snapshotData;
  }
  return state.activeProject;
}
