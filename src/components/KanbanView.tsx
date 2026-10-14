import React from 'react';
import { TaskItem } from '../types';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, User } from 'lucide-react';
import { EXECUTOR_COLORS } from '../data/initialData';

interface KanbanViewProps {
  tasks: TaskItem[];
  onToggleTaskComplete: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  onToggleTaskComplete,
  onEditTask,
}) => {
  // Categorize tasks into 4 kanban lanes
  const completedTasks = tasks.filter(t => t.isCompleted);
  const dependentTasks = tasks.filter(t => !t.isCompleted && (t.predecessor || t.name.includes('отверстий') || t.name.includes('шахты')));
  const inProgressTasks = tasks.filter(t => !t.isCompleted && !dependentTasks.includes(t) && (parseFloat(t.orderNumber) <= 15));
  const todoTasks = tasks.filter(t => !t.isCompleted && !dependentTasks.includes(t) && !inProgressTasks.includes(t));

  const columns = [
    { id: 'todo', title: 'К выполнению', badgeColor: 'bg-slate-200 text-slate-700', tasks: todoTasks, icon: Clock },
    { id: 'in_progress', title: 'В разработке', badgeColor: 'bg-blue-100 text-blue-800', tasks: inProgressTasks, icon: Clock },
    { id: 'dependencies', title: 'Смежные разделы (ОВ / ВК / КЖ / ЭОМ)', badgeColor: 'bg-amber-100 text-amber-800', tasks: dependentTasks, icon: AlertCircle },
    { id: 'done', title: 'Выполнено (Сделано)', badgeColor: 'bg-emerald-100 text-emerald-800', tasks: completedTasks, icon: CheckCircle2 },
  ];

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-slate-50 dark:bg-slate-950">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 min-w-[1000px]">
        {columns.map(col => {
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className="flex flex-col bg-slate-100/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 max-h-[calc(100vh-270px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.title}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${col.badgeColor}`}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {col.tasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Нет задач в этой колонке
                  </div>
                ) : (
                  col.tasks.map(task => {
                    const executorStyle = EXECUTOR_COLORS[task.executor] || {
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    };

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border bg-white dark:bg-slate-800/90 shadow-2xs transition-all hover:shadow-xs group ${
                          task.isCompleted
                            ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {task.orderNumber}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                            {task.stageCode || task.stageGroup}
                          </span>
                        </div>

                        <h4
                          onClick={() => onEditTask(task)}
                          className={`text-xs font-semibold mt-1 cursor-pointer hover:underline ${
                            task.isCompleted
                              ? 'text-emerald-900 dark:text-emerald-200 line-through decoration-emerald-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.name}
                        </h4>

                        {task.predecessor && (
                          <div className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <span className="font-medium">Задание от:</span>
                            <span className="bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded font-mono text-[10px]">
                              {task.predecessor}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${executorStyle.bg} ${executorStyle.text}`}>
                              {task.executor}
                            </span>
                            <span className="text-slate-400 tabular-nums">
                              {task.durationDays} дн.
                            </span>
                          </div>

                          <button
                            onClick={() => onToggleTaskComplete(task.id)}
                            className={`p-1 rounded text-xs transition-colors flex items-center gap-1 ${
                              task.isCompleted
                                ? 'text-emerald-600 hover:bg-emerald-100/50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={task.isCompleted ? 'Снять отметку' : 'Отметить как сделано'}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${task.isCompleted ? 'text-emerald-600' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
