import React, { useState, useMemo, useRef } from 'react';
import { TaskItem, TimelineDay } from '../types';
import { TIMELINE_DAYS } from '../data/timelineDays';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Layers,
  Search,
  Filter,
  Check,
  Zap,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { EXECUTOR_COLORS } from '../data/initialData';

interface GanttViewProps {
  tasks: TaskItem[];
  onToggleTaskComplete: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  blockTitle?: string;
}

type MepFilter = 'all' | 'ov_only' | 'vk_only' | 'mep_all' | 'critical_path';
type StatusFilter = 'all' | 'done' | 'pending' | 'blocked';

export const GanttView: React.FC<GanttViewProps> = ({
  tasks,
  onToggleTaskComplete,
  onEditTask,
  blockTitle,
}) => {
  const [zoomMode, setZoomMode] = useState<'detailed' | 'weeks'>('detailed');
  const [mepFilter, setMepFilter] = useState<MepFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [executorFilter, setExecutorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDependencyLines, setShowDependencyLines] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const dayWidth = zoomMode === 'detailed' ? 32 : 18;
  const rowHeight = 40;
  const totalDays = 56;
  const timelineWidth = totalDays * dayWidth;

  // Weeks grouping: 12 weeks
  const weeks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      weekNum: i + 1,
      days: TIMELINE_DAYS.filter(d => d.weekNumber === i + 1),
    }));
  }, []);

  // All distinct executors in current tasks
  const executors = useMemo(() => {
    const set = new Set<string>();
    (tasks || []).forEach(t => {
      if (t.executor) set.add(t.executor);
    });
    return Array.from(set);
  }, [tasks]);

  // Identify final milestone task
  const finalMilestone = useMemo(() => {
    return (tasks || []).find(t => t.isMilestone || t.name.toLowerCase().includes('распечатка альбома') || t.name.toLowerCase().includes('финальная сдача'));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(q);
        const matchesPred = (task.predecessor || '').toLowerCase().includes(q);
        const matchesSucc = (task.successor || '').toLowerCase().includes(q);
        const matchesExec = (task.executor || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPred && !matchesSucc && !matchesExec) return false;
      }

      // Executor
      if (executorFilter !== 'all' && task.executor !== executorFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'done' && !task.isCompleted) return false;
      if (statusFilter === 'pending' && task.isCompleted) return false;
      if (statusFilter === 'blocked') {
        const hasUnfinishedMep = (task.mepDiscipline && task.mepDiscipline !== 'NONE') || Boolean(task.predecessor);
        if (task.isCompleted || !hasUnfinishedMep) return false;
      }

      // MEP & Critical path filter
      if (mepFilter === 'ov_only') {
        const isOv = task.mepDiscipline === 'OV' || task.mepDiscipline === 'OV_VK' || (task.predecessor && task.predecessor.includes('ОВ'));
        const isFinal = task.isMilestone;
        if (!isOv && !isFinal) return false;
      } else if (mepFilter === 'vk_only') {
        const isVk = task.mepDiscipline === 'VK' || task.mepDiscipline === 'OV_VK' || (task.predecessor && task.predecessor.includes('ВК')) || (task.successor && task.successor.includes('ВК'));
        const isFinal = task.isMilestone;
        if (!isVk && !isFinal) return false;
      } else if (mepFilter === 'mep_all') {
        const isMep = Boolean(task.mepDiscipline && task.mepDiscipline !== 'NONE') || Boolean(task.predecessor) || Boolean(task.successor) || task.isMilestone;
        if (!isMep) return false;
      } else if (mepFilter === 'critical_path') {
        // Critical path leads from OV/VK to holes and to final album
        const isCritical = Boolean(
          task.name.includes('вентшахт') ||
          task.name.includes('Обшивка труб') ||
          task.name.includes('ливневых воронок') ||
          task.name.includes('отверстий') ||
          task.name.includes('шахты') ||
          task.isMilestone
        );
        if (!isCritical) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, executorFilter, statusFilter, mepFilter]);

  // Statistics on MEP dependencies
  const mepStats = useMemo(() => {
    const list = tasks || [];
    const ovTasks = list.filter(t => t.mepDiscipline === 'OV' || t.mepDiscipline === 'OV_VK' || (t.predecessor && t.predecessor.includes('ОВ')));
    const vkTasks = list.filter(t => t.mepDiscipline === 'VK' || t.mepDiscipline === 'OV_VK' || (t.predecessor && t.predecessor.includes('ВК')) || (t.successor && t.successor.includes('ВК')));

    const ovDone = ovTasks.filter(t => t.isCompleted).length;
    const vkDone = vkTasks.filter(t => t.isCompleted).length;

    const blockingTasks = list.filter(t => !t.isCompleted && (t.mepDiscipline === 'OV' || t.mepDiscipline === 'VK' || t.mepDiscipline === 'OV_VK'));

    return {
      ovTotal: ovTasks.length,
      ovDone,
      vkTotal: vkTasks.length,
      vkDone,
      blockingCount: blockingTasks.length,
      isFinalReady: blockingTasks.length === 0,
    };
  }, [tasks]);

  // Build coordinate map for SVG dependency links
  const taskCoordinates = useMemo(() => {
    const coords: Record<string, { xStart: number; xEnd: number; y: number; task: TaskItem }> = {};

    filteredTasks.forEach((t, idx) => {
      const start = Math.max(1, Math.min(56, t.startDay || 1));
      const duration = Math.max(0.5, t.durationDays || 1);
      const end = Math.max(start, Math.min(56, t.endDay || Math.round(start + duration - 0.5)));

      const xStart = (start - 1) * dayWidth;
      const xEnd = (end) * dayWidth;
      const y = idx * rowHeight + rowHeight / 2;

      coords[t.id] = { xStart, xEnd, y, task: t };
    });

    return coords;
  }, [filteredTasks, dayWidth]);

  // Generate SVG dependency curves
  const dependencyLinks = useMemo(() => {
    if (!showDependencyLines) return [];

    const links: Array<{
      id: string;
      fromId: string;
      toId: string;
      path: string;
      isHighlighted: boolean;
      isBlocked: boolean;
      label?: string;
    }> = [];

    // Find links based on dependsOnTaskIds or automatic MEP links
    filteredTasks.forEach(targetTask => {
      const targetCoord = taskCoordinates[targetTask.id];
      if (!targetCoord) return;

      // Check explicit dependsOnTaskIds
      const predIds = targetTask.dependsOnTaskIds || [];

      // Or auto-link MEP tasks to final milestone
      const allPredIds = [...predIds];
      if (targetTask.isMilestone) {
        // Link all hole & shaft tasks to final milestone
        filteredTasks.forEach(ft => {
          if (
            ft.name.includes('отверстий ОВ') ||
            ft.name.includes('отверстий ВК') ||
            ft.name.includes('отверстий ЭОМ') ||
            ft.name.includes('отверстий СС')
          ) {
            if (!allPredIds.includes(ft.id)) {
              allPredIds.push(ft.id);
            }
          }
        });
      }

      // Link shafts to hole tasks of same discipline
      if (targetTask.name.includes('отверстий ОВ')) {
        const shaftTask = filteredTasks.find(ft => ft.name.includes('вентшахт'));
        if (shaftTask && !allPredIds.includes(shaftTask.id)) {
          allPredIds.push(shaftTask.id);
        }
      }

      if (targetTask.name.includes('отверстий ВК')) {
        const pipeTask = filteredTasks.find(ft => ft.name.includes('Обшивка труб') || ft.name.includes('ливневых воронок'));
        if (pipeTask && !allPredIds.includes(pipeTask.id)) {
          allPredIds.push(pipeTask.id);
        }
      }

      allPredIds.forEach(fromId => {
        const sourceCoord = taskCoordinates[fromId];
        if (!sourceCoord) return;

        const x1 = sourceCoord.xEnd;
        const y1 = sourceCoord.y;
        const x2 = targetCoord.xStart;
        const y2 = targetCoord.y;

        // Path with smooth orthogonal curve
        const dx = Math.max(15, (x2 - x1) / 2);
        const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const isHighlighted = selectedTaskId === fromId || selectedTaskId === targetTask.id;
        const isBlocked = !sourceCoord.task.isCompleted;

        links.push({
          id: `${fromId}->${targetTask.id}`,
          fromId,
          toId: targetTask.id,
          path,
          isHighlighted,
          isBlocked,
        });
      });
    });

    return links;
  }, [filteredTasks, taskCoordinates, selectedTaskId, showDependencyLines]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* 1. Header & Live MEP Dependency Status Bar */}
      <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                ГАНТ
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Классическая Диаграмма Ганта с зависимостями ОВ и ВК
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Календарный график разработки проекта: 12 недель (56 рабочих дней). Наглядно отображает влияние заданий ОВ и ВК на выпуск финального альбома.
            </p>
          </div>

          {/* MEP Dependency Readiness Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* OV Status */}
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Задания ОВ:</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold">
                {mepStats.ovDone}/{mepStats.ovTotal} закрыто
              </span>
            </div>

            {/* VK Status */}
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Задания ВК:</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold">
                {mepStats.vkDone}/{mepStats.vkTotal} закрыто
              </span>
            </div>

            {/* Final Release Readiness Alert */}
            <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 font-medium ${
              mepStats.isFinalReady
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}>
              {mepStats.isFinalReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Финальная сдача: Готова к выпуску</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Финальная сдача: Ждет {mepStats.blockingCount} заданий ОВ/ВК</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Interactive Filters Strip */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск задач на Ганте..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Filter Buttons & Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* MEP / Dependency Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setMepFilter('all')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  mepFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Все ({tasks.length})
              </button>
              <button
                onClick={() => setMepFilter('ov_only')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  mepFilter === 'ov_only'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Только работы с зависимостями от Отопления и Вентиляции (ОВ)"
              >
                Зависимости ОВ
              </button>
              <button
                onClick={() => setMepFilter('vk_only')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  mepFilter === 'vk_only'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Только работы с зависимостями от Водопровода и Канализации (ВК)"
              >
                Зависимости ВК
              </button>
              <button
                onClick={() => setMepFilter('critical_path')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  mepFilter === 'critical_path'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Критический путь: ОВ/ВК -> отверстия -> Финальный альбом"
              >
                Критический путь
              </button>
            </div>

            {/* Executor Filter */}
            <select
              value={executorFilter}
              onChange={(e) => setExecutorFilter(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Все исполнители</option>
              {executors.map(exec => (
                <option key={exec} value={exec}>{exec}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Все статусы</option>
              <option value="done">Только выполненные (зеленый)</option>
              <option value="pending">В процессе / В плане</option>
              <option value="blocked">Ждут смежников (ОВ/ВК)</option>
            </select>

            {/* Toggle Dependency Links */}
            <button
              onClick={() => setShowDependencyLines(!showDependencyLines)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showDependencyLines
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
              title="Показать или скрыть стрелки связей между задачами"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Стрелки зависимостей</span>
            </button>

            {/* Zoom Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setZoomMode('detailed')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  zoomMode === 'detailed'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                По дням
              </button>
              <button
                onClick={() => setZoomMode('weeks')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  zoomMode === 'weeks'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                По неделям
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Fixed Grid + Right Gantt Timeline Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Frozen Table Columns */}
        <div className="w-80 md:w-[420px] shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto z-20 bg-white dark:bg-slate-900 shadow-xs">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-[68px] flex items-end px-3 pb-2 font-semibold text-xs text-slate-700 dark:text-slate-300">
            <div className="w-8 text-center">№</div>
            <div className="flex-1 px-2">Наименование работ</div>
            <div className="w-20 text-center">Смежники</div>
            <div className="w-16 text-right pr-2">Дней</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const isMep = Boolean(task.mepDiscipline && task.mepDiscipline !== 'NONE');

              return (
                <div
                  key={task.id}
                  style={{ height: `${rowHeight}px` }}
                  onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                  className={`flex items-center px-3 text-xs transition-colors cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/40'
                      : task.isCompleted
                      ? 'bg-emerald-50/50 hover:bg-emerald-100/40 dark:bg-emerald-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Status checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTaskComplete(task.id);
                    }}
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center mr-2 shrink-0 transition-colors ${
                      task.isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                    }`}
                    title={task.isCompleted ? 'Снять отметку' : 'Отметить как сделано'}
                  >
                    {task.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* № */}
                  <div className="w-7 text-center font-mono text-slate-400 tabular-nums shrink-0">
                    {task.orderNumber}
                  </div>

                  {/* Name */}
                  <div className="flex-1 px-2 truncate font-medium text-slate-800 dark:text-slate-200" title={task.name}>
                    <div className="flex items-center gap-1.5 truncate">
                      {task.isMilestone && (
                        <span className="w-2 h-2 rotate-45 bg-purple-600 inline-block shrink-0" />
                      )}
                      <span className={`truncate ${task.isCompleted ? 'text-emerald-900 dark:text-emerald-100 font-semibold' : ''}`}>
                        {task.name}
                      </span>
                    </div>
                  </div>

                  {/* MEP Badge */}
                  <div className="w-20 text-center shrink-0">
                    {task.mepDiscipline === 'OV' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        от ОВ
                      </span>
                    )}
                    {task.mepDiscipline === 'VK' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
                        {task.successor === 'ВК' ? 'для ВК' : 'от ВК'}
                      </span>
                    )}
                    {task.mepDiscipline === 'OV_VK' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        ОВ + ВК
                      </span>
                    )}
                    {task.mepDiscipline === 'EOM' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">
                        от ЭОМ
                      </span>
                    )}
                    {task.mepDiscipline === 'SS' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        от СС
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="w-16 text-right pr-2 font-mono text-slate-500 tabular-nums shrink-0">
                    {task.durationDays} дн.
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas with Bars and SVG Arrows */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
          <div style={{ width: `${timelineWidth}px` }} className="relative select-none min-h-full">
            {/* Timeline Header (Sticky) */}
            <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-[68px]">
              {/* Weeks Row */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 h-[34px]">
                {weeks.map((w) => {
                  const width = w.days.length * dayWidth;
                  return (
                    <div
                      key={w.weekNum}
                      style={{ width: `${width}px` }}
                      className="border-r border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/90"
                    >
                      Неделя {w.weekNum}
                    </div>
                  );
                })}
              </div>

              {/* Days Row */}
              <div className="flex h-[34px]">
                {TIMELINE_DAYS.map((d) => (
                  <div
                    key={d.dayNumber}
                    style={{ width: `${dayWidth}px` }}
                    className="border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-[10px] text-slate-500 tabular-nums"
                    title={`День ${d.dayNumber}: ${d.dateStr}`}
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{d.dayNumber}</span>
                    {zoomMode === 'detailed' && (
                      <span className="text-[8px] text-slate-400 scale-90 -mt-0.5">
                        {d.dateStr.slice(0, 5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Background Column Dividers */}
            <div className="absolute inset-0 pt-[68px] flex pointer-events-none">
              {TIMELINE_DAYS.map((d) => (
                <div
                  key={d.dayNumber}
                  style={{ width: `${dayWidth}px` }}
                  className={`border-r border-slate-100 dark:border-slate-800/40 h-full ${
                    d.dayNumber % 5 === 0 ? 'border-r-slate-200/80 dark:border-r-slate-700/80' : ''
                  }`}
                />
              ))}
            </div>

            {/* SVG Layer for Dependency Connectors */}
            {showDependencyLines && (
              <svg
                className="absolute inset-0 pt-[68px] pointer-events-none z-10"
                style={{ width: `${timelineWidth}px`, height: `${filteredTasks.length * rowHeight + 68}px` }}
              >
                <defs>
                  {/* Arrowhead marker for normal links */}
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#3b82f6" />
                  </marker>

                  {/* Arrowhead marker for blocked / critical links */}
                  <marker
                    id="arrowhead-blocked"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#f59e0b" />
                  </marker>

                  {/* Arrowhead marker for completed links */}
                  <marker
                    id="arrowhead-done"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#10b981" />
                  </marker>
                </defs>

                {dependencyLinks.map((link) => {
                  let strokeColor = '#3b82f6'; // blue
                  let marker = 'url(#arrowhead)';

                  if (link.isBlocked) {
                    strokeColor = '#f59e0b'; // amber
                    marker = 'url(#arrowhead-blocked)';
                  }

                  if (link.isHighlighted) {
                    strokeColor = '#ef4444'; // red high-contrast for selected
                    marker = 'url(#arrowhead-blocked)';
                  }

                  return (
                    <path
                      key={link.id}
                      d={link.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={link.isHighlighted ? 2.5 : 1.5}
                      strokeDasharray={link.isBlocked ? '3,3' : 'none'}
                      markerEnd={marker}
                      opacity={link.isHighlighted ? 1 : 0.65}
                    />
                  );
                })}
              </svg>
            )}

            {/* Task Bars Layer */}
            <div className="relative divide-y divide-slate-100 dark:divide-slate-800 z-10">
              {filteredTasks.map((task, idx) => {
                const start = Math.max(1, Math.min(56, task.startDay || 1));
                const duration = Math.max(0.5, task.durationDays || 1);
                const end = Math.max(start, Math.min(56, task.endDay || Math.round(start + duration - 0.5)));
                const barLeft = (start - 1) * dayWidth;
                const barWidth = Math.max(dayWidth * 0.8, (end - start + 1) * dayWidth);

                const isSelected = selectedTaskId === task.id;
                const isMilestone = task.isMilestone;

                // Color coding logic
                let barColor = 'bg-blue-600 hover:bg-blue-700 text-white';
                if (task.isCompleted) {
                  barColor = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs';
                } else if (task.mepDiscipline === 'OV') {
                  barColor = 'bg-amber-600 hover:bg-amber-700 text-white';
                } else if (task.mepDiscipline === 'VK') {
                  barColor = 'bg-cyan-600 hover:bg-cyan-700 text-white';
                } else if (task.mepDiscipline === 'OV_VK') {
                  barColor = 'bg-purple-600 hover:bg-purple-700 text-white';
                }

                return (
                  <div
                    key={task.id}
                    style={{ height: `${rowHeight}px` }}
                    className={`relative flex items-center transition-colors ${
                      isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Milestone Diamond or Standard Bar */}
                    {isMilestone ? (
                      <div
                        style={{
                          left: `${barLeft + barWidth / 2 - 14}px`,
                        }}
                        onClick={() => {
                          setSelectedTaskId(isSelected ? null : task.id);
                          onToggleTaskComplete(task.id);
                        }}
                        className={`absolute w-7 h-7 rotate-45 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-md ${
                          task.isCompleted ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white animate-pulse'
                        }`}
                        title={`${task.name}\nВЕХА: Финальная сдача проекта!\nЗависит от выдачи заданий ОВ и ВК\nДень: 56 (27.11.2026)\nСтатус: ${task.isCompleted ? 'Сдано' : 'Ожидает смежников'}`}
                      >
                        <div className="-rotate-45 text-[10px] font-bold">
                          {task.isCompleted ? '✓' : '★'}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          left: `${barLeft}px`,
                          width: `${barWidth}px`,
                        }}
                        onClick={() => {
                          setSelectedTaskId(isSelected ? null : task.id);
                          onToggleTaskComplete(task.id);
                        }}
                        onDoubleClick={() => onEditTask(task)}
                        className={`absolute h-7 rounded-md px-2 flex items-center justify-between text-[11px] font-medium shadow-2xs cursor-pointer transition-all duration-150 hover:brightness-110 ${barColor} ${
                          isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                        }`}
                        title={`${task.name}\nИсполнитель: ${task.executor}\nДлительность: ${task.durationDays} дн.\nПериод: дни ${start}..${end}\n${task.predecessor ? `Задание от: ${task.predecessor}\n` : ''}${task.notes ? `Заметка: ${task.notes}\n` : ''}Клик: сменить статус на "Сделано"`}
                      >
                        <span className="truncate pr-1">
                          {task.name}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {task.mepDiscipline && task.mepDiscipline !== 'NONE' && (
                            <span className="text-[9px] bg-black/20 px-1 py-0.2 rounded font-mono">
                              {task.mepDiscipline.replace('_', '+')}
                            </span>
                          )}
                          {task.isCompleted && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Legend & Dependency Guide */}
      <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Обозначения на Ганте:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
            <span>Выполнено (Сделано)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" />
            <span>Задание от ОВ (Вентшахты, отверстия)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-cyan-600 inline-block" />
            <span>Связь с ВК (Трубы, воронки, отверстия)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-purple-600 inline-block" />
            <span>Финальная веха сдачи (Альбом)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-500 border-dashed inline-block" />
            <span>Пунктирная стрелка: блокирующая зависимость</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          * Клик по полосе переключает статус «Сделано» (зеленый). Клик по задаче подсвечивает цепочку связей.
        </div>
      </div>
    </div>
  );
};
