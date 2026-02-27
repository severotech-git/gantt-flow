import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { IEpic, IFeature, IProject, IProjectSnapshot, ITask, TimelineScale } from '@/types';
import { rollupEpicDates, rollupFeatureDates, getDefaultStartDate } from '@/lib/dateUtils';

// Required for Immer to draft Map and Set instances
enableMapSet();

// ─── State shape ─────────────────────────────────────────────────────────────

interface ProjectState {
  // Projects list (lightweight, no epics)
  projects: Omit<IProject, 'epics'>[];
  isLoadingProjects: boolean;

  // Active project (full, with epics)
  activeProject: IProject | null;
  isLoadingProject: boolean;

  // Version control
  activeVersion: IProjectSnapshot | null; // null = live draft
  isVersionReadOnly: boolean;
  versions: Omit<IProjectSnapshot, 'snapshotData'>[]; // list without heavy data

  // Timeline display
  timelineScale: TimelineScale;
  timelineStartDate: Date;

  // UI state
  expandedEpicIds: Set<string>;
  expandedFeatureIds: Set<string>;
  isSaving: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface ProjectActions {
  // Project list
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string, color?: string) => Promise<IProject | null>;
  deleteProject: (id: string) => Promise<void>;

  // Active project
  fetchProject: (id: string) => Promise<void>;
  clearActiveProject: () => void;

  // Timeline
  setTimelineScale: (scale: TimelineScale) => void;
  setTimelineStartDate: (date: Date) => void;

  // Version control
  fetchVersions: (projectId: string) => Promise<void>;
  saveVersion: (versionName: string) => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  clearVersion: () => void;

  // Epics
  addEpic: (epic: Omit<IEpic, '_id'>) => Promise<void>;
  updateEpic: (epicId: string, patch: Partial<IEpic>) => Promise<void>;
  removeEpic: (epicId: string) => Promise<void>;

  // Features
  addFeature: (epicId: string, feature: Omit<IFeature, '_id'>) => Promise<void>;
  updateFeature: (epicId: string, featureId: string, patch: Partial<IFeature>) => Promise<void>;
  removeFeature: (epicId: string, featureId: string) => Promise<void>;

  // Tasks
  addTask: (epicId: string, featureId: string, task: Omit<ITask, '_id'>) => Promise<void>;
  updateTask: (epicId: string, featureId: string, taskId: string, patch: Partial<ITask>) => Promise<void>;
  removeTask: (epicId: string, featureId: string, taskId: string) => Promise<void>;

  // UI toggles
  toggleEpic: (epicId: string) => void;
  toggleFeature: (featureId: string) => void;

  // Persist to server
  persistProject: () => Promise<void>;
}

type ProjectStore = ProjectState & ProjectActions;

// ─── ID generator (client-side temp ID for optimistic updates) ───────────────

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────
    projects: [],
    isLoadingProjects: false,
    activeProject: null,
    isLoadingProject: false,
    activeVersion: null,
    isVersionReadOnly: false,
    versions: [],
    timelineScale: 'week',
    timelineStartDate: getDefaultStartDate('week'),
    expandedEpicIds: new Set<string>(),
    expandedFeatureIds: new Set<string>(),
    isSaving: false,

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

    deleteProject: async (id) => {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      set((s) => { s.projects = s.projects.filter((p) => p._id !== id); });
    },

    // ── Active project ──────────────────────────────────────────────────────
    fetchProject: async (id) => {
      set((s) => { s.isLoadingProject = true; });
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data: IProject = await res.json();
        set((s) => {
          s.activeProject = data;
          s.isLoadingProject = false;
          s.activeVersion = null;
          s.isVersionReadOnly = false;
        });
      } catch {
        set((s) => { s.isLoadingProject = false; });
      }
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
        s.timelineScale = scale;
        s.timelineStartDate = getDefaultStartDate(scale);
      });
    },

    setTimelineStartDate: (date) => {
      set((s) => { s.timelineStartDate = date; });
    },

    // ── Version control ─────────────────────────────────────────────────────
    fetchVersions: async (projectId) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/versions`);
        const data = await res.json();
        set((s) => { s.versions = data; });
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

    // ── Epics ───────────────────────────────────────────────────────────────
    addEpic: async (epic) => {
      set((s) => {
        if (!s.activeProject) return;
        s.activeProject.epics.push({ ...epic, _id: tempId() } as IEpic);
      });
      await get().persistProject();
    },

    updateEpic: async (epicId, patch) => {
      set((s) => {
        if (!s.activeProject) return;
        const idx = s.activeProject.epics.findIndex((e) => e._id === epicId);
        if (idx === -1) return;
        s.activeProject.epics[idx] = { ...s.activeProject.epics[idx], ...patch };
      });
      await get().persistProject();
    },

    removeEpic: async (epicId) => {
      set((s) => {
        if (!s.activeProject) return;
        s.activeProject.epics = s.activeProject.epics.filter((e) => e._id !== epicId);
      });
      await get().persistProject();
    },

    // ── Features ────────────────────────────────────────────────────────────
    addFeature: async (epicId, feature) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        epic.features.push({ ...feature, _id: tempId() } as IFeature);
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
      await get().persistProject();
    },

    updateFeature: async (epicId, featureId, patch) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const fIdx = epic.features.findIndex((f) => f._id === featureId);
        if (fIdx === -1) return;
        epic.features[fIdx] = { ...epic.features[fIdx], ...patch } as IFeature;
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
      await get().persistProject();
    },

    removeFeature: async (epicId, featureId) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        epic.features = epic.features.filter((f) => f._id !== featureId);
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
      await get().persistProject();
    },

    // ── Tasks ────────────────────────────────────────────────────────────────
    addTask: async (epicId, featureId, task) => {
      set((s) => {
        if (!s.activeProject) return;
        const epic = s.activeProject.epics.find((e) => e._id === epicId);
        if (!epic) return;
        const feature = epic.features.find((f) => f._id === featureId);
        if (!feature) return;
        feature.tasks.push({ ...task, _id: tempId() } as ITask);
        const rolledFeature = rollupFeatureDates(feature as IFeature);
        Object.assign(feature, rolledFeature);
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
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
        feature.tasks[tIdx] = { ...feature.tasks[tIdx], ...patch } as ITask;
        // Rollup dates bottom-up
        const rolledFeature = rollupFeatureDates(feature as IFeature);
        Object.assign(feature, rolledFeature);
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
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
        const rolledFeature = rollupFeatureDates(feature as IFeature);
        Object.assign(feature, rolledFeature);
        const rolledEpic = rollupEpicDates(epic as IEpic);
        Object.assign(epic, rolledEpic);
      });
      await get().persistProject();
    },

    // ── UI toggles ───────────────────────────────────────────────────────────
    toggleEpic: (epicId) => {
      set((s) => {
        if (s.expandedEpicIds.has(epicId)) {
          s.expandedEpicIds.delete(epicId);
        } else {
          s.expandedEpicIds.add(epicId);
        }
      });
    },

    toggleFeature: (featureId) => {
      set((s) => {
        if (s.expandedFeatureIds.has(featureId)) {
          s.expandedFeatureIds.delete(featureId);
        } else {
          s.expandedFeatureIds.add(featureId);
        }
      });
    },

    // ── Persist ──────────────────────────────────────────────────────────────
    persistProject: async () => {
      const project = get().activeProject;
      if (!project || get().isVersionReadOnly) return;
      try {
        await fetch(`/api/projects/${project._id}`, {
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
      } catch {
        // Silent fail – user can retry
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
