import type { IProject, IEpic, IFeature, ITask, IUserConfig } from '@/types';

/**
 * Strip sensitive/internal fields from a project before exposing via shared link.
 * Only keeps fields that GanttReadonlyBoard actually renders.
 */
export function sanitizeProjectForShare(raw: Record<string, unknown>): IProject {
  const project = raw as unknown as IProject;

  return {
    _id: project._id,
    name: project.name,
    color: project.color,
    currentVersion: project.currentVersion,
    epics: (project.epics ?? []).map(sanitizeEpic),
  } as IProject;
}

function sanitizeEpic(epic: IEpic): IEpic {
  return {
    _id: epic._id,
    name: epic.name,
    status: epic.status,
    ownerId: epic.ownerId,
    completionPct: epic.completionPct,
    plannedStart: epic.plannedStart,
    plannedEnd: epic.plannedEnd,
    actualStart: epic.actualStart,
    actualEnd: epic.actualEnd,
    color: epic.color,
    collapsed: epic.collapsed,
    features: (epic.features ?? []).map(sanitizeFeature),
  } as IEpic;
}

function sanitizeFeature(feature: IFeature): IFeature {
  return {
    _id: feature._id,
    name: feature.name,
    status: feature.status,
    ownerId: feature.ownerId,
    completionPct: feature.completionPct,
    plannedStart: feature.plannedStart,
    plannedEnd: feature.plannedEnd,
    actualStart: feature.actualStart,
    actualEnd: feature.actualEnd,
    color: feature.color,
    collapsed: feature.collapsed,
    tasks: (feature.tasks ?? []).map(sanitizeTask),
  } as IFeature;
}

function sanitizeTask(task: ITask): ITask {
  return {
    _id: task._id,
    name: task.name,
    status: task.status,
    ownerId: task.ownerId,
    completionPct: task.completionPct,
    plannedStart: task.plannedStart,
    plannedEnd: task.plannedEnd,
    actualStart: task.actualStart,
    actualEnd: task.actualEnd,
    color: task.color,
  } as ITask;
}

/**
 * Collect all ownerId values from a project's epics/features/tasks.
 */
export function collectOwnerIds(project: IProject): Set<string> {
  const ids = new Set<string>();
  for (const epic of project.epics ?? []) {
    if (epic.ownerId) ids.add(epic.ownerId);
    for (const feature of epic.features ?? []) {
      if (feature.ownerId) ids.add(feature.ownerId);
      for (const task of feature.tasks ?? []) {
        if (task.ownerId) ids.add(task.ownerId);
      }
    }
  }
  return ids;
}

/**
 * Filter users to only those referenced in the project.
 */
export function filterUsersForProject(users: IUserConfig[], project: IProject): IUserConfig[] {
  const ownerIds = collectOwnerIds(project);
  return users.filter((u) => ownerIds.has(u.uid));
}
