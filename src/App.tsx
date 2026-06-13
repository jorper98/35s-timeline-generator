import React, { useState, useMemo, useEffect } from "react";
import { Task, SchedulingError, Holiday } from "./types";
import { calculateDates } from "./utils/scheduler";
import { USA_2026_HOLIDAYS } from "./utils/holidaysPreset";
import TaskForm from "./components/TaskForm";
import UnifiedTimeline from "./components/UnifiedTimeline";
import {
  Calendar,
  AlertTriangle,
  FolderTree,
  Grid,
  Clock,
  RefreshCw,
  Trash2,
  Info,
  CalendarDays,
  PlusCircle,
  Save,
  Download,
  Upload,
  Database
} from "lucide-react";

const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: "G1",
    name: "Phase 1: Foundation & Setup",
    duration: 0,
    isGroup: true,
    collapsed: false,
    color: "#64748b",
    startDate: "",
    endDate: ""
  },
  {
    id: "T1",
    name: "Database Models & State Schema",
    duration: 4,
    isGroup: false,
    parentId: "G1",
    color: "#3b82f6",
    startDate: "",
    endDate: ""
  },
  {
    id: "T2",
    name: "Core Dependency Engine",
    duration: 6,
    dependency: "T1",
    offset: 0,
    isGroup: false,
    parentId: "G1",
    color: "#6366f1",
    startDate: "",
    endDate: ""
  },
  {
    id: "M1",
    name: "Phase 1 Sign-Off (Milestone)",
    duration: 0,
    isGroup: false,
    parentId: "G1",
    color: "#ec4899",
    isFixed: true,
    fixedStartDate: "2026-06-16",
    isMilestone: true,
    startDate: "",
    endDate: ""
  },
  {
    id: "G2",
    name: "Phase 2: Client Interface",
    duration: 0,
    isGroup: true,
    collapsed: false,
    color: "#64748b",
    startDate: "",
    endDate: ""
  },
  {
    id: "T3",
    name: "Task Sheet Table & Tree UI",
    duration: 5,
    dependency: "T2",
    offset: 1, // 1 week offset
    isGroup: false,
    parentId: "G2",
    color: "#10b981",
    startDate: "",
    endDate: ""
  },
  {
    id: "T4",
    name: "SVG Timeline Gantt Chronology",
    duration: 7,
    dependency: "T3",
    offset: 0,
    isGroup: false,
    parentId: "G2",
    color: "#14b8a6",
    startDate: "",
    endDate: ""
  },
  {
    id: "G3",
    name: "Phase 3: Validation & Launch",
    duration: 0,
    isGroup: true,
    collapsed: false,
    color: "#64748b",
    startDate: "",
    endDate: ""
  },
  {
    id: "FX",
    name: "External Compliance Audit (Hard Dates)",
    duration: 5,
    isGroup: false,
    parentId: "G3",
    color: "#a855f7",
    isFixed: true,
    fixedStartDate: "2026-06-22",
    fixedEndDate: "2026-06-29",
    isMilestone: false,
    startDate: "",
    endDate: ""
  },
  {
    id: "T5",
    name: "Circular Loop Detector",
    duration: 3,
    dependency: "T3, T4",
    offset: 0,
    isGroup: false,
    parentId: "G3",
    color: "#f59e0b",
    startDate: "",
    endDate: ""
  },
  {
    id: "T6",
    name: "Production Compile & Verify",
    duration: 2,
    dependency: "T5",
    offset: 1, // 1 week offset
    isGroup: false,
    parentId: "G3",
    color: "#f43f5e",
    startDate: "",
    endDate: ""
  }
];

