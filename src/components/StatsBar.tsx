import React from 'react';
import { BlockGroup, TaskStage } from '../types';
import { Search, Filter, CheckCircle2, Clock, Calendar, User } from 'lucide-react';

interface StatsBarProps {
  currentGroup: BlockGroup;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStage: string;
  onStageChange: (stage: string) => void;
  selectedExecutor: string;
  onExecutorChange: (exec: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  executorsList: string[];
}

export const StatsBar: React.FC<StatsBarProps> = ({
  currentGroup,
  searchQuery,
  onSearchChange,
  selectedStage,
  onStageChange,
  selectedExecutor,
  onExecutorChange,
  selectedStatus,
  onStatusChange,
  executorsList,
}) => {
  const totalTasks = currentGroup.tasks.length;
  const completedTasks = currentGroup.tasks.filter(t => t.isCompleted).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalDurationDays = currentGroup.tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0);
  const completedDurationDays = currentGroup.tasks
    .filter(t => t.isCompleted)
    .reduce((sum, t) => sum + (t.durationDays || 0), 0);

  // Group by stages
  const stages: TaskStage[] = ['Эскизный проект', '25%', '50%', '75%', '100%'];
  const stageStats = stages.map(st => {
    const tasksInStage = currentGroup.tasks.filter(t => t.stageGroup === st);
    const doneInStage = tasksInStage.filter(t => t.isCompleted).length;
    return {
      stage: st,
      total: tasksInStage.length,
      done: doneInStage,
      percent: tasksInStage.length > 0 ? Math.round((doneInStage / tasksInStage.length) * 100) : 0
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 space-y-4">
      {/* Top row: Block Title, Lead, and Summary Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentGroup.title}
            </h1>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {currentGroup.subtitle || 'Рабочий проект'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Ведущий архитектор:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {currentGroup.leadArchitect || 'Не назначен'}
            </span>
            <span>·</span>
            <span>Календарный период: 01.10.2026 – 27.11.2026 (12 недель / 56 раб. дней)</span>
          </p>
        </div>

        {/* Metric summary strip with tabular figures */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Выполнено</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {completedTasks} / {totalTasks}{' '}
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Трудоемкость</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {totalDurationDays.toLocaleString('ru-RU')} раб. дн.
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Закрыто трудоемкости</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {completedDurationDays.toLocaleString('ru-RU')} дн.{' '}
              <span className="text-xs font-normal text-slate-500">
                ({totalDurationDays > 0 ? Math.round((completedDurationDays / totalDurationDays) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage mini-stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        {stageStats.map(st => (
          <button
            key={st.stage}
            onClick={() => onStageChange(selectedStage === st.stage ? 'all' : st.stage)}
            className={`text-left p-2 rounded-lg border transition-all ${
              selectedStage === st.stage
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/30'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{st.stage}</span>
              <span className="tabular-nums font-bold text-slate-900 dark:text-white">{st.percent}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${st.percent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
              {st.done} из {st.total} задач
            </div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по наименованию работ, блокам, смежникам..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Стадия:</span>
            <select
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Все стадии</option>
              <option value="Эскизный проект">Эскизный проект</option>
              <option value="25%">25% готовности</option>
              <option value="50%">50% готовности</option>
              <option value="75%">75% готовности</option>
              <option value="100%">100% готовности</option>
            </select>
          </div>

          {/* Executor Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Исполнитель:</span>
            <select
              value={selectedExecutor}
              onChange={(e) => onExecutorChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Все исполнители</option>
              {executorsList.map(exec => (
                <option key={exec} value={exec}>{exec}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Статус:</span>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Все статусы</option>
              <option value="done">Только сделанные (зеленые)</option>
              <option value="todo">В плане / Не сделано</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
