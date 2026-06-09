import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { PlusCircle, Info, Hash, X, Save, Calendar, Anchor, Sliders, Trash2 } from "lucide-react";

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onEditTask: (id: string, updatedTask: Task) => void;
  tasks: Task[];
  editingTask: Task | null;
  projectStartDate: string;
  onDeleteTask?: (id: string) => void;
}

const PRESET_COLORS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Slate", hex: "#64748b" }
];

export default function TaskForm({
  isOpen,
  onClose,
  onAddTask,
  onEditTask,
  tasks,
  editingTask,
  projectStartDate,
  onDeleteTask
}: TaskFormProps) {
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [id, setId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [duration, setDuration] = useState<number>(5);
  const [dependency, setDependency] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [parentId, setParentId] = useState<string>("");
  const [color, setColor] = useState<string>("#3b82f6");
  const [formError, setFormError] = useState<string | null>(null);

  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [fixedStartDate, setFixedStartDate] = useState<string>("");
  const [fixedEndDate, setFixedEndDate] = useState<string>("");
  const [isMilestone, setIsMilestone] = useState<boolean>(false);

  // Synchronize modal state with task being edited or created
  useEffect(() => {
    if (editingTask) {
      setIsGroup(editingTask.isGroup);
      setId(editingTask.id);
      setName(editingTask.name);
      setDuration(editingTask.duration || 0);
      setDependency(editingTask.dependency || "");
      setOffset(editingTask.offset || 0);
      setParentId(editingTask.parentId || "");
      setColor(editingTask.color || "#3b82f6");
      setIsFixed(!!editingTask.isFixed);
      setFixedStartDate(editingTask.fixedStartDate || editingTask.startDate || projectStartDate);
      setFixedEndDate(editingTask.fixedEndDate || editingTask.endDate || projectStartDate);
      setIsMilestone(!!editingTask.isMilestone);
    } else {
      setIsGroup(false);
      setName("");
      setDuration(5);
      setDependency("");
      setOffset(0);
      setParentId("");
      setColor("#3b82f6");
      setIsFixed(false);
      setFixedStartDate(projectStartDate);
      setFixedEndDate(projectStartDate);
      setIsMilestone(false);
    }
    setFormError(null);
  }, [editingTask, isOpen, projectStartDate]);

  // Handle unique ID auto-generation in Create state only
  useEffect(() => {
    if (!editingTask && isOpen) {
      const prefix = isGroup ? "G" : "T";
      const matchingCount = tasks.filter((t) => t.isGroup === isGroup).length + 1;
      let finalId = `${prefix}${matchingCount}`;
      let checkCount = matchingCount;
      while (tasks.some(t => t.id.toUpperCase() === finalId.toUpperCase())) {
        checkCount++;
        finalId = `${prefix}${checkCount}`;
      }
      setId(finalId);
    }
  }, [isGroup, editingTask, isOpen, tasks]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedId = id.trim().toUpperCase();
    if (!cleanedId) {
      setFormError("Timeline item ID is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Timeline item name is required.");
      return;
    }

    // Check if ID already exists when creating a new task, or if ID is edited to conflict
    if (!editingTask && tasks.some((t) => t.id.toLowerCase() === cleanedId.toLowerCase())) {
      setFormError(`An item with ID "${cleanedId}" already exists.`);
      return;
    }

    const taskData: Task = {
      id: cleanedId,
      name: name.trim(),
      isGroup,
      duration: isGroup ? 0 : (isMilestone ? 0 : Math.max(0, duration)),
      dependency: !isGroup && !isFixed && dependency ? dependency : undefined,
      offset: isGroup || isFixed ? 0 : offset,
      parentId: parentId ? parentId : undefined,
      collapsed: isGroup ? (editingTask ? editingTask.collapsed : false) : undefined,
      color: color,
      startDate: editingTask?.startDate || "",
      endDate: editingTask?.endDate || "",
      isFixed: isGroup ? undefined : isFixed,
      fixedStartDate: !isGroup && isFixed ? fixedStartDate : undefined,
      fixedEndDate: !isGroup && isFixed && !isMilestone ? fixedEndDate : undefined,
      isMilestone: !isGroup ? isMilestone : undefined
    };

    if (editingTask) {
      onEditTask(editingTask.id, taskData);
    } else {
      onAddTask(taskData);
    }

    // Reset and exit
    onClose();
  };

  // Filter possible dependencies: standard tasks only, excluding self
  const eligibleDependencies = tasks.filter((t) => !t.isGroup && t.id !== id);

  // Filter possible parent groups, excluding self
  const parentGroups = tasks.filter((t) => t.isGroup && t.id !== id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-650" />
            <h3 className="font-bold text-slate-900 text-sm">
              {editingTask ? "Modify Timeline Item" : "Create Timeline Item"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-center gap-2 shrink-0">
              <span className="font-bold">Error:</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Two-column responsive split layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Input Forms (7/12) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Type Toggle - Only visible when creating a task (Edit mode type is immutable) */}
              {!editingTask && (
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] w-full">
                  <button
                    type="button"
                    className={`flex-1 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      !isGroup ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => setIsGroup(false)}
                  >
                    Standard Task
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      isGroup ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => setIsGroup(true)}
                  >
                    Folder Group
                  </button>
                </div>
              )}

              {/* ID & Name fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Item ID
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400">
                      <Hash className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={id}
                      onChange={(e) => setId(e.target.value.toUpperCase())}
                      disabled={!!editingTask}
                      placeholder={isGroup ? "G1" : "T1"}
                      className={`w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase transition-all ${
                        editingTask ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isGroup ? "Group Name" : "Task Name"}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isGroup ? "Phase 1: Design" : "Code Authentication"}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-850"
                    required
                  />
                </div>
              </div>

              {/* Calculated Output section (Read-only as requested) */}
              {editingTask && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl space-y-1.5 text-xs select-text">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Calculated Schedule (Read-Only)</span>
                  <div className="grid grid-cols-2 gap-2 font-medium">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wide">Start Date</span>
                      <span className="font-mono text-slate-800 text-xs">{editingTask.startDate || "Not scheduled yet"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wide">End Date</span>
                      <span className="font-mono text-slate-800 text-xs">{editingTask.endDate || "Not scheduled yet"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic properties based on category folder vs task */}
              {!isGroup && (
                <>
                  {/* Scheduling Strategy Selection Grid */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Scheduling Strategy
                    </label>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFixed(false);
                          setIsMilestone(false);
                        }}
                        className={`flex flex-col items-center justify-center text-center p-2 rounded-lg border text-xs gap-1 shadow-2xs transition-all cursor-pointer ${
                          !isFixed && !isMilestone
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                        }`}
                      >
                        <Sliders className={`w-4 h-4 shrink-0 ${!isFixed && !isMilestone ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[9px] uppercase tracking-wider font-extrabold leading-none">Dynamic Path</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsFixed(true);
                          setIsMilestone(false);
                        }}
                        className={`flex flex-col items-center justify-center text-center p-2 rounded-lg border text-xs gap-1 shadow-2xs transition-all cursor-pointer ${
                          isFixed && !isMilestone
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                        }`}
                      >
                        <Calendar className={`w-4 h-4 shrink-0 ${isFixed && !isMilestone ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[9px] uppercase tracking-wider font-extrabold leading-none">Hard Dates</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsFixed(true);
                          setIsMilestone(true);
                        }}
                        className={`flex flex-col items-center justify-center text-center p-2 rounded-lg border text-xs gap-1 shadow-2xs transition-all cursor-pointer ${
                          isFixed && isMilestone
                            ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                        }`}
                      >
                        <Anchor className={`w-4 h-4 shrink-0 ${isFixed && isMilestone ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[9px] uppercase tracking-wider font-extrabold leading-none">Milestone</span>
                      </button>
                    </div>
                  </div>

                  {/* Fields rendering */}
                  {isFixed ? (
                    <>
                      {/* FIXED DATE SETTINGS */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={isMilestone ? "col-span-2" : ""}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {isMilestone ? "Milestone Target Date" : "Hard Start Date"}
                          </label>
                          <input
                            type="date"
                            value={fixedStartDate}
                            onChange={(e) => {
                              setFixedStartDate(e.target.value);
                              if (isMilestone) {
                                setFixedEndDate(e.target.value);
                              }
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                            required
                          />
                        </div>

                        {!isMilestone && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Hard End Date
                            </label>
                            <input
                              type="date"
                              value={fixedEndDate}
                              min={fixedStartDate}
                              onChange={(e) => setFixedEndDate(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                              required
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* DYNAMIC SETTINGS */}
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Duration (Days)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="365"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* Dependency Settings */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200">
                        <div className="col-span-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1">
                          <div className="text-[10px] font-bold text-slate-550 flex items-center gap-1.5 uppercase tracking-wider">
                            <PlusCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Dependency Engine</span>
                          </div>
                          <div className="flex items-center gap-1.5 select-none shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offset:</span>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 h-6">
                              <input
                                type="number"
                                min="-52"
                                max="52"
                                value={offset}
                                onChange={(e) => setOffset(parseInt(e.target.value) || 0)}
                                className="w-9 text-xs focus:outline-none font-mono text-center text-slate-700 font-bold bg-transparent border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[9px] font-bold text-slate-400 uppercase">wks</span>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Depends On (Multiple allowed)
                          </label>
                          <div className="border border-slate-200 bg-white rounded-lg p-2 max-h-[110px] overflow-y-auto space-y-1">
                            {eligibleDependencies.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic">No other tasks available</div>
                            ) : (
                              eligibleDependencies.map((t) => {
                                const currentDeps = dependency.split(",").map((d) => d.trim()).filter(Boolean);
                                const isChecked = currentDeps.includes(t.id);
                                return (
                                  <label key={t.id} className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer select-none text-[11px] w-full min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        let nextDeps: string[];
                                        if (e.target.checked) {
                                          nextDeps = [...currentDeps, t.id];
                                        } else {
                                          nextDeps = currentDeps.filter((id) => id !== t.id);
                                        }
                                        setDependency(nextDeps.join(", "));
                                      }}
                                      className="rounded border-slate-300 text-indigo-700 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                                    />
                                    <span className="font-mono font-bold text-slate-755 shrink-0 w-[30px]">{t.id}</span>
                                    <span className="text-slate-650 truncate flex-1 min-w-0" title={t.name}>{t.name}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Common Group Folder selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Group Folder
                    </label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-medium"
                    >
                      <option value="">No Group (Root Level)</option>
                      {parentGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.id} — {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Color Presets Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Display Color Accent
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`w-5.5 h-5.5 rounded-full transition-transform focus:outline-shadow focus:outline-none cursor-pointer relative ${
                        color === c.hex ? "scale-115 ring-2 ring-offset-2 ring-indigo-500" : "opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Quick Cheat Helper Sheet (5/12) */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-655 space-y-3 font-sans h-full">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-bold text-slate-850 text-[11px] uppercase tracking-wider">
                  Timeline Cheat Sheet
                </span>
              </div>
              <ul className="list-disc list-inside space-y-2.5 text-[11px] text-slate-600 pl-0.5 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Predecessors:</strong> Connect standard tasks together (e.g. <code className="bg-slate-100 text-slate-850 px-1 py-0.5 rounded font-mono font-bold">T2</code> depends on <code className="bg-slate-100 text-slate-850 px-1 py-0.5 rounded font-mono font-bold">T1</code>) to trigger automated downstream path scheduling.
                </li>
                <li>
                  <strong className="text-slate-800">Weeks Offset:</strong> Inject lag or lead times. Positive numbers (<code className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-mono px-1 rounded font-bold">+1</code>) add delay, negative numbers (<code className="bg-amber-50 border border-amber-100 text-amber-800 font-mono px-1 rounded font-bold">-1</code>) overlap schedules.
                </li>
                <li>
                  <strong className="text-slate-800">Group Folders:</strong> Nest child items by selecting any Folder Group. This tracks hierarchies with automatic parent roll-up dates.
                </li>
                <li>
                  <strong className="text-slate-800">Autonomous Dates:</strong> Start and end dates are generated by the engine and are fully locked to prevent scheduling alignment errors.
                </li>
              </ul>

              <div className="pt-2.5 border-t border-slate-200/60 flex flex-col gap-1.5 text-[10px] text-slate-450 leading-relaxed font-medium">
                <span className="font-semibold text-slate-500 uppercase tracking-wide">Automatic Rules:</span>
                <span>• Circular dependencies are automatically blocked.</span>
                <span>• Group folders expand to encompass all child tasks.</span>
              </div>
            </div>

          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {editingTask && onDeleteTask && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${editingTask.id}: ${editingTask.name}"? This will also remove any circular dependency connections.`)) {
                      onDeleteTask(editingTask.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 border border-red-200 text-red-650 hover:text-red-700 hover:bg-red-50/50 transition-colors cursor-pointer text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white transition-colors cursor-pointer text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-900/10"
              >
                {editingTask ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Timeline Item</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