export default function App() {
  // June 8, 2026 is a Monday (perfect standard default matching our timeline constraints)
  const [projectStartDate, setProjectStartDate] = useState<string>("2026-06-08");
  const [workWeekends, setWorkWeekends] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_DEMO_TASKS);

  // Holidays & non-working days states
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showHolidaysConfig, setShowHolidaysConfig] = useState<boolean>(false);
  const [newHolidayName, setNewHolidayName] = useState<string>("");
  const [newHolidayDate, setNewHolidayDate] = useState<string>("");

  // Persistence Server Sync States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load project dataset from full-stack server on application startup
  useEffect(() => {
    const loadProjectFromServer = async () => {
      setIsLoadingSaved(true);
      try {
        const response = await fetch("/api/projects/load");
        if (response.ok) {
          const data = await response.json();
          if (data.tasks) {
            setTasks(data.tasks);
          }
          if (data.projectStartDate) {
            setProjectStartDate(data.projectStartDate);
          }
          if (typeof data.workWeekends === "boolean") {
            setWorkWeekends(data.workWeekends);
          }
          if (data.holidays && Array.isArray(data.holidays)) {
            setHolidays(data.holidays);
          }
          
          const timeString = data.savedAt 
            ? new Date(data.savedAt).toLocaleTimeString() 
            : new Date().toLocaleTimeString();
          setSyncStatus(`Project loaded from server dataset (saved at ${timeString})`);
        } else if (response.status === 404) {
          setSyncStatus("No server-side saving detected. Loaded standard demo baseline.");
        } else {
          setSyncError("Standard load failed. Starting with default preset.");
        }
      } catch (err: any) {
        console.error("Failed to fetch project from disk server:", err);
        setSyncError("Server connection warning: App running locally as backup.");
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadProjectFromServer();
  }, []);

  // Open save modal
  const openSaveModal = () => {
    setSaveFilename("user1_project");
    setIsSaveModalOpen(true);
  };

  // Save current project state to full-stack backend with custom filename
  const confirmSaveToServer = async () => {
    if (!saveFilename || saveFilename.trim() === "") {
      setSyncError("Filename cannot be empty.");
      return;
    }
    
    setIsSaving(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/projects/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tasks,
          projectStartDate,
          workWeekends,
          holidays,
          filename: saveFilename
        })
      });

      if (response.ok) {
        const data = await response.json();
        const timeStr = new Date().toLocaleTimeString();
        setSyncStatus(`${data.message || `Project successfully saved to server cache at ${timeStr}!`}`);
        setIsSaveModalOpen(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        setSyncError(errData.error || "Failed to write project JSON to server disk filesystem.");
      }
    } catch (err: any) {
      console.error("Server save failed:", err);
      setSyncError("Server connection failure: State remains active but unsaved.");
    } finally {
      setIsSaving(false);
    }
  };

  // Load project list from server
    const fetchServerProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await fetch("/api/projects/list");
        if (response.ok) {
          const data = await response.json();
          setServerProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch server projects:", err);
        setSyncError("Failed to load server project list.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    const handleOpenLoadModal = async () => {
      setIsLoadModalOpen(true);
      await fetchServerProjects();
    };

    const handleCloseLoadModal = () => {
      setIsLoadModalOpen(false);
      setServerProjects([]);
    };

    const handleLoadProjectFromFile = async (filename: string) => {
      if (!window.confirm(`Load project "${filename}"? This will overwrite your current project state.`)) {
        return;
      }
      try {
        const response = await fetch(`/api/projects/load?file=${encodeURIComponent(filename)}`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
          setProjectStartDate(data.projectStartDate || "");
          setWorkWeekends(data.workWeekends ?? false);
          setHolidays(data.holidays || []);
          setSyncStatus(`Project loaded successfully from "${filename}"!`);
          setSyncError(null);
          handleCloseLoadModal();
        } else {
          setSyncError("Failed to load project from server.");
        }
      } catch (err) {
        console.error("Server load failed:", err);
        setSyncError("Server connection failure during load.");
      }
    };

    const handleDeleteProjectFile = async (filename: string, isBackup: boolean) => {
      const confirmMsg = isBackup 
        ? `Are you sure you want to delete the backup file "${filename}"?`
        : `Are you sure you want to delete "${filename}"? This cannot be undone.`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
      try {
        const response = await fetch(`/api/projects/delete/${encodeURIComponent(filename)}`, {
          method: "DELETE"
        });
        if (response.ok) {
          setServerProjects(prev => prev.filter(p => p.filename !== filename));
          setSyncStatus(`Deleted "${filename}" successfully.`);
        } else {
          setSyncError("Failed to delete project file.");
        }
      } catch (err) {
        console.error("Server delete failed:", err);
        setSyncError("Server connection failure during delete.");
      }
    };

    // Export current project state to local JSON file
  const handleExportJSON = () => {
    try {
      const projectPayload = {
        tasks,
        projectStartDate,
        workWeekends,
        holidays,
        exportedAt: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify(projectPayload, null, 2)
      );
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `user1_project_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSyncStatus(`Project exported successfully to local file download!`);
      setSyncError(null);
    } catch (err: any) {
      setSyncError("File export failed: " + err.message);
    }
  };

  // Import project state from local JSON file upload
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
          throw new Error("Missing required 'tasks' list field.");
        }
        
        setTasks(parsed.tasks);
        if (parsed.projectStartDate) {
          setProjectStartDate(parsed.projectStartDate);
        }
        if (typeof parsed.workWeekends === "boolean") {
          setWorkWeekends(parsed.workWeekends);
        }
        if (parsed.holidays && Array.isArray(parsed.holidays)) {
          setHolidays(parsed.holidays);
        }
        
        setSyncStatus(`Local JSON configuration loaded completely!`);
        setSyncError(null);
      } catch (err: any) {
        setSyncError("Parse Error: Invalid JSON timeline structure. " + err.message);
      }
    };
    fileReader.readAsText(file);
    event.target.value = "";
  };

  // Modal State Controls
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [dependencyMode, setDependencyMode] = useState<"none" | "all" | "multiple">("none");
  const [saveFilename, setSaveFilename] = useState<string>("user1_project");
  
  // Server Load State
  type ServerProject = {
    filename: string;
    isBackup: boolean;
    size: number;
    modified: string;
  };
  const [serverProjects, setServerProjects] = useState<ServerProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);

  // Trigger the scheduling engine instantly on state change
  const schedulerResult = useMemo(() => {
    return calculateDates(tasks, projectStartDate, workWeekends, holidays);
  }, [tasks, projectStartDate, workWeekends, holidays]);

  // Find the latest task end date to get estimated completion date
  const estimatedCompletionDate = useMemo(() => {
    let maxTime = 0;
    let latestDateStr = "";
    for (const t of schedulerResult.computedTasks) {
      if (t.endDate) {
        const time = new Date(t.endDate).getTime();
        if (!isNaN(time) && time > maxTime) {
          maxTime = time;
          latestDateStr = t.endDate;
        }
      }
    }
    return latestDateStr || null;
  }, [schedulerResult.computedTasks]);

  const formatEstimatedDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/A";
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return "N/A";
    }
  };

  const handleManualAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    const newHol: Holiday = {
      id: "H_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: newHolidayName,
      date: newHolidayDate
    };
    setHolidays((prev) => {
      const filtered = prev.filter(h => h.date !== newHolidayDate);
      return [...filtered, newHol];
    });
    setNewHolidayName("");
    setNewHolidayDate("");
  };

  const handleLoadUSPHolidays = (replace: boolean) => {
    if (replace) {
      setHolidays(USA_2026_HOLIDAYS);
      setSyncStatus("USA 2026 Federal library loaded in override mode!");
    } else {
      setHolidays((prev) => {
        const merged = [...prev];
        for (const usaHol of USA_2026_HOLIDAYS) {
          if (!merged.some(h => h.date === usaHol.date)) {
            merged.push(usaHol);
          }
        }
        return merged;
      });
      setSyncStatus("USA 2026 Federal Holidays merged with existing lists successfully!");
    }
  };

  const handleImportHolidaysJSON = (event: React.ChangeEvent<HTMLInputElement>, replace: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) {
          throw new Error("Holidays import must consist of a JSON list array.");
        }
        
        const cleanHols: Holiday[] = [];
        parsed.forEach((item: any, index: number) => {
          if (!item.date || typeof item.date !== "string" || !item.name || typeof item.name !== "string") {
            throw new Error(`Entry at index ${index} must have 'date' and 'name' string fields.`);
          }
          cleanHols.push({
            id: item.id || "H_IMPORTED_" + Date.now() + "_" + index + "_" + Math.floor(Math.random()*100),
            date: item.date,
            name: item.name
          });
        });

        if (replace) {
          setHolidays(cleanHols);
          setSyncStatus(`Successfully loaded ${cleanHols.length} imported holidays globally!`);
        } else {
          setHolidays((prev) => {
            const merged = [...prev];
            for (const h of cleanHols) {
              if (!merged.some(m => m.date === h.date)) {
                merged.push(h);
              }
            }
            return merged;
          });
          setSyncStatus(`Merged ${cleanHols.length} imported holidays into active project lists!`);
        }
        setSyncError(null);
      } catch (err: any) {
        setSyncError("Import Failure: " + err.message);
      }
    };
    fileReader.readAsText(file);
    event.target.value = "";
  };

  // Toggle expand/collapse metadata state on group folder
  const handleToggleGroupCollapse = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return { ...t, collapsed: !t.collapsed };
        }
        return t;
      })
    );
  };

  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);
    setIsModalOpen(false);
  };

  const handleEditTask = (id: string, updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? updatedTask : t))
    );
    setIsModalOpen(false);
  };

  const handleSelectTaskToEdit = (task: Task) => {
    const enriched = schedulerResult.computedTasks.find((t) => t.id === task.id) || task;
    setEditingTask(enriched);
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoadDemoPreset = () => {
    setTasks(INITIAL_DEMO_TASKS);
  };

  const handleClearTimeline = () => {
    setTasks([]);
  };

  // Generate standardized display hierarchy for 1:1 synchronization between Sheet and Gantt
  const structuredTasks = useMemo(() => {
    const result: { task: Task; level: number; isVisible: boolean }[] = [];

    // Separate groups and global root tasks
    const groups = schedulerResult.computedTasks.filter((t) => t.isGroup);
    const rootTasks = schedulerResult.computedTasks.filter((t) => !t.isGroup && !t.parentId);

    // Track processed tasks to prevent duplication if double mappings occur
    const processedIds = new Set<string>();

    for (const group of groups) {
      result.push({ task: group, level: 0, isVisible: true });
      processedIds.add(group.id);

      // Add nested tasks belonging to this group
      const children = schedulerResult.computedTasks.filter(
        (t) => !t.isGroup && t.parentId === group.id
      );
      for (const child of children) {
        result.push({
          task: child,
          level: 1,
          isVisible: !group.collapsed
        });
        processedIds.add(child.id);
      }
    }

    // Add remaining tasks that are completely ungrouped (root level)
    for (const rt of rootTasks) {
      if (!processedIds.has(rt.id)) {
        result.push({ task: rt, level: 0, isVisible: true });
        processedIds.add(rt.id);
      }
    }

    return result;
  }, [schedulerResult.computedTasks]);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans" id="app-root-container">
      {/* RESPONSIVE WARNING BANNER */}
      <div className="lg:hidden bg-indigo-50 border-b border-indigo-150 text-indigo-950 px-4 py-2.5 text-center text-xs font-bold font-sans flex items-center justify-center gap-2 select-none" id="responsive-small-screen-warning">
        <Info className="w-4 h-4 shrink-0 text-indigo-700" />
        <span>Desktop Utility: This is a dedicated full-screen professional desktop application. For side-by-side spreadsheet grid and Gantt timeline calculations, please expand your viewport or use a larger display.</span>
      </div>

      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 sticky top-0 z-40 shadow-xs">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div className="flex items-center gap-3">
             <svg
               xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 128 128"
               className="w-8 h-8 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
               aria-label="Project Timeline Generator Logo"
               onClick={() => setIsAboutModalOpen(true)}
             >
               <rect x="6" y="6" width="116" height="116" rx="18" fill="#ffffff" stroke="#e6edf7" strokeWidth="2" />
               <line x1="18" y1="32" x2="110" y2="32" stroke="#eef6ff" strokeWidth="2" strokeLinecap="round" />
               <g transform="translate(18,40)">
                 <rect x="0" y="0" width="62" height="12" rx="6" fill="#2563eb" />
                 <rect x="6" y="20" width="86" height="12" rx="6" fill="#60a5fa" />
                 <rect x="18" y="40" width="52" height="12" rx="6" fill="#93c5fd" />
                 <circle cx="102" cy="26" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                 <line x1="76" y1="-8" x2="76" y2="64" stroke="#0f1724" strokeWidth="2" strokeOpacity="0.12" strokeLinecap="round" />
               </g>
             </svg>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Project Timeline Generator
                <span className="text-slate-500 font-semibold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100/60 px-1.5 py-0.5 rounded">v1.1.0</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Professional dependency scheduling & visual Gantt chronologies
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto text-xs">
            {/* Server Save Button */}
            <button
              onClick={openSaveModal}
              disabled={isSaving}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Save current project to server with a custom filename"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save to Server"}</span>
            </button>

            {/* Load from Server Button */}
            <button
              onClick={handleOpenLoadModal}
              className="px-3.5 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold bg-white shadow-2xs"
              title="Load project from server"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Load from Server</span>
            </button>

            {/* Export JSON Button */}
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold bg-white shadow-2xs"
              title="Export project configuration as a local JSON file download"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON</span>
            </button>

            {/* Import JSON Button */}
            <label className="px-3.5 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold bg-white shadow-2xs select-none">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>

            {/* Visual separator */}
            <div className="h-6 w-px bg-slate-200 hidden xl:block" />

            <button
              onClick={handleLoadDemoPreset}
              className="px-3.5 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 font-medium bg-white"
              title="Reset tasks to initial demo template"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Preset</span>
            </button>
            <button
              onClick={handleClearTimeline}
              className="px-3.5 py-2 border border-slate-200 hover:border-red-200 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors cursor-pointer flex items-center gap-1.5 font-medium bg-white"
              title="Wipe timeline dataset empty"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
              <span>Clear Sheet</span>
            </button>
          </div>
        </div>
      </header>

      {/* SERVER STATUS / FEEDBACK BANNER */}
      {(syncStatus || syncError || isLoadingSaved) && (
        <div className={`px-4 md:px-8 py-2 border-b text-[11px] font-medium flex items-center justify-between gap-3 select-none transition-all ${
          syncError 
            ? "bg-red-50 border-red-100 text-red-700" 
            : isLoadingSaved
            ? "bg-indigo-50/50 border-indigo-100 text-indigo-700"
            : "bg-emerald-50/50 border-emerald-150 text-emerald-800"
        }`}>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {isLoadingSaved ? "Loading saved dataset from server..." : syncError ? syncError : syncStatus}
            </span>
          </div>
          {(syncStatus || syncError) && !isLoadingSaved && (
            <button 
              onClick={() => { setSyncStatus(null); setSyncError(null); }}
              className="text-slate-450 hover:text-slate-700 cursor-pointer font-bold uppercase text-[9px] tracking-wider"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* CORE TIMELINE WORKPLACE GRID */}
      <main className="w-full max-w-[100%] px-4 md:px-8 py-6 flex-1 flex flex-col gap-6">
        
        {/* GLOBAL SCHEDULER ENGINE BAR */}
        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Project Start Input Control */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Project Target Start Date & Duration Metrics</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                className="border border-slate-200 hover:border-slate-300 focus:border-indigo-500 outline-none px-3 py-2 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
              />
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-750 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/80 px-3 py-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  id="work-weekends-toggle"
                  checked={workWeekends}
                  onChange={(e) => setWorkWeekends(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-900 cursor-pointer"
                />
                <span className="font-bold text-slate-800">Work 7 days (incl. weekends)</span>
              </label>

              {estimatedCompletionDate && (
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-850 border border-emerald-100 rounded-lg text-xs font-semibold select-none shadow-[0_1px_2px_rgba(16,185,129,0.05)] transition-all hover:bg-emerald-100/20"
                  id="project-estimated-completion-display"
                  title="Calculated completion date of the entire project"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Est. Completion: <strong className="font-extrabold text-emerald-950">{formatEstimatedDate(estimatedCompletionDate)}</strong></span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium italic mt-0.5">
              (Required: Must start on a Monday)
            </span>
          </div>

          {/* Scheduler Output Alerts / Controls Section */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3.5 w-full lg:w-auto shrink-0">
            {schedulerResult.error && (
              <div
                className={`p-3 border rounded-lg text-xs flex items-start gap-2 flex-1 transition-all outline-hidden ${
                  schedulerResult.error.type === "circular"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-xs leading-none">
                    {schedulerResult.error.type === "circular"
                      ? "Calculation Error"
                      : "Scheduling Warning"}
                  </p>
                  <p className="font-medium mt-1 text-[11px] leading-tight text-slate-600">{schedulerResult.error.message}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 sm:ml-auto shrink-0 select-none flex-wrap">
              <button
                onClick={handleOpenAddModal}
                className="bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-900/10 cursor-pointer transition-all active:scale-[0.98] text-xs font-sans whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Task / Group</span>
              </button>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <label htmlFor="dep-mode" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Show dependencies:
                </label>
                <select
                  id="dep-mode"
                  value={dependencyMode}
                  onChange={(e) => setDependencyMode(e.target.value as "none" | "all" | "multiple")}
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="none">Default: None</option>
                  <option value="all">All</option>
                  <option value="multiple">Multiple</option>
                </select>
              </div>

              <span className="text-xs bg-indigo-50/60 text-indigo-700 border border-indigo-100/60 px-3 py-1.5 rounded-lg font-bold font-sans whitespace-nowrap">
                {tasks.length} {tasks.length === 1 ? "timeline item" : "timeline items"}
              </span>
            </div>
          </div>
        </section>

        {/* COLLAPSIBLE HOLIDAYS & NON-WORKING DAYS SECTION */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHolidaysConfig(!showHolidaysConfig)}
            className="w-full px-5 py-3.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-indigo-900" />
              <div>
                <h3 className="font-bold text-xs text-slate-900">Holidays & Blocked Non-Working Days</h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {holidays.length} holiday {holidays.length === 1 ? "day" : "days"} currently registered. Add custom dates or load USA Federal presets to automatically skip calendar dates during timelines.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg ${
                holidays.length === 0 ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                {holidays.length === 0 ? "NONE BLOCKED" : `${holidays.length} BLOCKED`}
              </span>
              <span className="text-slate-400 text-[10px] font-bold">
                {showHolidaysConfig ? "▼" : "▶"}
              </span>
            </div>
          </button>

          {showHolidaysConfig && (
            <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in text-xs leading-relaxed">
              
              {/* Col 1: Quick Presets & File Integrations */}
              <div className="bg-slate-50/70 border border-slate-200/80 p-3.5 rounded-xl flex flex-col gap-3.5">
                <div>
                  <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider mb-0.5">Preset & File Interfaces</h4>
                  <p className="text-[10px] text-slate-500">Inject holiday calendars directly into your schedules using standard assets or offline local files.</p>
                </div>

                {/* 2026 USA Holidays Preset buttons */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600 block">USA Federal Holidays (2026):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadUSPHolidays(true)}
                      className="px-2.5 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg cursor-pointer transition-all active:scale-[0.98] text-[10px] text-center"
                      title="Replace current list with USA holidays list"
                    >
                      Replace list
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadUSPHolidays(false)}
                      className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-emerald-800 border-emerald-100 bg-emerald-50/10 font-bold rounded-lg cursor-pointer transition-all active:scale-[0.97] text-[10px] text-center shadow-3xs"
                      title="Merge USA holidays list with current holiday dates"
                    >
                      Merge list
                    </button>
                  </div>
                </div>

                {/* Import Holiday list via JSON File input choices */}
                <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3">
                  <span className="text-[10px] font-bold text-slate-600 block">Import Custom Holiday List (.json):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-55 text-slate-700 font-bold rounded-lg text-center cursor-pointer transition-all text-[10px] block select-none">
                      Replace List
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => handleImportHolidaysJSON(e, true)}
                      />
                    </label>
                    <label className="px-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-55 text-slate-700 font-bold rounded-lg text-center cursor-pointer transition-all text-[10px] block select-none">
                      Merge List
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => handleImportHolidaysJSON(e, false)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Col 2: Add Manual custom holiday Form */}
              <div className="border border-slate-200/80 p-3.5 rounded-xl flex flex-col gap-3">
                <div>
                  <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider mb-0.5">Add Custom Bank Holiday</h4>
                  <p className="text-[10px] text-slate-500">Insert single designated project non-working days manually below.</p>
                </div>

                <form onSubmit={handleManualAddHoliday} className="flex flex-col gap-2.5 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Holiday Name / Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Spring Equinox Break"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 outline-none px-2.5 py-2 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Calendar Date</label>
                    <input
                      type="date"
                      required
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-150 outline-none px-2.5 py-1 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] text-[10px] mt-1"
                  >
                    Add Blocked Holiday
                  </button>
                </form>
              </div>

              {/* Col 3: Current Registered Holidays Table (Scrollable list with clean deletes) */}
              <div className="border border-slate-200/80 p-3.5 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Active Block Card Index</h4>
                    <p className="text-[10px] text-slate-500">Chronological calendar holidays currently in effect.</p>
                  </div>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to wipe all active holiday states? This triggers complete scheduling rebuilds.")) {
                          setHolidays([]);
                        }
                      }}
                      className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider cursor-pointer"
                    >
                      Wipe All
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-[160px] divide-y divide-slate-100 flex flex-col pr-1 scrollbar-thin">
                  {holidays.length === 0 ? (
                    <div className="py-7 text-center text-slate-400 font-medium italic text-[11px]">
                      No holiday dates registered. Gantt scheduling is using standard weekend skips only.
                    </div>
                  ) : (
                    [...holidays]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((h) => (
                        <div key={h.id} className="py-1.5 flex items-center justify-between gap-1.5 group">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate leading-none text-[11px] select-all">{h.name}</span>
                            <span className="text-[9px] text-slate-500 font-bold font-mono inline-block mt-0.5">{h.date}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHolidays(prev => prev.filter(item => item.id !== h.id))}
                            className="p-1 hover:bg-rose-50 text-slate-350 hover:text-red-500 rounded transition-colors cursor-pointer select-none"
                            title={`Remove holiday block: ${h.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* UNIFIED SPREADSHEET & GANTT CHRONOLOGY TIMELINE GRID (100% WIDTH) */}
        <div className="w-full">
          <UnifiedTimeline
            structuredTasks={structuredTasks}
            allTasks={tasks}
            projectStartDateStr={projectStartDate}
            onDeleteTask={handleDeleteTask}
            onToggleGroupCollapse={handleToggleGroupCollapse}
            onSelectTaskToEdit={handleSelectTaskToEdit}
            workWeekends={workWeekends}
            holidays={holidays}
            dependencyMode={dependencyMode}
          />
        </div>

        {/* DIALOG TASK MODAL OVERLAY */}
        <TaskForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          tasks={tasks}
          editingTask={editingTask}
          projectStartDate={projectStartDate}
          onDeleteTask={handleDeleteTask}
        />
      </main>

      {/* SAVE TO SERVER MODAL OVERLAY */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsSaveModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Save to Server</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Choose a name for your project dataset.</p>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="save-filename" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Filename
                  </label>
                  <div className="relative">
                    <input
                      id="save-filename"
                      type="text"
                      value={saveFilename}
                      onChange={(e) => setSaveFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="user1_project"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          confirmSaveToServer();
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">.json</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    If a file with this name already exists, a timestamped backup will be created automatically.
                  </p>
                </div>

                {syncError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{syncError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveToServer}
                disabled={isSaving || !saveFilename.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOAD FROM SERVER MODAL OVERLAY */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseLoadModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl relative flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Load from Server</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Select a saved dataset to load into your current project.</p>
              </div>
              <button
                onClick={handleCloseLoadModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                  <span className="text-sm font-medium">Loading server files...</span>
                </div>
              ) : serverProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Database className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No saved projects found on the server.</p>
                  <p className="text-xs text-slate-400 mt-1">Save a project first to see it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serverProjects.map((project) => (
                    <div
                      key={project.filename}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${project.isBackup ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {project.isBackup ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          ) : (
                            <Database className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{project.filename}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {new Date(project.modified).toLocaleString()} · {(project.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {!project.isBackup && (
                          <button
                            onClick={() => handleLoadProjectFromFile(project.filename)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Load</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProjectFile(project.filename, project.isBackup)}
                          className="px-3 py-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
              <button
                onClick={handleCloseLoadModal}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT MODAL OVERLAY */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsAboutModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-8 relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAboutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 128 128"
              className="w-32 h-32 mb-6 drop-shadow-sm"
              aria-label="Project Timeline Generator Logo"
            >
              <rect x="6" y="6" width="116" height="116" rx="18" fill="#ffffff" stroke="#e6edf7" strokeWidth="2" />
              <line x1="18" y1="32" x2="110" y2="32" stroke="#eef6ff" strokeWidth="2" strokeLinecap="round" />
              <g transform="translate(18,40)">
                <rect x="0" y="0" width="62" height="12" rx="6" fill="#2563eb" />
                <rect x="6" y="20" width="86" height="12" rx="6" fill="#60a5fa" />
                <rect x="18" y="40" width="52" height="12" rx="6" fill="#93c5fd" />
                <circle cx="102" cy="26" r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                <line x1="76" y1="-8" x2="76" y2="64" stroke="#0f1724" strokeWidth="2" strokeOpacity="0.12" strokeLinecap="round" />
              </g>
            </svg>

            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Project Timeline Generator
            </h2>

            <p className="text-sm text-slate-500 font-medium mb-6 max-w-xs">
              Simple dependency scheduling &amp; visual Gantt chronologies.
            </p>

            <div className="w-full h-px bg-slate-100 mb-6" />

            <div className="space-y-2 text-xs text-slate-500">
              <p>
                Originally created by: <span className="font-semibold text-slate-700">Jorge Pereira (<a href="https://35sites.com/applications/project-timeline-generator" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">35sites.com LLC</a>)</span>
              </p>
              <p>
                Provided with <span className="font-semibold text-indigo-600">MIT License</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER METRICS BAR */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="w-full px-4 md:px-8 text-center text-xs text-slate-450 font-medium">
          <span>By Jorge Pereira (<a href="https://35sites.com/" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">35sites.com LLC</a>).</span>
        </div>
      </footer>
    </div>
  );
}
