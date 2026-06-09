import { parseISO, format, addDays, getDay, isValid, differenceInDays } from "date-fns";
import { Task, SchedulingError, Holiday } from "../types";

/**
 * Checks if a given date is within the blocked holidays list.
 */
export function isHoliday(date: Date, holidays: Holiday[] = []): boolean {
  if (!holidays || holidays.length === 0) return false;
  const formatted = format(date, "yyyy-MM-dd");
  return holidays.some((h) => h.date === formatted);
}

/**
 * Validates whether the given date string is a Monday.
 * Returns true if it is a Monday, false otherwise.
 */
export function isProjectStartAMonday(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return false;
    return getDay(date) === 1; // 1 is Monday
  } catch {
    return false;
  }
}

/**
 * Checks for circular dependencies in tasks.
 * Returns an object with hasCycle and the path of the cycle.
 */
export function checkCircularDependencies(tasks: Task[]): {
  hasCycle: boolean;
  path: string[];
} {
  const regularTasks = tasks.filter((t) => !t.isGroup);
  const taskMap = new Map<string, Task>();
  for (const t of regularTasks) {
    taskMap.set(t.id, t);
  }

  // Adjacency representation of dependencies: task -> its dependencies
  // A task t depends on task t.dependency (possibly multiple comma-separated)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(taskId: string): boolean {
    if (recStack.has(taskId)) {
      // Extract cycle path
      const cycleStartIdx = path.indexOf(taskId);
      const cyclePath = path.slice(cycleStartIdx);
      cyclePath.push(taskId); // complete the cycle representation
      path.length = 0;
      path.push(...cyclePath);
      return true;
    }
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recStack.add(taskId);
    path.push(taskId);

    const task = taskMap.get(taskId);
    if (task && task.dependency) {
      const deps = task.dependency.split(",").map(s => s.trim()).filter(Boolean);
      for (const dep of deps) {
        // Validate that dependency exists to prevent infinite loops on invalid custom ids
        if (taskMap.has(dep)) {
          if (dfs(dep)) {
            return true;
          }
        }
      }
    }

    recStack.delete(taskId);
    path.pop();
    return false;
  }

  for (const t of regularTasks) {
    if (!visited.has(t.id)) {
      path.length = 0;
      if (dfs(t.id)) {
        return { hasCycle: true, path };
      }
    }
  }

  return { hasCycle: false, path: [] };
}

/**
 * Gets the next working day (skips Saturday/Sunday if workWeekends is false, and skips holidays)
 */
export function getNextWorkingDay(date: Date, workWeekends: boolean, holidays: Holiday[] = []): Date {
  let d = new Date(date);
  while (true) {
    const day = getDay(d);
    const isWk = day === 0 || day === 6;
    const isHol = isHoliday(d, holidays);

    if ((!workWeekends && isWk) || isHol) {
      d = addDays(d, 1);
    } else {
      break;
    }
  }
  return d;
}

/**
 * Adds a duration in working days (skips weekends if workWeekends is false, and skips holidays)
 */
export function addWorkingDays(startDate: Date, durationDays: number, workWeekends: boolean, holidays: Holiday[] = []): Date {
  if (durationDays <= 0) {
    return startDate;
  }
  let currentDate = new Date(startDate);
  let daysAdded = 0;
  while (daysAdded < durationDays) {
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = getDay(currentDate);
    const isWk = dayOfWeek === 0 || dayOfWeek === 6;
    const isHol = isHoliday(currentDate, holidays);

    if ((workWeekends || !isWk) && !isHol) {
      daysAdded++;
    }
  }
  return currentDate;
}

/**
 * Calculates start and end dates of all tasks based on project start date, 
 * dependencies, offsets, and duration.
 */
