import React, { useState, useEffect } from 'react';
import { TaskItem, TaskStage } from '../types';
import { X, Check } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskItem) => void;
  initialTask?: TaskItem | null;
  availableExecutors: string[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  availableExecutors,
}) => {
  const [formData, setFormData] = useState<Partial<TaskItem>>({
    orderNumber: '',
    name: '',
    stageGroup: '25%',
    stageCode: '25%',
    targetBlocks: 'Блоки 1-4',
    executor: availableExecutors[0] || 'Алихан',
    isCompleted: false,
    statusText: 'В плане',
    predecessor: '',
    successor: '',
    responsible: availableExecutors[0] || 'Алихан',
    durationDays: 1,
    startDay: 1,
    endDay: 2,
    notes: '',
  });

  useEffect(() => {
    if (initialTask) {
      setFormData(initialTask);
    } else {
      setFormData({
        orderNumber: '',
        name: '',
        stageGroup: '25%',
        stageCode: '25%',
        targetBlocks: 'Блоки 1-4',
        executor: availableExecutors[0] || 'Алихан',
        isCompleted: false,
        statusText: 'В плане',
        predecessor: '',
        successor: '',
        responsible: availableExecutors[0] || 'Алихан',
        durationDays: 1,
        startDay: 1,
        endDay: 2,
        notes: '',
      });
    }
  }, [initialTask, isOpen, availableExecutors]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const task: TaskItem = {
      id: formData.id || `task-${Date.now()}`,
      orderNumber: formData.orderNumber || '1.',
      name: formData.name.trim(),
      stageGroup: (formData.stageGroup as TaskStage) || '25%',
      stageCode: formData.stageCode || (formData.stageGroup as string) || '25%',
      targetBlocks: formData.targetBlocks || 'Блоки 1-4',
      executor: formData.executor || 'Алихан',
      isCompleted: Boolean(formData.isCompleted),
      statusText: formData.isCompleted ? 'Сделано' : (formData.statusText || 'В плане'),
      predecessor: formData.predecessor || '',
      successor: formData.successor || '',
      responsible: formData.responsible || formData.executor || 'Алихан',
      durationDays: Number(formData.durationDays) || 1,
      startDay: Number(formData.startDay) || 1,
      endDay: Number(formData.endDay) || 2,
      notes: formData.notes || '',
    };

    onSave(task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {initialTask ? 'Редактировать задачу' : 'Добавить новую задачу'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                № задачи
              </label>
              <input
                type="text"
                value={formData.orderNumber || ''}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                placeholder="напр. 15."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Стадия готовности
              </label>
              <select
                value={formData.stageGroup || '25%'}
                onChange={(e) => {
                  const val = e.target.value as TaskStage;
                  setFormData({ ...formData, stageGroup: val, stageCode: val });
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Эскизный проект">Эскизный проект</option>
                <option value="25%">25% готовности</option>
                <option value="50%">50% готовности</option>
                <option value="75%">75% готовности</option>
                <option value="100%">100% готовности</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Наименование работ *
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="напр. Расставление стен и перегородок"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                К каким блокам относится
              </label>
              <input
                type="text"
                value={formData.targetBlocks || ''}
                onChange={(e) => setFormData({ ...formData, targetBlocks: e.target.value })}
                placeholder="Блоки 1-4"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Исполнитель
              </label>
              <input
                type="text"
                list="executors-list"
                value={formData.executor || ''}
                onChange={(e) => setFormData({ ...formData, executor: e.target.value, responsible: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <datalist id="executors-list">
                {availableExecutors.map(exec => (
                  <option key={exec} value={exec} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Длительность (дней)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.durationDays || 1}
                onChange={(e) => setFormData({ ...formData, durationDays: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                День старта (1-56)
              </label>
              <input
                type="number"
                min="1"
                max="56"
                value={formData.startDay || 1}
                onChange={(e) => setFormData({ ...formData, startDay: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                День завершения
              </label>
              <input
                type="number"
                min="1"
                max="56"
                value={formData.endDay || 2}
                onChange={(e) => setFormData({ ...formData, endDay: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Предшественник (от)
              </label>
              <input
                type="text"
                value={formData.predecessor || ''}
                onChange={(e) => setFormData({ ...formData, predecessor: e.target.value })}
                placeholder="напр. от ГИПа, ОВ, ВК, КЖ"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Последователи (для)
              </label>
              <input
                type="text"
                value={formData.successor || ''}
                onChange={(e) => setFormData({ ...formData, successor: e.target.value })}
                placeholder="напр. для АР, для всех"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Status Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <input
                type="checkbox"
                checked={Boolean(formData.isCompleted)}
                onChange={(e) => setFormData({ ...formData, isCompleted: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Отметить как сделано (подсветить зеленым)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              Сохранить задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
