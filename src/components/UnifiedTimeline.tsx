import { useMemo, useState, CSSProperties } from "react";
import { Task, Holiday } from "../types";
import { parseISO, addDays, format, differenceInDays, isValid, getDay } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Trash2,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Lock
} from "lucide-react";

const formatToMMDD = (dateStr?: string) => {
  if (!dateStr || dateStr === "---") return "---";
  try {
    const parsed = parseISO(dateStr);
    if (isValid(parsed)) {
      return format(parsed, "MM/dd");
    }
  } catch {
    // fallback
  }
  if (dateStr.length === 10 && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
};

interface UnifiedTimelineProps {
  structuredTasks: { task: Task; level: number; isVisible: boolean }[];
  allTasks: Task[];
  projectStartDateStr: string;
  onDeleteTask: (id: string) => void;
  onToggleGroupCollapse: (id: string) => void;
  onSelectTaskToEdit: (task: Task) => void;
  workWeekends?: boolean;
  holidays?: Holiday[];
  dependencyMode: "none" | "all" | "multiple";
}

export default function UnifiedTimeline({
  structuredTasks,
  allTasks,
  projectStartDateStr,
  onDeleteTask,
  onToggleGroupCollapse,
  onSelectTaskToEdit,
  workWeekends = false,
  holidays = [],
  dependencyMode
}: UnifiedTimelineProps) {
  // Configurable pixels per day state (starts at 20px per day as explicitly requested)
  const [dayWidth, setDayWidth] = useState<number>(20);
  const [scale, setScale] = useState<"days" | "weeks" | "months">("weeks");
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    return structuredTasks.filter((r) => r.isVisible);
  }, [structuredTasks]);

  // Establish Gantt grid bounds based on start date
  const projectStartDate = useMemo(() => {
    try {
      const d = parseISO(projectStartDateStr);
      return isValid(d) ? d : new Date();
    } catch {
      return new Date();
    }
  }, [projectStartDateStr]);

  // Calculate the timeline span based on the latest task endDate
  const timelineSizing = useMemo(() => {
    let latestDate = addDays(projectStartDate, 42); // default 6 weeks minimum

    for (const r of visibleRows) {
      if (r.task.endDate) {
        try {
          const endD = parseISO(r.task.endDate);
          if (isValid(endD) && endD > latestDate) {
            latestDate = endD;
          }
        } catch {
          // ignore
        }
      }
    }

    // Add 2 weeks padding for beauty
    latestDate = addDays(latestDate, 14);

    const totalDays = Math.max(28, differenceInDays(latestDate, projectStartDate));
    const totalWeeks = Math.ceil(totalDays / 7);

    return {
      totalWeeks: Math.max(8, totalWeeks), // minimum 8 weeks
      totalDays: Math.max(8, totalWeeks) * 7
    };
  }, [visibleRows, projectStartDate]);

  const ROW_HEIGHT = 32; // compressed vertical height to maximize layout density
  const HEADER_HEIGHT = 56; // matching spreadsheet and gantt header
  const WEEK_WIDTH = dayWidth * 7;
  const DAY_WIDTH = dayWidth;

  // Generate weeks data for header rows
  const weeks = useMemo(() => {
    const list = [];
    for (let w = 0; w < timelineSizing.totalWeeks; w++) {
      const weekStart = addDays(projectStartDate, w * 7);
      const monthLabel = format(weekStart, "MMMM yyyy");
      const dateLabel = format(weekStart, "MM/dd");
      list.push({
        index: w,
        startDate: weekStart,
        monthLabel,
        dateLabel
      });
    }
    return list;
  }, [timelineSizing, projectStartDate]);

  // Generate days list for days resolution
  const daysList = useMemo(() => {
    const list = [];
    for (let d = 0; d < timelineSizing.totalDays; d++) {
      const dayDate = addDays(projectStartDate, d);
      const isWeekend = getDay(dayDate) === 0 || getDay(dayDate) === 6;
      const formattedStr = format(dayDate, "yyyy-MM-dd");
      const matchedHol = holidays.find(h => h.date === formattedStr);
      list.push({
        index: d,
        date: dayDate,
        isWeekend,
        holidayName: matchedHol ? matchedHol.name : undefined,
        dayLabel: format(dayDate, "EE").substring(0, 1),
        dateLabel: format(dayDate, "MM/dd"),
        monthLabel: format(dayDate, "MMMM yyyy")
      });
    }
    return list;
  }, [timelineSizing.totalDays, projectStartDate, holidays]);

  // Group days by month for the top month header under "days" view
  const daysMonthHeaders = useMemo(() => {
    const headers: { label: string; span: number }[] = [];
    if (daysList.length === 0) return headers;

    let currentMonth = daysList[0].monthLabel;
    let currentSpan = 0;

    for (const d of daysList) {
      if (d.monthLabel === currentMonth) {
        currentSpan++;
      } else {
        headers.push({ label: currentMonth, span: currentSpan });
        currentMonth = d.monthLabel;
        currentSpan = 1;
      }
    }
    headers.push({ label: currentMonth, span: currentSpan });
    return headers;
  }, [daysList]);

  // Group days by month for "months" view
  const monthsData = useMemo(() => {
    const list: { label: string; spanDays: number; index: number }[] = [];
    if (daysList.length === 0) return list;

    let currentMonth = daysList[0].monthLabel;
    let currentSpan = 0;
    let index = 0;

    for (const d of daysList) {
      if (d.monthLabel === currentMonth) {
        currentSpan++;
      } else {
        list.push({
          label: currentMonth,
          spanDays: currentSpan,
          index: index++
        });
        currentMonth = d.monthLabel;
        currentSpan = 1;
      }
    }
    list.push({
      label: currentMonth,
      spanDays: currentSpan,
      index: index++
    });
    return list;
  }, [daysList]);

  const TOTAL_GRID_WIDTH = useMemo(() => {
    if (scale === "weeks") {
      return weeks.length * WEEK_WIDTH;
    }
    return timelineSizing.totalDays * DAY_WIDTH;
  }, [scale, weeks.length, WEEK_WIDTH, timelineSizing.totalDays, DAY_WIDTH]);

  // Group adjacent weeks by month for the month header
  const monthHeaders = useMemo(() => {
    const headers: { label: string; span: number }[] = [];
    if (weeks.length === 0) return headers;

    let currentMonth = weeks[0].monthLabel;
    let currentSpan = 0;

    for (const w of weeks) {
      if (w.monthLabel === currentMonth) {
        currentSpan++;
      } else {
        headers.push({ label: currentMonth, span: currentSpan });
        currentMonth = w.monthLabel;
        currentSpan = 1;
      }
    }
    // push final group
    headers.push({ label: currentMonth, span: currentSpan });
    return headers;
  }, [weeks]);

  // Active Unit Width calculation based on current scale mode
  const activeUnitWidth = useMemo(() => {
    if (scale === "days") return dayWidth;
    if (scale === "weeks") return dayWidth * 7;
    return dayWidth * 30; // standard month span representation
  }, [scale, dayWidth]);

  const handleActiveWidthChange = (newVal: number) => {
    const safeVal = Math.max(1, newVal);
    if (scale === "days") {
      setDayWidth(Math.min(100, Math.max(6, safeVal)));
    } else if (scale === "weeks") {
      const calculatedDayWidth = safeVal / 7;
      setDayWidth(Math.min(100, Math.max(6, calculatedDayWidth)));
    } else {
      const calculatedDayWidth = safeVal / 30;
      setDayWidth(Math.min(100, Math.max(6, calculatedDayWidth)));
    }
  };

  const handleIncrementUnit = () => {
    if (scale === "days") {
      handleActiveWidthChange(dayWidth + 2);
    } else if (scale === "weeks") {
      handleActiveWidthChange(Math.round(dayWidth * 7 + 14));
    } else {
      handleActiveWidthChange(Math.round(dayWidth * 30 + 60));
    }
  };

  const handleDecrementUnit = () => {
    if (scale === "days") {
      handleActiveWidthChange(dayWidth - 2);
    } else if (scale === "weeks") {
      handleActiveWidthChange(Math.round(dayWidth * 7 - 14));
    } else {
      handleActiveWidthChange(Math.round(dayWidth * 30 - 60));
    }
  };

  const handleResetToDefault = () => {
    setDayWidth(20);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col w-full" id="unified-timeline">
      
      {/* 1. MASTER UNIFIED CONTROL HEADER PANEL */}
      <div className="h-12 px-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-900" />
          <h3 className="font-bold text-slate-900 text-sm font-sans">
            Timeline Spreadsheet & Chronology Grid
          </h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-100 font-bold px-2 py-0.5 rounded-full font-mono">
            {allTasks.length} ITEMS
          </span>
        </div>

        {/* INTERACTIVE SCALE RESOLUTION AND DAY ZOOM CONTROL PANEL */}
        <div className="flex items-center gap-4 animate-fade-in">
          {/* SCALE RESOLUTION SELECTION SEGMENTS (Days, Weeks, Months scale) */}
          <div className="flex items-center bg-slate-200/50 p-0.5 rounded-lg border border-slate-200" id="gantt-resolution-selector">
            {(["days", "weeks", "months"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-md transition-all cursor-pointer ${
                  scale === s
                    ? "bg-indigo-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* COMBINED ZOOM CONTROL FIELD */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs px-2.5 py-0.5 gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
              Column width:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDecrementUnit}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                title="Zoom out column width"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                <input
                  type="number"
                  value={Math.round(activeUnitWidth)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      handleActiveWidthChange(val);
                    }
                  }}
                  className="w-12 text-center text-xs font-mono font-bold text-indigo-950 bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ width: "32px" }}
                  title="Type custom pixel width to override grid layout columns directly"
                />
                <span className="text-[9px] font-mono text-slate-400 font-extrabold select-none">px</span>
              </div>

              <button
                type="button"
                onClick={handleIncrementUnit}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                title="Zoom in column width"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE COMPACT DENSITY GRID: SPREADSHEET (LEFT) AND GANTT GRID (RIGHT) */}
      <div className="flex w-full items-stretch overflow-hidden relative">
        
        {/* LEFT COLUMN: THE SPREADSHEET PANE (Non-scrollable, tight width spacing) */}
        <div className="w-[580px] shrink-0 border-r border-slate-200 bg-white flex flex-col select-none">
          {/* Header Row matched height (56px) */}
          <div 
            className="bg-slate-100 border-b border-slate-300 flex text-[10px] font-bold text-slate-800 uppercase tracking-wider font-sans"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <div className="w-[35px] border-r border-slate-200 h-full flex items-center px-1 font-bold shrink-0 justify-center">ID</div>
            <div className="flex-1 min-w-[150px] border-r border-slate-200 h-full flex items-center px-2.5 font-bold">Task Details / Group</div>
            <div className="w-[55px] border-r border-slate-200 h-full flex items-center px-1 font-bold shrink-0 justify-center">Start</div>
            <div className="w-[55px] border-r border-slate-200 h-full flex items-center px-1 font-bold shrink-0 justify-center">End</div>
            <div className="w-[38px] border-r border-slate-200 h-full flex items-center px-0.5 text-center shrink-0 justify-center font-bold">Dur</div>
            <div className="w-[55px] border-r border-slate-200 h-full flex items-center px-1 font-bold shrink-0 justify-center">Predec.</div>
            <div className="w-[40px] h-full flex items-center justify-center text-center px-0.5 shrink-0 font-bold">Off.</div>
          </div>

          {/* Spreadsheet Data Body */}
          <div className="divide-y divide-slate-100 text-xs flex flex-col">
            {visibleRows.length === 0 ? (
              <div className="py-12 text-center text-slate-450 font-sans" style={{ height: "120px" }}>
                <span className="block font-bold text-slate-700 text-xs">No active timeline path items.</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Click the "+ Add" action above.</span>
              </div>
            ) : (
              visibleRows.map(({ task, level }) => {
                const isGroup = task.isGroup;
                const isRowHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTaskToEdit(task)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    className={`flex items-center transition-all duration-100 group border-l-2 cursor-pointer ${
                      isRowHovered ? "bg-indigo-50/40 border-l-indigo-500" :
                      isGroup
                        ? "bg-slate-50/20 font-bold text-slate-905 border-l-slate-400"
                        : "text-slate-650 border-l-transparent hover:bg-slate-50/50 hover:border-l-indigo-400"
                    }`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {/* ID Indicator */}
                    <div className="w-[35px] shrink-0 border-r border-slate-100 h-full flex items-center justify-center px-1 whitespace-nowrap overflow-hidden">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 rounded text-[8.5px] font-mono font-bold ${
                          isGroup
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : "bg-indigo-50/80 text-indigo-800 border border-indigo-100/60"
                        }`}
                      >
                        {task.id}
                      </span>
                    </div>

                    {/* Task Tree Name */}
                    <div className="flex-1 min-w-[150px] shrink-0 border-r border-slate-100 h-full flex items-center px-2 overflow-hidden">
                      <div
                        className="flex items-center gap-1 w-full"
                        style={{ paddingLeft: `${level * 0.5}rem` }}
                      >
                        {isGroup ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleGroupCollapse(task.id);
                            }}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none cursor-pointer shrink-0"
                          >
                            {task.collapsed ? (
                              <div className="flex items-center gap-0.5">
                                <ChevronRight className="w-3 h-3 text-slate-705" />
                                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <ChevronDown className="w-3 h-3 text-slate-705" />
                                <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="w-3 flex justify-center text-slate-300 shrink-0 select-none text-[9px] font-mono">
                            └─
                          </div>
                        )}

                        <span 
                          title={task.name}
                          className={`px-0.5 select-none text-[11px] font-sans whitespace-normal break-words leading-tight line-clamp-2 max-h-full ${isGroup ? "font-bold text-slate-800" : "text-slate-750"}`}
                        >
                          {task.name}
                        </span>
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="w-[55px] shrink-0 border-r border-slate-100 h-full flex items-center justify-center px-1 whitespace-nowrap overflow-hidden gap-0.5 text-center">
                      {!isGroup && task.isFixed && (
                        <Lock className="w-2.5 h-2.5 text-indigo-500 shrink-0" title="Fixed start date" />
                      )}
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {formatToMMDD(task.startDate)}
                      </span>
                    </div>

                    {/* End Date */}
                    <div className="w-[55px] shrink-0 border-r border-slate-100 h-full flex items-center justify-center px-1 whitespace-nowrap overflow-hidden gap-0.5 text-center">
                      {!isGroup && task.isFixed && !task.isMilestone && (
                        <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" title="Fixed end date" />
                      )}
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {formatToMMDD(task.endDate)}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="w-[38px] shrink-0 border-r border-slate-100 h-full flex items-center px-0.5 justify-center whitespace-nowrap overflow-hidden font-mono text-[10px] text-slate-605 font-semibold text-center">
                      {isGroup ? (
                        <span className="text-slate-300 font-normal">—</span>
                      ) : task.isMilestone ? (
                        <span className="inline-flex items-center px-1 py-0.2 bg-rose-50 text-rose-800 text-[8px] font-extrabold border border-rose-100 rounded leading-none text-center">Mst</span>
                      ) : (
                        <span>{task.duration}d</span>
                      )}
                    </div>

                    {/* Dependency Predecessor */}
                    <div className="w-[55px] shrink-0 border-r border-slate-100 h-full flex items-center justify-center px-1 overflow-hidden">
                      {isGroup ? (
                        <span className="text-slate-305 font-normal text-[10px]">—</span>
                      ) : task.isFixed ? (
                        <span className="text-slate-350 text-[9px] font-medium uppercase tracking-wider">Fixed</span>
                      ) : task.dependency ? (
                        <div className="flex flex-wrap gap-0.5 justify-center max-h-full overflow-y-auto w-full">
                          {task.dependency.split(",").map((d) => d.trim()).filter(Boolean).map((depId) => (
                            <span
                              key={depId}
                              className="inline-flex items-center px-1 py-0.2 bg-indigo-50/70 text-indigo-850 text-[8.5px] font-bold border border-indigo-100 rounded font-mono"
                              title={`Depends on ${depId}`}
                            >
                              {depId}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </div>

                    {/* Offset */}
                    <div className="w-[40px] shrink-0 h-full flex items-center px-1 justify-center whitespace-nowrap overflow-hidden font-mono text-[10px] text-slate-500 text-center">
                      {isGroup ? (
                        <span className="text-slate-300 font-normal">—</span>
                      ) : task.isFixed ? (
                        <span className="text-slate-355 text-[9px] font-medium">—</span>
                      ) : task.offset ? (
                        <span className={task.offset > 0 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {task.offset > 0 ? `+${task.offset}` : task.offset}w
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">0</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {/* RIGHT COLUMN: THE COMPRESSIBLE GANTT CHRONOLOGY CHART (Horizontally Scrollable) */}
        <div className="flex-1 overflow-x-auto bg-slate-50/15 flex flex-col select-none scrollbar-thin">
          <div
            style={{
              width: `${TOTAL_GRID_WIDTH}px`,
              position: "relative"
            }}
            className="flex flex-col h-full px-2"
          >
            {/* Double header aligned precisely with 56px height mapping */}
            <div 
              className="bg-slate-100 border-b border-slate-300 sticky top-0 z-10 font-sans shadow-2xs"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              {scale === "days" && (
                <>
                  {/* Month Header row */}
                  <div 
                    className="flex border-b border-slate-200 text-[10px] bg-slate-100"
                    style={{ height: "24px" }}
                  >
                    {daysMonthHeaders.map((mh, i) => (
                      <div
                        key={i}
                        style={{ width: `${mh.span * DAY_WIDTH}px` }}
                        className="py-1 px-2.5 border-r border-slate-200 uppercase tracking-wide overflow-hidden text-ellipsis whitespace-nowrap flex items-center font-extrabold text-slate-800 text-[9.5px]"
                      >
                        {mh.label}
                      </div>
                    ))}
                  </div>

                  {/* Day Header row using MM/DD format */}
                  <div 
                    className="flex text-[10px] bg-slate-50"
                    style={{ height: "31px" }}
                  >
                    {daysList.map((d) => (
                      <div
                        key={d.index}
                        style={{ width: `${DAY_WIDTH}px` }}
                        className={`px-0.5 border-r border-slate-200 overflow-hidden text-ellipsis whitespace-nowrap flex flex-col justify-center items-center select-none ${
                          d.holidayName
                            ? "bg-amber-100 text-amber-900 font-bold border-b border-b-amber-300"
                            : d.isWeekend
                            ? "bg-slate-100 text-slate-450"
                            : "bg-white text-slate-800"
                        }`}
                        title={`${format(d.date, "EEEE, MMMM dd, yyyy")}${d.holidayName ? ` - Holiday: ${d.holidayName}` : ""}`}
                      >
                        {DAY_WIDTH >= 28 ? (
                          <>
                            <div className="font-extrabold text-[8.5px] leading-tight select-none text-indigo-950">{d.dateLabel}</div>
                            <div className="text-[7.5px] leading-none text-slate-500 font-bold select-none uppercase">{format(d.date, "EE").substring(0, 2)}</div>
                          </>
                        ) : (
                          <div className="text-[8.5px] font-extrabold select-none">{format(d.date, "EE").substring(0, 1)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {scale === "weeks" && (
                <>
                  {/* Month Header line */}
                  <div 
                    className="flex border-b border-slate-200 text-[10px] bg-slate-100"
                    style={{ height: "24px" }}
                  >
                    {monthHeaders.map((mh, i) => (
                      <div
                        key={i}
                        style={{ width: `${mh.span * WEEK_WIDTH}px` }}
                        className="py-1 px-2.5 border-r border-slate-200 uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap flex items-center font-extrabold text-slate-800"
                      >
                        {mh.label}
                      </div>
                    ))}
                  </div>

                  {/* Week Header line */}
                  <div 
                    className="flex text-[10px] bg-slate-55"
                    style={{ height: "31px" }}
                  >
                    {weeks.map((w) => (
                      <div
                        key={w.index}
                        style={{ width: `${WEEK_WIDTH}px` }}
                        className="px-2 border-r border-slate-200 overflow-hidden text-ellipsis whitespace-nowrap flex flex-col justify-center"
                      >
                        <div className="text-indigo-950 leading-none font-extrabold text-[10px]">Wk {w.index + 1}</div>
                        <div className="font-bold text-[9px] text-slate-700 leading-tight mt-0.5">{w.dateLabel}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {scale === "months" && (
                <>
                  {/* Top Row: Year Header label */}
                  <div 
                    className="flex border-b border-slate-200 text-[10px] bg-slate-100"
                    style={{ height: "24px" }}
                  >
                    <div className="py-1 px-2.5 uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap flex items-center font-extrabold text-slate-800">
                      Project Schedule Chronology
                    </div>
                  </div>

                  {/* Monthly label header columns */}
                  <div 
                    className="flex text-[10px] bg-slate-50"
                    style={{ height: "31px" }}
                  >
                    {monthsData.map((m) => {
                      const width = m.spanDays * DAY_WIDTH;
                      return (
                        <div
                          key={m.index}
                          style={{ width: `${width}px` }}
                          className="px-3 border-r border-slate-200 overflow-hidden text-ellipsis whitespace-nowrap flex flex-col justify-center font-bold"
                        >
                          <div className="text-indigo-950 font-extrabold text-[10.5px] uppercase tracking-wide">{m.label}</div>
                          <div className="text-[8.5px] text-slate-500 font-bold font-sans">({m.spanDays} Days span)</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Matrix timeline area containing aligned tasks rows (with exact matching height ROW_HEIGHT = 32px) */}
            <div
              className="relative divide-y divide-slate-100 flex flex-col w-full"
              style={{
                height: `${visibleRows.length === 0 ? 120 : visibleRows.length * ROW_HEIGHT}px`
              }}
            >
              {/* Draw Vertical Columns Background Grid */}
              <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none z-0">
                {scale === "days" && daysList.map((d) => (
                  <div
                    key={d.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${d.index * DAY_WIDTH}px`,
                      width: `${DAY_WIDTH}px`,
                    }}
                    className={`h-full border-r border-slate-200/40 pointer-events-none transition-colors ${
                      d.holidayName
                        ? "bg-amber-500/10 shadow-[inset_0_0_4px_rgba(245,158,11,0.15)]"
                        : d.isWeekend && !workWeekends 
                        ? "bg-slate-100 shadow-inner" 
                        : ""
                    }`}
                    title={d.holidayName ? `Blocked Holiday: ${d.holidayName}` : undefined}
                  />
                ))}
                {scale === "weeks" && weeks.map((w) => (
                  <div
                    key={w.index}
                    style={{ width: `${WEEK_WIDTH}px` }}
                    className="h-full border-r border-slate-200/40"
                  />
                ))}
                {scale === "months" && (() => {
                  let accumulatedWidth = 0;
                  return monthsData.map((m) => {
                    const width = m.spanDays * DAY_WIDTH;
                    const left = accumulatedWidth;
                    accumulatedWidth += width;
                    return (
                      <div
                        key={m.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: `${left}px`,
                          width: `${width}px`,
                        }}
                        className="h-full border-r border-slate-200"
                      />
                    );
                  });
                })()}
              </div>

              {/* If no tasks */}
              {visibleRows.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium font-sans">
                  Generate path items above to draw visual chronologies.
                </div>
              )}

              {/* Rows matching spreadsheet item-for-item */}
              {visibleRows.map(({ task }, index) => {
                const isGroup = task.isGroup;

                // Calculate horizontal offsets based on zoom dayWidth scale
                let leftOffsetPx = 0;
                let barWidthPx = 0;

                if (task.startDate && task.endDate) {
                  try {
                    const tStart = parseISO(task.startDate);
                    const tEnd = parseISO(task.endDate);

                    if (isValid(tStart) && isValid(tEnd)) {
                      const diffDaysStart = differenceInDays(tStart, projectStartDate);
                      const diffDaysDuration = differenceInDays(tEnd, tStart);

                      leftOffsetPx = diffDaysStart * DAY_WIDTH;
                      if (task.isMilestone) {
                        barWidthPx = 14;
                        leftOffsetPx = leftOffsetPx + (DAY_WIDTH / 2) - 7;
                      } else {
                        barWidthPx = Math.max(5, diffDaysDuration * DAY_WIDTH);
                      }
                    }
                  } catch {
                    // Ignore date calculations errors
                  }
                }

                const isNearTop = index < 3;
                const tooltipVerticalClass = isNearTop ? "top-5" : "bottom-5";

                let tooltipHorizontalStyle: CSSProperties = {
                  left: "50%",
                  transform: "translateX(-50%)"
                };

                if (leftOffsetPx + barWidthPx / 2 < 110) {
                  tooltipHorizontalStyle = {
                    left: "0px",
                    transform: "none"
                  };
                } else if (TOTAL_GRID_WIDTH - (leftOffsetPx + barWidthPx / 2) < 110) {
                  tooltipHorizontalStyle = {
                    right: "0px",
                    left: "auto",
                    transform: "none"
                  };
                }

                const isRowHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    className={`relative w-full border-b border-slate-100/70 flex items-center group/row transition-colors duration-100 ${
                      isRowHovered ? "bg-indigo-50/20" : ""
                    }`}
                    style={{
                      height: `${ROW_HEIGHT}px`
                    }}
                  >
                    {/* Aligned guideline highlighted row on hover */}
                    <div className="absolute inset-0 bg-slate-50/30 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none z-0" />

                    {/* Absolutely positioned timeline bar */}
                    {barWidthPx > 0 && (
                      <div
                        className="absolute h-5 flex items-center group/bar transition-all cursor-pointer hover:scale-[1.01] z-10"
                        onClick={() => onSelectTaskToEdit?.(task)}
                        style={{
                          left: `${leftOffsetPx}px`,
                          width: `${barWidthPx}px`
                        }}
                      >
                        {isGroup ? (
                          /* GROUP SUMMARY BAR (Just the clean charcoal bracket lines - absolutely NO text labels or names as requested!) */
                          <div className="w-full relative h-[6px]">
                            {/* Horizontal line */}
                            <div className="absolute inset-x-0 top-[1px] h-[4px] bg-slate-800 rounded-xs" />
                            {/* Left bracket wing */}
                            <div
                              className="absolute left-0 top-[1px] w-1.5 h-[8px] bg-slate-800"
                              style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 50%)" }}
                            />
                            {/* Right bracket wing */}
                            <div
                              className="absolute right-0 top-[1px] w-1.5 h-[8px] bg-slate-800"
                              style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 100%)" }}
                            />
                          </div>
                        ) : task.isMilestone ? (
                          /* MILESTONE DIAMOND NODE element */
                          <div className="w-full flex items-center justify-center h-5 relative">
                            <div
                              className="w-3 h-3 rotate-45 border-2 border-white shadow-xs transition-transform hover:scale-110"
                              style={{
                                backgroundColor: task.color || "#f43f5e"
                              }}
                            />
                          </div>
                        ) : (
                          /* STANDARD TASK COLOR STRIP (Just the colored line with hover duration metrics, absolutely NO names or overlay text inside!) */
                          <div
                            className="w-full h-4 rounded shadow-3xs hover:shadow-2xs transition-all flex items-center relative overflow-hidden"
                            style={{
                              backgroundColor: task.color || "#4f46e5"
                            }}
                          >
                            {/* Elegant linear shine surface gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />

                            {/* Tiny Duration indicator shown on hover only */}
                            <div className="absolute right-1 opacity-0 group-hover/bar:opacity-100 transition-opacity text-[8px] font-mono bg-black/25 px-0.5 rounded select-none text-white font-bold leading-none">
                              {task.duration}d
                            </div>
                          </div>
                        )}

                        {/* HIGHLY DETAILED TOOLTIP HOVER SPECIFICATION SHEET */}
                        <div 
                          style={tooltipHorizontalStyle}
                          className={`absolute hidden group-hover/bar:flex ${tooltipVerticalClass} bg-slate-900 border border-slate-850 text-white p-3 rounded-lg text-xs leading-relaxed shadow-xl z-50 w-52 flex-col gap-1 pointer-events-none font-sans`}
                        >
                          <div className="flex items-center justify-between border-b border-white/15 pb-1 mb-1 font-bold text-slate-200 text-[11px]">
                            <span>{task.id}: {task.name}</span>
                            {isGroup ? (
                              <span className="text-[8px] bg-slate-800 text-slate-350 px-1 rounded uppercase font-bold">Group</span>
                            ) : task.isMilestone ? (
                              <span className="text-[8px] bg-rose-600 text-white px-1 rounded uppercase font-bold">Milestone</span>
                            ) : task.isFixed ? (
                              <span className="text-[8px] bg-amber-600 text-white px-1 rounded uppercase font-bold">Fixed</span>
                            ) : (
                              <span className="text-[8px] bg-indigo-600 text-white px-1 rounded uppercase font-bold">Dynamic</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-1 justify-between gap-y-0.5 text-[10px] font-mono">
                            <span className="text-slate-400 font-sans">Start Date:</span>
                            <span className="text-slate-100 font-semibold text-right">{task.startDate}</span>
                            <span className="text-slate-400 font-sans">End Date:</span>
                            <span className="text-slate-100 font-semibold text-right">{task.endDate}</span>
                            {!isGroup && (
                              <>
                                <span className="text-slate-400 font-sans">Duration:</span>
                                <span className="text-slate-100 font-semibold text-right">
                                  {task.isMilestone ? "Milestone" : `${task.duration} Days`}
                                </span>
                                {!task.isFixed && (
                                  <>
                                    {task.dependency && (
                                      <>
                                        <span className="text-slate-400 font-sans">Depends On:</span>
                                        <span className="text-indigo-300 font-bold text-right">{task.dependency}</span>
                                      </>
                                    )}
                                    <span className="text-slate-400 font-sans">Offset:</span>
                                    <span className="text-slate-100 font-semibold text-right">{task.offset} Wk</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* DYNAMIC SVG DEEP DEPENDENCY CONNECTOR LAYER */}
              {visibleRows.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none z-15"
                  style={{
                    width: `${TOTAL_GRID_WIDTH}px`,
                    height: `${visibleRows.length * ROW_HEIGHT}px`
                  }}
                >
                  <defs>
                    <marker
                      id="dependency-arrow-marker"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="4.5"
                      markerHeight="4.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" />
                    </marker>
                  </defs>

                  {visibleRows.map(({ task: succTask }, succIndex) => {
                    if (!succTask.dependency) return null;
                    if (dependencyMode === "none") return null;

                    const deps = succTask.dependency.split(",").map((s) => s.trim()).filter(Boolean);
                    if (dependencyMode === "multiple" && deps.length <= 1) return null;

                    return deps.map((depId) => {
                      const predIndex = visibleRows.findIndex((r) => r.task.id === depId);
                      if (predIndex === -1) return null;

                      const predTask = visibleRows[predIndex].task;

                      // Predecessor bar coordinates
                      const predCoords = (() => {
                        if (!predTask.startDate || !predTask.endDate) return null;
                        try {
                          const tStart = parseISO(predTask.startDate);
                          const tEnd = parseISO(predTask.endDate);
                          if (isValid(tStart) && isValid(tEnd)) {
                            let left = differenceInDays(tStart, projectStartDate) * DAY_WIDTH;
                            let width = 0;
                            if (predTask.isMilestone) {
                              width = 14;
                              left = left + (DAY_WIDTH / 2) - 7;
                            } else {
                              width = Math.max(5, differenceInDays(tEnd, tStart) * DAY_WIDTH);
                            }
                            return { left, right: left + width };
                          }
                        } catch {
                          return null;
                        }
                        return null;
                      })();

                      // Successor bar coordinates
                      const succCoords = (() => {
                        if (!succTask.startDate || !succTask.endDate) return null;
                        try {
                          const tStart = parseISO(succTask.startDate);
                          const tEnd = parseISO(succTask.endDate);
                          if (isValid(tStart) && isValid(tEnd)) {
                            let left = differenceInDays(tStart, projectStartDate) * DAY_WIDTH;
                            let width = 0;
                            if (succTask.isMilestone) {
                              width = 14;
                              left = left + (DAY_WIDTH / 2) - 7;
                            } else {
                              width = Math.max(5, differenceInDays(tEnd, tStart) * DAY_WIDTH);
                            }
                            return { left, right: left + width };
                          }
                        } catch {
                          return null;
                        }
                        return null;
                      })();

                      if (!predCoords || !succCoords) return null;

                      // Source point on right end of predecessor bar
                      const x1 = predCoords.right;
                      const y1 = predIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                      // Destination point on left start of successor bar
                      const x2 = succCoords.left;
                      const y2 = succIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                      const isLineHighlighted = hoveredTaskId === predTask.id || hoveredTaskId === succTask.id;

                      const minGap = 12;
                      let pathD = "";

                      if (x2 >= x1 + minGap) {
                        // Standard orthopedic line with minimal turns
                        const midX = x1 + minGap;
                        pathD = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
                      } else {
                        // Backward loopback path for negative offsets or scheduled startup overlap
                        const xFork1 = x1 + minGap;
                        const xFork2 = x2 - minGap;
                        const yMid = y1 + (y2 - y1) / 2;
                        pathD = `M ${x1} ${y1} H ${xFork1} V ${yMid} H ${xFork2} V ${y2} H ${x2}`;
                      }

                      return (
                        <path
                          key={`${predTask.id}-${succTask.id}-${scale}`}
                          d={pathD}
                          fill="none"
                          stroke={isLineHighlighted ? "#4f46e5" : "#a5b4fc"}
                          strokeWidth={isLineHighlighted ? 2.5 : 1.5}
                          strokeOpacity={isLineHighlighted ? 0.95 : 0.55}
                          strokeDasharray={predTask.isGroup || succTask.isGroup ? "3,3" : undefined}
                          markerEnd="url(#dependency-arrow-marker)"
                          className="transition-all duration-150"
                        />
                      );
                    });
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. FOOTER LEGEND AND CONTROLLER HIGHLIGHT */}
      <div className="p-2 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-sans gap-2 select-none shrink-0 border-b border-b-transparent">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>Interactive Grid. Hover over any timeline row or task bar to show detailed sequence specifications. Click any row to edit fields.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-400 text-[8px] font-mono leading-none uppercase">GRID RESOLUTION = {scale}</span>
        </div>
      </div>
    </div>
  );
}
