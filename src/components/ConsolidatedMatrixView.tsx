import React, { useState, useMemo } from 'react';
import { BlockGroup, TaskItem, TaskStage } from '../types';
import { Check, CheckCircle2, Users, Layers, Filter, Eye, ChevronDown, ChevronRight, Zap, CheckSquare, GitBranch } from 'lucide-react';
import { EXECUTOR_COLORS } from '../data/initialData';

interface ConsolidatedMatrixViewProps {
  groups: BlockGroup[];
  onToggleMatrixTask: (groupId: string, taskId: string) => void;
  onBulkSetRowStatus?: (taskName: string, completed: boolean) => void;
  onSwitchToGantt?: () => void;
}

export const ConsolidatedMatrixView: React.FC<ConsolidatedMatrixViewProps> = ({
  groups,
  onToggleMatrixTask,
  onBulkSetRowStatus,
  onSwitchToGantt,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'incomplete' | 'mep_only'>('all');
  const [viewDensity, setViewDensity] = useState<'compact' | 'detailed'>('compact');
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});

  // 1. Автоматический расчет загрузки и распределения по исполнителям
  const executorStats = useMemo(() => {
    const stats: Record<string, { totalDays: number; completedDays: number; totalTasks: number; completedTasks: number }> = {};

    (groups || []).forEach(group => {
      (group.tasks || []).forEach(task => {
        const exec = task.executor || 'Не назначен';
        if (!stats[exec]) {
          stats[exec] = { totalDays: 0, completedDays: 0, totalTasks: 0, completedTasks: 0 };
        }
        const days = task.durationDays || 0;
        stats[exec].totalDays += days;
        stats[exec].totalTasks += 1;
        if (task.isCompleted) {
          stats[exec].completedDays += days;
          stats[exec].completedTasks += 1;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        totalDays: Math.round(data.totalDays * 10) / 10,
        completedDays: Math.round(data.completedDays * 10) / 10,
        totalTasks: data.totalTasks,
        completedTasks: data.completedTasks,
        percent: data.totalDays > 0 ? Math.round((data.completedDays / data.totalDays) * 100) : 0,
      }))
      .sort((a, b) => b.totalDays - a.totalDays);
  }, [groups]);

  // Master task definitions
  const masterTasks = useMemo(() => {
    const list: Array<{
      orderNumber: string;
      name: string;
      stageCode: string;
      stageGroup: TaskStage;
      isMep: boolean;
    }> = [];

    const seen = new Set<string>();
    const tasksToScan = (groups && groups[0] && groups[0].tasks) ? groups[0].tasks : [];
    tasksToScan.forEach(t => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        const isMep = Boolean(
          t.name.toLowerCase().includes('сс') ||
          t.name.toLowerCase().includes('ов') ||
          t.name.toLowerCase().includes('вк') ||
          t.name.toLowerCase().includes('эом') ||
          t.name.toLowerCase().includes('отверстий') ||
          t.name.toLowerCase().includes('шахт') ||
          t.predecessor === 'ОВ' ||
          t.predecessor === 'ВК' ||
          t.predecessor === 'СС' ||
          t.predecessor === 'ЭОМ'
        );
        list.push({
          orderNumber: t.orderNumber,
          name: t.name,
          stageCode: t.stageCode,
          stageGroup: t.stageGroup,
          isMep,
        });
      }
    });

    return list;
  }, [groups]);

  // Stages grouping
  const stages: TaskStage[] = ['Эскизный проект', '25%', '50%', '75%', '100%'];

  const toggleStageCollapse = (stage: string) => {
    setCollapsedStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  // Filtered task rows
  const filteredTasksByStage = useMemo(() => {
    return stages.map(stage => {
      let tasks = masterTasks.filter(t => t.stageGroup === stage);

      if (filterMode === 'mep_only') {
        tasks = tasks.filter(t => t.isMep);
      } else if (filterMode === 'incomplete') {
        // Only tasks that have at least one block not completed
        tasks = tasks.filter(t => {
          return groups.some(g => {
            const match = g.tasks.find(item => item.name === t.name);
            return match && !match.isCompleted;
          });
        });
      }

      return {
        stage,
        tasks,
      };
    });
  }, [masterTasks, filterMode, groups]);

  // Overall totals across all blocks
  const overallTotals = useMemo(() => {
    let totalAllDays = 0;
    let completedAllDays = 0;
    let totalAllTasks = 0;
    let completedAllTasks = 0;

    (groups || []).forEach(g => {
      (g.tasks || []).forEach(t => {
        totalAllDays += t.durationDays || 0;
        totalAllTasks += 1;
        if (t.isCompleted) {
          completedAllDays += t.durationDays || 0;
          completedAllTasks += 1;
        }
      });
    });

    return {
      totalAllDays: Math.round(totalAllDays * 10) / 10,
      completedAllDays: Math.round(completedAllDays * 10) / 10,
      totalAllTasks,
      completedAllTasks,
      overallPercent: totalAllDays > 0 ? Math.round((completedAllDays / totalAllDays) * 100) : 0,
    };
  }, [groups]);

  // Quick action: mark all blocks for a task as complete
  const handleBulkComplete = (taskName: string) => {
    (groups || []).forEach(g => {
      const match = (g.tasks || []).find(t => t.name === taskName);
      if (match && !match.isCompleted) {
        onToggleMatrixTask(g.id, match.id);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* 1. Автоматическая панель суммирования распределения задач */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded">
                СС
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Сводная Сетка (СС) — Контроль готовности и распределение нагрузки
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Автоматическое суммирование трудоемкости по проектировщикам, контроль этапов и сквозной мониторинг по всем 11 блокам.
            </p>
          </div>

          {/* Quick View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Mode */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Все задачи ({masterTasks.length})
              </button>
              <button
                onClick={() => setFilterMode('incomplete')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'incomplete'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Только отстающие
              </button>
              <button
                onClick={() => setFilterMode('mep_only')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'mep_only'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                СС / ОВ / ВК / ЭОМ
              </button>
            </div>

            {/* Density Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setViewDensity('compact')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewDensity === 'compact'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Компактно
              </button>
              <button
                onClick={() => setViewDensity('detailed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewDensity === 'detailed'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Подробно
              </button>
            </div>

            {onSwitchToGantt && (
              <button
                onClick={onSwitchToGantt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800 shrink-0"
                title="Перейти к классической диаграмме Ганта со стрелками зависимостей ОВ и ВК"
              >
                <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                <span>Гант с зависимостями ОВ/ВК</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Виджет автоматического распределения задач по исполнителям (Workload Balancer) */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Автоматическое суммирование трудоемкости по команде (все блоки):</span>
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              Общий объем: {overallTotals.totalAllDays} раб. дн. · Закрыто: {overallTotals.completedAllDays} дн. ({overallTotals.overallPercent}%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {executorStats.slice(0, 6).map(stat => {
              const colors = EXECUTOR_COLORS[stat.name] || {
                bg: 'bg-slate-100',
                text: 'text-slate-700',
                border: 'border-slate-200',
              };

              return (
                <div
                  key={stat.name}
                  className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    <span className="truncate">{stat.name}</span>
                    <span className="text-[10px] tabular-nums font-mono text-emerald-600 dark:text-emerald-400">
                      {stat.percent}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden my-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                    <span>{stat.completedDays} из {stat.totalDays} дн.</span>
                    <span>{stat.completedTasks}/{stat.totalTasks} зад.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Матрица СС со строками задач и столбцами блоков */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] border-b border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-30 shadow-2xs text-slate-700 dark:text-slate-300">
            <tr>
              <th className="py-2.5 px-2 w-12 text-center border-b border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800 z-40">
                №
              </th>
              <th className="py-2.5 px-3 min-w-[280px] border-b border-r border-slate-200 dark:border-slate-700 sticky left-12 bg-slate-100 dark:bg-slate-800 z-40">
                Наименование работ
              </th>
              <th className="py-2.5 px-2 text-center w-28 border-b border-r border-slate-200 dark:border-slate-700 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                Сводный %
              </th>

              {/* 11 Block Headers */}
              {groups.map(group => {
                const doneCount = group.tasks.filter(t => t.isCompleted).length;
                const totalCount = group.tasks.length;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                return (
                  <th
                    key={group.id}
                    className="py-2.5 px-2 text-center min-w-[90px] border-b border-r border-slate-200 dark:border-slate-700 font-medium"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white truncate" title={group.title}>
                      {group.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pct}%</span> ({doneCount}/{totalCount})
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body with Stages Collapsible Groups */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasksByStage.map(({ stage, tasks }) => {
              if (tasks.length === 0) return null;
              const isCollapsed = Boolean(collapsedStages[stage]);

              // Calculate stage completion across all blocks
              let stageTotalUnits = 0;
              let stageDoneUnits = 0;
              tasks.forEach(t => {
                groups.forEach(g => {
                  const match = g.tasks.find(item => item.name === t.name);
                  if (match) {
                    stageTotalUnits++;
                    if (match.isCompleted) stageDoneUnits++;
                  }
                });
              });
              const stagePct = stageTotalUnits > 0 ? Math.round((stageDoneUnits / stageTotalUnits) * 100) : 0;

              return (
                <React.Fragment key={stage}>
                  {/* Stage Separator Row */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 sticky z-20 font-semibold border-y border-slate-200 dark:border-slate-700">
                    <td
                      colSpan={3 + groups.length}
                      className="py-2 px-3 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors"
                      onClick={() => toggleStageCollapse(stage)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          <span className="font-bold text-xs">
                            {stage === 'Эскизный проект' ? 'Раздел 1. Эскизный проект (Предпроект)' : `Стадия готовности ${stage}`}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500">
                            ({tasks.length} работ)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500 font-normal">
                            Готовность этапа по всем блокам:
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {stagePct}% ({stageDoneUnits}/{stageTotalUnits})
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Task Rows under Stage */}
                  {!isCollapsed && tasks.map((master) => {
                    // Calculate completion across 11 blocks for this single task
                    const blockMatches = groups.map(g => ({
                      group: g,
                      task: g.tasks.find(item => item.name === master.name)
                    }));
                    const completedInBlocks = blockMatches.filter(b => b.task?.isCompleted).length;
                    const totalBlocksWithTask = blockMatches.filter(b => b.task).length;
                    const rowPct = totalBlocksWithTask > 0 ? Math.round((completedInBlocks / totalBlocksWithTask) * 100) : 0;

                    return (
                      <tr key={master.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                        {/* 1. № */}
                        <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-10">
                          {master.orderNumber}
                        </td>

                        {/* 2. Task Name */}
                        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 sticky left-12 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 z-10">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              {master.isMep && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  СМЕЖНИКИ
                                </span>
                              )}
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={master.name}>
                                {master.name}
                              </span>
                            </div>

                            {/* Bulk Action Icon */}
                            <button
                              onClick={() => handleBulkComplete(master.name)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition-opacity rounded shrink-0"
                              title="Отметить выполненным во всех 11 блоках"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 3. Row Completion Total Column */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                          <div className="flex flex-col items-center">
                            <span className={`text-[11px] font-bold tabular-nums ${rowPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {completedInBlocks}/{totalBlocksWithTask}
                            </span>
                            <div className="w-12 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${rowPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Columns for 11 Block Groups */}
                        {groups.map(group => {
                          const matchingTask = group.tasks.find(t => t.name === master.name);
                          if (!matchingTask) {
                            return (
                              <td key={group.id} className="py-2 px-1 text-center text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                —
                              </td>
                            );
                          }

                          const isDone = matchingTask.isCompleted;

                          return (
                            <td
                              key={group.id}
                              onClick={() => onToggleMatrixTask(group.id, matchingTask.id)}
                              className={`py-2 px-1.5 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                                isDone
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                              }`}
                              title={`${matchingTask.name}\nБлок: ${group.title}\nИсполнитель: ${matchingTask.executor}\nДлительность: ${matchingTask.durationDays} дн.\nСтатус: ${isDone ? 'Сделано' : 'Не сделано'}\n(Нажмите для смены статуса)`}
                            >
                              {viewDensity === 'compact' ? (
                                <div className="flex items-center justify-center">
                                  <div
                                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-all ${
                                      isDone
                                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                        : 'border border-slate-300 dark:border-slate-600 text-slate-300 hover:border-emerald-500'
                                    }`}
                                  >
                                    {isDone ? '✓' : ''}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center leading-tight">
                                  {isDone ? (
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                      Сделано ✓
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[75px]">
                                        {matchingTask.executor?.split(',')[0]}
                                      </span>
                                      <span className="text-[9px] text-slate-400 tabular-nums">
                                        {matchingTask.durationDays} дн.
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Sticky Footer: Marginal Totals per Block */}
          <tfoot className="bg-slate-100 dark:bg-slate-800 sticky bottom-0 z-30 font-semibold border-t-2 border-slate-300 dark:border-slate-600 shadow-lg">
            <tr>
              <td colSpan={2} className="py-3 px-4 sticky left-0 bg-slate-100 dark:bg-slate-800 z-40 text-slate-900 dark:text-white">
                <div className="flex items-center justify-between">
                  <span>ИТОГО ПО ВСЕМ БЛОКАМ:</span>
                  <span className="text-xs text-slate-500 font-normal">
                    Всего {overallTotals.totalAllTasks} задач ({overallTotals.totalAllDays} раб. дн.)
                  </span>
                </div>
              </td>
              <td className="py-3 px-2 text-center text-emerald-700 dark:text-emerald-400 font-bold tabular-nums bg-emerald-50 dark:bg-emerald-950/30 border-r border-slate-200">
                {overallTotals.overallPercent}%
              </td>

              {/* Totals column by each block */}
              {groups.map(group => {
                const blockTotalDays = group.tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0);
                const blockDoneDays = group.tasks.filter(t => t.isCompleted).reduce((sum, t) => sum + (t.durationDays || 0), 0);
                const blockDoneCount = group.tasks.filter(t => t.isCompleted).length;
                const pct = group.tasks.length > 0 ? Math.round((blockDoneCount / group.tasks.length) * 100) : 0;

                return (
                  <td key={group.id} className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {pct}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal tabular-nums">
                      {blockDoneDays}/{blockTotalDays} дн.
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
