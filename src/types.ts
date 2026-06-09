export interface Task {
  id: string; // Task ID (e.g., T1)
  name: string; // Task Name
  duration: number; // Duration in days
  dependency?: string; // ID of the task this task depends on
  offset?: number; // Offset of start date in weeks from dependency (or project start if no dependency)
  startDate: string; // Calculated: ISO date string (YYYY-MM-DD), read-only
  endDate: string; // Calculated: ISO date string (YYYY-MM-DD), read-only
  isGroup: boolean; // Is this a parent grouping row?
  parentId?: string; // ID of parent group if nested, otherwise undefined
  collapsed?: boolean; // If isGroup, is it collapsed?
  color?: string; // Hex or tailwind-color representation for Gantt visualization
  isFixed?: boolean; // Use manual hard-coded start and end dates
  fixedStartDate?: string; // YYYY-MM-DD
  fixedEndDate?: string; // YYYY-MM-DD
  isMilestone?: boolean; // Whether representing a 0-day milestone milestone (e.g. diamond shape)
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface ProjectSettings {
  startDate: string; // ISO date string (YYYY-MM-DD)
}

export interface SchedulingError {
  type: "circular" | "invalid_date" | "dependency_missing" | "other" | null;
  message: string;
}
