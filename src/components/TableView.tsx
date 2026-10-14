import React, { useState } from 'react';
import { TaskItem } from '../types';
import { Check, Edit2, Trash2, ArrowUpDown, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import { EXECUTOR_COLORS } from '../data/initialData';

interface TableViewProps {
  tasks: TaskItem[];
  onToggleTaskComplete: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onQuickUpdateDuration: (taskId: string, duration: number) => void;
  onQuickUpdateExecutor: (taskId: string, executor: string) => void;
  availableExecutors: string[];
  onUpdateOrderNumber?: (taskId: string, orderNumber: string) => void;
  onMoveTask?: (taskId: string, direction: 'up' | 'down') => void;
}

type SortField = 'orderNumber' | 'name' | 'stageGroup' | 'executor' | 'durationDays' | 'isCompleted';

export const TableView: React.FC<TableViewProps> = ({
  tasks,
  onToggleTaskComplete,
  onEditTask,
  onDeleteTask,
  onQuickUpdateDuration,
  onQuickUpdateExecutor,
  availableExecutors,
  onUpdateOrderNumber,
  onMoveTask,
}) => {
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'durationDays') {
      comparison = a.durationDays - b.durationDays;
    } else if (sortField === 'isCompleted') {
      comparison = (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0);
    } else if (sortField === 'orderNumber') {
      const numA = parseFloat(a.orderNumber) || 0;
      const numB = parseFloat(b.orderNumber) || 0;
      comparison = numA - numB;
    } else {
      comparison = (a[sortField] || '').localeCompare(b[sortField] || '', 'ru');
    }
    return sortAsc ? comparison : -comparison;
  });

  const totalDuration = tasks.reduce((sum, t) => sum + (t.durationDays || 0), 0);
  const completedDuration = tasks.filter(t => t.isCompleted).reduce((sum, t) => sum + (t.durationDays || 0), 0);

  const startEditDuration = (task: TaskItem) => {
    setEditingDurationId(task.id);
    setDurationInput(task.durationDays.toString());
  };

  const saveDuration = (taskId: string) => {
    const val = parseFloat(durationInput.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      onQuickUpdateDuration(taskId, val);
    }
    setEditingDurationId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* Table scroll container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] border-b border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header */}
          <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold shadow-2xs">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">
                <button
                  onClick={() => handleSort('isCompleted')}
                  className="flex items-center justify-center gap-1 hover:text-slate-900 mx-auto"
                  title="Сортировать по статусу выполнения"
                >
                  <span>Статус</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-2 w-24 text-center">
                <button
                  onClick={() => handleSort('orderNumber')}
                  className="flex items-center justify-center gap-1 hover:text-slate-900 mx-auto"
                  title="Номер задачи и порядок"
                >
                  <span>№ Порядок</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-3 w-28">
                <button
                  onClick={() => handleSort('stageGroup')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Стадия</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-4 min-w-[260px]">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Наименование работ</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-3 min-w-[120px]">К каким блокам относится</th>
              <th className="py-2.5 px-3 min-w-[130px]">
                <button
                  onClick={() => handleSort('executor')}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Исполнитель</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-3 min-w-[120px]">Предшественник (от)</th>
              <th className="py-2.5 px-3 min-w-[120px]">Последователи (для)</th>
              <th className="py-2.5 px-3 min-w-[110px]">Ответственный</th>
              <th className="py-2.5 px-3 text-right w-28">
                <button
                  onClick={() => handleSort('durationDays')}
                  className="flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                >
                  <span>Длительность</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-center w-20">Действия</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-medium">Задачи не найдены</p>
                    <p className="text-xs">Попробуйте изменить параметры поиска или фильтрации</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTasks.map((task, index) => {
                const isCompleted = task.isCompleted;
                const executorStyle = EXECUTOR_COLORS[task.executor] || {
                  bg: 'bg-slate-100 dark:bg-slate-800',
                  text: 'text-slate-700 dark:text-slate-300',
                  border: 'border-slate-200'
                };

                return (
                  <tr
                    key={task.id}
                    className={`transition-colors group ${
                      isCompleted
                        ? 'bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Status Checkbox / Indicator (Green when completed per requirement) */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onToggleTaskComplete(task.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mx-auto ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-slate-800'
                        }`}
                        title={isCompleted ? 'Отмечено как сделано. Нажмите, чтобы снять' : 'Отметить как сделано'}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    </td>

                    {/* Order Number & Move Up/Down ("нумерация задач должна быть редактируема (1 столбец) и задачи нужно иметь возможность перемещать вверх и вниз") */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={task.orderNumber}
                          onChange={e => onUpdateOrderNumber ? onUpdateOrderNumber(task.id, e.target.value) : undefined}
                          className="w-11 text-center font-mono font-bold text-xs py-0.5 px-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400 focus:border-blue-500 focus:outline-hidden"
                          title="Редактировать номер задачи"
                        />
                        {onMoveTask && (
                          <div className="flex flex-col -space-y-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onMoveTask(task.id, 'up')}
                              disabled={index === 0}
                              className={`p-0.5 rounded transition ${
                                index === 0
                                  ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                  : 'text-slate-400 hover:text-blue-600'
                              }`}
                              title="Переместить задачу вверх"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveTask(task.id, 'down')}
                              disabled={index === sortedTasks.length - 1}
                              className={`p-0.5 rounded transition ${
                                index === sortedTasks.length - 1
                                  ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                  : 'text-slate-400 hover:text-blue-600'
                              }`}
                              title="Переместить задачу вниз"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Stage Group */}
                    <td className="py-2 px-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        task.stageGroup === 'Эскизный проект'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                          : task.stageGroup === '25%'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : task.stageGroup === '50%'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : task.stageGroup === '75%'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}>
                        {task.stageCode || task.stageGroup}
                      </span>
                    </td>

                    {/* Task Name */}
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span className={`font-medium ${
                          isCompleted
                            ? 'text-emerald-900 dark:text-emerald-100'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {task.name}
                        </span>
                        {task.notes && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {task.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Target Blocks */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {task.targetBlocks || '—'}
                    </td>

                    {/* Executor */}
                    <td className="py-2 px-3">
                      <select
                        value={task.executor}
                        onChange={(e) => onQuickUpdateExecutor(task.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden font-medium cursor-pointer ${executorStyle.text}`}
                      >
                        {availableExecutors.map(exec => (
                          <option key={exec} value={exec}>{exec}</option>
                        ))}
                      </select>
                    </td>

                    {/* Predecessor */}
                    <td className="py-2 px-3 text-slate-500">
                      {task.predecessor ? (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          {task.predecessor}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Successor */}
                    <td className="py-2 px-3 text-slate-500">
                      {task.successor ? (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          {task.successor}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Responsible */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-medium">
                      {task.responsible || '—'}
                    </td>

                    {/* Duration in Days */}
                    <td className="py-2 px-3 text-right">
                      {editingDurationId === task.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            value={durationInput}
                            onChange={(e) => setDurationInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveDuration(task.id)}
                            onBlur={() => saveDuration(task.id)}
                            autoFocus
                            className="w-14 text-right py-0.5 px-1 text-xs border rounded bg-white dark:bg-slate-800 border-emerald-500 tabular-nums"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditDuration(task)}
                          className="hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-0.5 rounded font-mono tabular-nums text-slate-700 dark:text-slate-300 transition-colors"
                          title="Нажмите для изменения длительности"
                        >
                          {task.durationDays} дн.
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                          title="Редактировать задачу"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Удалить задачу"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Total Summary Row */}
          <tfoot className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white sticky bottom-0 z-20 border-t-2 border-slate-300 dark:border-slate-600">
            <tr>
              <td colSpan={4} className="py-3 px-4">
                <div className="flex items-center gap-4">
                  <span>Итого по текущему виду:</span>
                  <span className="text-xs text-slate-500 font-normal">
                    Всего задач: {tasks.length} · Закрыто: {tasks.filter(t => t.isCompleted).length}
                  </span>
                </div>
              </td>
              <td colSpan={5} className="py-3 px-3 text-right text-xs text-slate-500 font-normal">
                Закрытая трудоемкость: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{completedDuration} дн.</strong>
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-sm text-slate-900 dark:text-white">
                {totalDuration} дн.
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
