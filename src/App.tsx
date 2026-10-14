import React, { useState, useEffect, useMemo } from 'react';
import { BlockGroup, TaskItem, TaskStage } from './types';
import { INITIAL_BLOCK_GROUPS } from './data/initialData';
import { Header, ActiveTab } from './components/Header';
import { BlockTabs } from './components/BlockTabs';
import { StatsBar } from './components/StatsBar';
import { TableView } from './components/TableView';
import { GanttView } from './components/GanttView';
import { KanbanView } from './components/KanbanView';
import { ConsolidatedMatrixView } from './components/ConsolidatedMatrixView';
import { TaskModal } from './components/TaskModal';
import { CsvModal } from './components/CsvModal';
import { SSTabView } from './components/SSTabView';
import { ReadOnlyDisciplineView } from './components/ReadOnlyDisciplineView';

const STORAGE_KEY = 'ar_schedule_blocks_v2';

export default function App() {
  const [blockGroups, setBlockGroups] = useState<BlockGroup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.tasks && Array.isArray(parsed[0].tasks)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_BLOCK_GROUPS;
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(blockGroups[0]?.id || 'block_1_12_27');
  const [activeTab, setActiveTab] = useState<ActiveTab>('ss');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedExecutor, setSelectedExecutor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isAddSsModalOpen, setIsAddSsModalOpen] = useState<boolean>(false);

  // Sync to local storage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blockGroups));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }, [blockGroups]);

  // Current active block group
  const currentGroup = useMemo(() => {
    return blockGroups.find(g => g.id === selectedGroupId) || blockGroups[0];
  }, [blockGroups, selectedGroupId]);

  // All distinct executors
  const availableExecutors = useMemo(() => {
    const set = new Set<string>();
    blockGroups.forEach(g => {
      g.tasks.forEach(t => {
        if (t.executor) set.add(t.executor);
      });
    });
    // Ensure standard team members exist
    ['Алихан', 'Нурдаулет', 'Айя', 'Ерсін, Амир', 'Армана', 'от ГИПа'].forEach(e => set.add(e));
    return Array.from(set).filter(Boolean);
  }, [blockGroups]);

  // Filter tasks for current group
  const filteredTasks = useMemo(() => {
    if (!currentGroup) return [];

    return currentGroup.tasks.filter(task => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(q);
        const matchesBlock = (task.targetBlocks || '').toLowerCase().includes(q);
        const matchesExec = (task.executor || '').toLowerCase().includes(q);
        const matchesResp = (task.responsible || '').toLowerCase().includes(q);
        const matchesPred = (task.predecessor || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBlock && !matchesExec && !matchesResp && !matchesPred) {
          return false;
        }
      }

      // Stage filter
      if (selectedStage !== 'all') {
        if (task.stageGroup !== selectedStage && task.stageCode !== selectedStage) {
          return false;
        }
      }

      // Executor filter
      if (selectedExecutor !== 'all') {
        if (task.executor !== selectedExecutor) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus === 'done' && !task.isCompleted) return false;
      if (selectedStatus === 'todo' && task.isCompleted) return false;

      return true;
    });
  }, [currentGroup, searchQuery, selectedStage, selectedExecutor, selectedStatus]);

  // Actions
  const handleToggleTaskComplete = (taskId: string) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        return {
          ...group,
          tasks: group.tasks.map(t => {
            if (t.id !== taskId) return t;
            const nextDone = !t.isCompleted;
            return {
              ...t,
              isCompleted: nextDone,
              statusText: nextDone ? 'Сделано' : 'В плане',
            };
          }),
        };
      })
    );
  };

  const handleToggleMatrixTask = (groupId: string, taskId: string) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          tasks: group.tasks.map(t => {
            if (t.id !== taskId) return t;
            const nextDone = !t.isCompleted;
            return {
              ...t,
              isCompleted: nextDone,
              statusText: nextDone ? 'Сделано' : 'В плане',
            };
          }),
        };
      })
    );
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('Удалить эту задачу из таблицы?')) return;
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        return {
          ...group,
          tasks: group.tasks.filter(t => t.id !== taskId),
        };
      })
    );
  };

  const handleUpdateOrderNumber = (taskId: string, newOrderNumber: string) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        return {
          ...group,
          tasks: group.tasks.map(t => (t.id === taskId ? { ...t, orderNumber: newOrderNumber } : t)),
        };
      })
    );
  };

  const handleMoveArTask = (taskId: string, direction: 'up' | 'down') => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        const curIndex = group.tasks.findIndex(t => t.id === taskId);
        if (curIndex === -1) return group;
        const targetIndex = direction === 'up' ? curIndex - 1 : curIndex + 1;
        if (targetIndex < 0 || targetIndex >= group.tasks.length) return group;

        const updated = [...group.tasks];
        const [moved] = updated.splice(curIndex, 1);
        updated.splice(targetIndex, 0, moved);
        const renumbered = updated.map((t, idx) => ({
          ...t,
          orderNumber: `${idx + 1}.`,
        }));
        return {
          ...group,
          tasks: renumbered,
        };
      })
    );
  };

  const handleSaveTask = (savedTask: TaskItem) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        const exists = group.tasks.some(t => t.id === savedTask.id);
        if (exists) {
          return {
            ...group,
            tasks: group.tasks.map(t => (t.id === savedTask.id ? savedTask : t)),
          };
        } else {
          return {
            ...group,
            tasks: [...group.tasks, savedTask],
          };
        }
      })
    );
  };

  const handleQuickUpdateDuration = (taskId: string, duration: number) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        return {
          ...group,
          tasks: group.tasks.map(t => (t.id === taskId ? { ...t, durationDays: duration } : t)),
        };
      })
    );
  };

  const handleQuickUpdateExecutor = (taskId: string, executor: string) => {
    setBlockGroups(prev =>
      prev.map(group => {
        if (group.id !== selectedGroupId) return group;
        return {
          ...group,
          tasks: group.tasks.map(t => (t.id === taskId ? { ...t, executor, responsible: executor } : t)),
        };
      })
    );
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Сбросить все таблицы к исходному плану (как в присланном файле)?')) {
      setBlockGroups(INITIAL_BLOCK_GROUPS);
      localStorage.removeItem(STORAGE_KEY);
      setIsCsvModalOpen(false);
    }
  };

  const handleImportCsv = (csvText: string) => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;

      const newTasks: TaskItem[] = [];
      // Skip header if first line looks like header
      const startIdx = lines[0].toLowerCase().includes('наименование') || lines[0].toLowerCase().includes('стадия') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 3) {
          const name = parts[2] || parts[1] || parts[0];
          if (!name) continue;
          newTasks.push({
            id: `imported-${Date.now()}-${i}`,
            stageCode: parts[0] || '25%',
            stageGroup: '25%',
            orderNumber: parts[1] || `${i}.`,
            name,
            targetBlocks: parts[3] || 'Блоки 1-4',
            executor: parts[4] || 'Алихан',
            isCompleted: (parts[5] || '').toLowerCase().includes('сделано'),
            statusText: parts[5] || 'В плане',
            predecessor: parts[6] || '',
            successor: parts[7] || '',
            responsible: parts[8] || parts[4] || 'Алихан',
            durationDays: parseFloat((parts[9] || '1').replace(',', '.')) || 1,
            startDay: parseInt(parts[10] || '1') || 1,
            endDay: parseInt(parts[11] || '2') || 2,
            notes: parts[12] || '',
          });
        }
      }

      if (newTasks.length > 0) {
        setBlockGroups(prev =>
          prev.map(group => {
            if (group.id !== selectedGroupId) return group;
            return {
              ...group,
              tasks: [...group.tasks, ...newTasks],
            };
          })
        );
      }
    } catch (err) {
      alert('Ошибка разбора CSV: проверьте формат строк.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* 1. Header (Adheres to Top Bar Contract and shows Google Sheets tabs in exact order: ГП -> СС -> ОВ -> ВК -> АР) */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddTask={() => {
          if (activeTab === 'ss') {
            setIsAddSsModalOpen(true);
          } else {
            handleAddTask();
          }
        }}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
      />

      {/* 2. When activeTab is 'ar', show AR block tabs and stats. For 'ss', 'gp', 'ov', 'vk' - do not show AR block tabs! */}
      {activeTab === 'ar' && (
        <>
          <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0">
            <span>Вкладка «АР» сохранена без изменений для справки. Основная работа ведется во вкладке «СС».</span>
            <button
              onClick={() => setActiveTab('ss')}
              className="font-bold underline hover:no-underline text-indigo-600 dark:text-indigo-400"
            >
              Перейти к «СС» →
            </button>
          </div>
          <BlockTabs
            groups={blockGroups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
          />
          <StatsBar
            currentGroup={currentGroup}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStage={selectedStage}
            onStageChange={setSelectedStage}
            selectedExecutor={selectedExecutor}
            onExecutorChange={setSelectedExecutor}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            executorsList={availableExecutors}
          />
        </>
      )}

      {/* 3. Main Content Views */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Active Target Tab: СС (between ГП and ОВ) */}
        {activeTab === 'ss' && (
          <SSTabView
            isAddTaskModalOpen={isAddSsModalOpen}
            onCloseAddTaskModal={() => setIsAddSsModalOpen(false)}
          />
        )}

        {/* Untouched tabs: ГП, ОВ, ВК */}
        {(activeTab === 'gp' || activeTab === 'ov' || activeTab === 'vk') && (
          <ReadOnlyDisciplineView
            discipline={activeTab}
            onNavigateToSS={() => setActiveTab('ss')}
          />
        )}

        {/* Baseline AR Schedule */}
        {activeTab === 'ar' && (
          <TableView
            tasks={filteredTasks}
            onToggleTaskComplete={handleToggleTaskComplete}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onQuickUpdateDuration={handleQuickUpdateDuration}
            onQuickUpdateExecutor={handleQuickUpdateExecutor}
            availableExecutors={availableExecutors}
            onUpdateOrderNumber={handleUpdateOrderNumber}
            onMoveTask={handleMoveArTask}
          />
        )}
      </main>

      {/* Task Add / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        availableExecutors={availableExecutors}
      />

      {/* CSV Import / Export Modal */}
      <CsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentGroup={currentGroup}
        allGroups={blockGroups}
        onResetToDefaults={handleResetToDefaults}
        onImportCsv={handleImportCsv}
      />
    </div>
  );
}