export function calculateDates(
  tasks: Task[],
  projectStartDateStr: string,
  workWeekends: boolean = false,
  holidays: Holiday[] = []
): { computedTasks: Task[]; error: SchedulingError | null } {
  // 1. Initial date validity check
  if (!projectStartDateStr) {
    return {
      computedTasks: tasks,
      error: { type: "invalid_date", message: "Project Start Date is required." }
    };
  }

  const projectStartDate = parseISO(projectStartDateStr);
  if (!isValid(projectStartDate)) {
    return {
      computedTasks: tasks,
      error: { type: "invalid_date", message: "Invalid Project Start Date format." }
    };
  }

  // Verify Monday requirement
  const isMondayCheck = getDay(projectStartDate) === 1;
  const projectStartError: SchedulingError | null = isMondayCheck
    ? null
    : {
        type: "invalid_date",
        message: "Project Start Date is not a Monday. (Requirement: Must start on a Monday!)"
      };

  // 2. Circular dependency check
  const cycleCheck = checkCircularDependencies(tasks);
  if (cycleCheck.hasCycle) {
    return {
      computedTasks: tasks,
      error: {
        type: "circular",
        message: `Circular Dependency Detected: ${cycleCheck.path.join(" ➔ ")}`
      }
    };
  }

  // 3. Separate regular tasks and groupings
  const regularTasks = tasks.filter((t) => !t.isGroup);
  const groupTasks = tasks.filter((t) => t.isGroup);

  // Set up topological sorting for regular tasks
  const taskMap = new Map<string, Task>();
  for (const t of regularTasks) {
    taskMap.set(t.id, t);
  }

  // Map of predecessorId -> list of tasks that depend on it
  const dependents = new Map<string, string[]>();
  // Map of taskId -> in-degree
  const inDegree = new Map<string, number>();

  for (const t of regularTasks) {
    inDegree.set(t.id, 0);
  }

  for (const t of regularTasks) {
    if (t.dependency) {
      const deps = t.dependency.split(",").map((s) => s.trim()).filter(Boolean);
      for (const dep of deps) {
        if (taskMap.has(dep)) {
          if (!dependents.has(dep)) {
            dependents.set(dep, []);
          }
          dependents.get(dep)!.push(t.id);
          inDegree.set(t.id, inDegree.get(t.id)! + 1);
        }
      }
    }
  }

  // Queue of tasks with 0 in-degree: no valid outstanding dependencies
  const queue: string[] = [];
  for (const t of regularTasks) {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
    }
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    topoOrder.push(currId);

    const children = dependents.get(currId);
    if (children) {
      for (const childId of children) {
        const remaining = inDegree.get(childId)! - 1;
        inDegree.set(childId, remaining);
        if (remaining === 0) {
          queue.push(childId);
        }
      }
    }
  }

  // In case there are un-visited nodes due to some dangling structure, add them
  for (const t of regularTasks) {
    if (!topoOrder.includes(t.id)) {
      topoOrder.push(t.id);
    }
  }

  // Map of calculated results
  const calculatedMap = new Map<string, { start: string; end: string }>();

  // Helper to format Date back to YYYY-MM-DD
  const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

  // Calculate dates in topological order
  for (const taskId of topoOrder) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    if (task.isFixed) {
      const fixedStart = task.fixedStartDate ? parseISO(task.fixedStartDate) : projectStartDate;
      const fixedEnd = task.isMilestone 
        ? fixedStart 
        : (task.fixedEndDate ? parseISO(task.fixedEndDate) : fixedStart);
      
      const parsedStart = isValid(fixedStart) ? fixedStart : projectStartDate;
      const parsedEnd = isValid(fixedEnd) ? fixedEnd : parsedStart;

      calculatedMap.set(taskId, {
        start: formatDate(parsedStart),
        end: formatDate(parsedEnd)
      });
      continue;
    }

    let computedStart = projectStartDate;

    // Apply dependency or project-start offset
    if (task.dependency) {
      const deps = task.dependency.split(",").map((s) => s.trim()).filter(Boolean);
      const validDeps = deps.filter((dep) => calculatedMap.has(dep));

      if (validDeps.length > 0) {
        let latestEnd: Date | null = null;
        for (const dep of validDeps) {
          const predDates = calculatedMap.get(dep)!;
          const predEnd = parseISO(predDates.end);
          if (!latestEnd || predEnd > latestEnd) {
            latestEnd = predEnd;
          }
        }
        if (latestEnd) {
          // Latest predecessor's end date + offset in weeks
          computedStart = addDays(latestEnd, (task.offset || 0) * 7);
        }
      } else {
        // If no valid dependencies at all, offset is relative to project start date
        computedStart = addDays(projectStartDate, (task.offset || 0) * 7);
      }
    } else {
      // If no valid dependency, start offset is relative to project start date
      computedStart = addDays(projectStartDate, (task.offset || 0) * 7);
    }

    // Ensure the start date is a valid working day (skips weekend if workWeekends is false, and holidays)
    computedStart = getNextWorkingDay(computedStart, workWeekends, holidays);

    const duration = Math.max(0, task.duration);
    const computedEnd = addWorkingDays(computedStart, duration, workWeekends, holidays);

    calculatedMap.set(taskId, {
      start: formatDate(computedStart),
      end: formatDate(computedEnd)
    });
  }

  // Map calculated dates back to original regular task entries
  const updatedRegularTasks = regularTasks.map((t) => {
    const calculated = calculatedMap.get(t.id);
    let dur = t.duration;
    if (t.isFixed && calculated) {
      if (t.isMilestone) {
        dur = 0;
      } else {
        const startD = parseISO(calculated.start);
        const endD = parseISO(calculated.end);
        if (isValid(startD) && isValid(endD)) {
          if (workWeekends) {
            // Count working days skipping only holidays
            let count = 0;
            let curr = new Date(startD);
            while (curr < endD) {
              curr = addDays(curr, 1);
              if (!isHoliday(curr, holidays)) {
                count++;
              }
            }
            dur = count;
          } else {
            // Count working days skipping weekends and holidays
            let count = 0;
            let curr = new Date(startD);
            while (curr < endD) {
              curr = addDays(curr, 1);
              const dow = getDay(curr);
              const isWk = dow === 0 || dow === 6;
              const isHol = isHoliday(curr, holidays);
              if (!isWk && !isHol) {
                count++;
              }
            }
            dur = count;
          }
        }
      }
    }
    return {
      ...t,
      duration: dur,
      startDate: calculated ? calculated.start : projectStartDateStr,
      endDate: calculated ? calculated.end : projectStartDateStr
    };
  });

  // 4. Calculate Group Task dates
  // A group's start date is the min start date of its children, and end date is max end date.
  const updatedGroupTasks = groupTasks.map((group) => {
    // Find all immediate or descendant children (we'll look for task.parentId matching group.id)
    const children = updatedRegularTasks.filter((t) => t.parentId === group.id);

    if (children.length === 0) {
      // Empty group defaults to Project Start Date
      return {
        ...group,
        startDate: projectStartDateStr,
        endDate: projectStartDateStr
      };
    }

    let minStart = parseISO(children[0].startDate);
    let maxEnd = parseISO(children[0].endDate);

    for (const child of children) {
      const childStart = parseISO(child.startDate);
      const childEnd = parseISO(child.endDate);
      if (childStart < minStart) minStart = childStart;
      if (childEnd > maxEnd) maxEnd = childEnd;
    }

    return {
      ...group,
      startDate: formatDate(minStart),
      endDate: formatDate(maxEnd)
    };
  });

  // Combine back in original order (or group order) and return
  const taskOrderMap = new Map<string, number>();
  tasks.forEach((t, i) => taskOrderMap.set(t.id, i));

  const allUpdated = [...updatedRegularTasks, ...updatedGroupTasks];
  allUpdated.sort((a, b) => (taskOrderMap.get(a.id) ?? 0) - (taskOrderMap.get(b.id) ?? 0));

  return {
    computedTasks: allUpdated,
    error: projectStartError
  };
}
