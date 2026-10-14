import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SSTaskItem,
  SS_DISCIPLINE_TASKS,
  SS_EXECUTORS,
  SSExecutor,
  SSMajorCategory,
  SSSubsystem,
  SS_BLOCK_GROUPS,
  SSBlockGroupOption,
  RINAT_STANDARD_ROLE_DESCRIPTION,
} from '../data/ssInitialData';
import { TIMELINE_DAYS } from '../data/timelineDays';
import {
  exportTasksToGoogleSheets,
  importTasksFromGoogleSheets,
  createGoogleSpreadsheet,
  extractSpreadsheetId,
  buildSsOldSheetMatrix,
} from '../services/googleSheetsService';
import {
  initAuth,
  googleSignIn,
  logout,
  getCurrentUser,
  getAccessToken,
} from '../services/googleAuth';
import { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Edit2,
  Users,
  Plus,
  X,
  Network,
  Flame,
  Radio,
  Eye,
  DoorClosed,
  Gauge,
  ArrowRight,
  Layers,
  Building2,
  Calendar,
  Sparkles,
  GitBranch,
  Search,
  Filter,
  Info,
  UserCheck,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
  MoveHorizontal,
  ChevronLeft,
  Clock,
  Share2,
  Upload,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Link2,
  Unlink,
  Trash2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  GripVertical,
  ArrowUpDown,
} from 'lucide-react';

interface SSTabViewProps {
  onSwitchToGantt?: () => void;
  isAddTaskModalOpen?: boolean;
  onCloseAddTaskModal?: () => void;
}

type MajorCategoryFilter = 'all' | 'АПС' | 'СС' | 'НСС_Выпуск';
type SubsystemFilter = 'all' | SSSubsystem;
type StatusFilter = 'all' | 'done' | 'pending';
type ViewMode = 'table' | 'gantt';

interface DragState {
  type: 'move' | 'resize-right' | 'resize-left' | 'reorder-row';
  taskId: string;
  startX: number;
  startY?: number;
  initialStartDay: number;
  initialDurationDays: number;
  currentStartDay: number;
  currentDurationDays: number;
  trackWidth: number;
  currentY?: number;
  targetRowIndex?: number;
}

export const EXECUTOR_META: Record<
  SSExecutor,
  {
    role: string;
    competency: string;
    color: string;
    badgeBg: string;
    border: string;
    accent: string;
    lightBg: string;
    activeTabBg: string;
  }
> = {
  'Ринат': {
    role: 'Ведущий инженер СС · Контроль, проверка и сопровождение, НСС и выпуск альбома',
    competency: 'Ведущий инженер СС',
    color: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    border: 'border-amber-300 dark:border-amber-700/60',
    accent: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30',
    activeTabBg: 'bg-amber-500 text-white shadow-amber-500/20',
  },
  'Жансулу': {
    role: 'Инженер СС · АПС, СС',
    competency: 'АПС, СС',
    color: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    border: 'border-blue-300 dark:border-blue-700/60',
    accent: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    activeTabBg: 'bg-blue-600 text-white shadow-blue-500/20',
  },
  'Диляра': {
    role: 'Инженер СС · АПС, СС',
    competency: 'АПС, СС',
    color: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    border: 'border-emerald-300 dark:border-emerald-700/60',
    accent: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    activeTabBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
  },
};

const TOTAL_TIMELINE_DAYS = TIMELINE_DAYS.length; // 62 working days

// Helper functions for calendar dates up to 25.12.2026
export const getCalendarDate = (dayNum: number): string => {
  const clamped = Math.max(1, Math.min(TOTAL_TIMELINE_DAYS, dayNum));
  const item = TIMELINE_DAYS[clamped - 1];
  return item ? item.dateStr : `д.${clamped}`;
};

export const getCalendarDateShort = (dayNum: number): string => {
  const dateStr = getCalendarDate(dayNum);
  return dateStr.slice(0, 5); // "01.10"
};

export const getCalendarRange = (startDay: number, endDay: number): string => {
  const s = getCalendarDate(startDay);
  const e = getCalendarDate(endDay);
  return `${s} – ${e}`;
};

export const getCalendarRangeShort = (startDay: number, endDay: number): string => {
  const s = getCalendarDateShort(startDay);
  const e = getCalendarDateShort(endDay);
  return `${s} – ${e}`;
};

export const getDayOfWeekName = (dateStr: string): string => {
  const parts = dateStr.split('.');
  if (parts.length < 3) return '';
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[d.getDay()] || '';
};

/**
 * Parses user-entered text (e.g. "01.10", "1.10", "01.10.2026", "2026-10-01", "5", "д.5")
 * into a valid timeline day number (1..62) according to the working calendar up to 25.12.2026.
 */
export const parseDayFromText = (input: string): number | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Plain day number, e.g. "5", "д.5", "день 5"
  const dayMatch = trimmed.match(/^(?:д(?:ень)?\.?\s*)?(\d{1,2})$/i);
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10);
    if (d >= 1 && d <= TOTAL_TIMELINE_DAYS) return d;
  }

  // 2. ISO format YYYY-MM-DD
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const norm = `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
      const foundIdx = TIMELINE_DAYS.findIndex(t => t.dateStr === norm);
      if (foundIdx !== -1) return foundIdx + 1;
    }
  }

  // 3. Dot format "DD.MM" or "DD.MM.YYYY" or "D.M"
  const dotParts = trimmed.split('.');
  if (dotParts.length >= 2) {
    const dStr = dotParts[0].padStart(2, '0');
    const mStr = dotParts[1].padStart(2, '0');
    const prefix = `${dStr}.${mStr}`;
    const foundIdx = TIMELINE_DAYS.findIndex(t => t.dateStr.startsWith(prefix));
    if (foundIdx !== -1) return foundIdx + 1;

    // Approximate to nearest working day if non-working day entered
    const year = dotParts[2] ? (dotParts[2].length === 2 ? `20${dotParts[2]}` : dotParts[2]) : '2026';
    const targetDate = new Date(parseInt(year, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
    if (!isNaN(targetDate.getTime())) {
      let closestIdx = -1;
      let minDiff = Infinity;
      TIMELINE_DAYS.forEach((td, idx) => {
        const [dayP, monP, yrP] = td.dateStr.split('.');
        const curDate = new Date(parseInt(yrP, 10), parseInt(monP, 10) - 1, parseInt(dayP, 10));
        const diff = Math.abs(curDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      if (closestIdx !== -1) return closestIdx + 1;
    }
  }

  return null;
};

export interface GanttWeekInfo {
  weekNum: number;
  startIdx: number;
  endIdx: number;
  colSpan: number;
  startDate: string;
  endDate: string;
  label: string;
  badgeBg: string;
  headerBg: string;
  stripeBg: string;
  borderColor: string;
}

export const GANTT_WEEKS: GanttWeekInfo[] = [
  { weekNum: 1, startIdx: 0, endIdx: 4, colSpan: 5, startDate: '01.10', endDate: '07.10', label: 'Нед. 1 (01.10–07.10)', badgeBg: 'bg-blue-600 text-white', headerBg: 'bg-blue-100/90 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800', stripeBg: 'bg-blue-50/25 dark:bg-blue-950/15', borderColor: 'border-r-2 border-blue-400 dark:border-blue-700' },
  { weekNum: 2, startIdx: 5, endIdx: 9, colSpan: 5, startDate: '08.10', endDate: '14.10', label: 'Нед. 2 (08.10–14.10)', badgeBg: 'bg-indigo-600 text-white', headerBg: 'bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800', stripeBg: 'bg-indigo-50/25 dark:bg-indigo-950/15', borderColor: 'border-r-2 border-indigo-400 dark:border-indigo-700' },
  { weekNum: 3, startIdx: 10, endIdx: 14, colSpan: 5, startDate: '15.10', endDate: '21.10', label: 'Нед. 3 (15.10–21.10)', badgeBg: 'bg-sky-600 text-white', headerBg: 'bg-sky-100/90 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-800', stripeBg: 'bg-sky-50/25 dark:bg-sky-950/15', borderColor: 'border-r-2 border-sky-400 dark:border-sky-700' },
  { weekNum: 4, startIdx: 15, endIdx: 19, colSpan: 5, startDate: '22.10', endDate: '28.10', label: 'Нед. 4 (22.10–28.10)', badgeBg: 'bg-emerald-600 text-white', headerBg: 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800', stripeBg: 'bg-emerald-50/25 dark:bg-emerald-950/15', borderColor: 'border-r-2 border-emerald-400 dark:border-emerald-700' },
  { weekNum: 5, startIdx: 20, endIdx: 24, colSpan: 5, startDate: '29.10', endDate: '04.11', label: 'Нед. 5 (29.10–04.11)', badgeBg: 'bg-amber-600 text-white', headerBg: 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800', stripeBg: 'bg-amber-50/25 dark:bg-amber-950/15', borderColor: 'border-r-2 border-amber-400 dark:border-amber-700' },
  { weekNum: 6, startIdx: 25, endIdx: 29, colSpan: 5, startDate: '05.11', endDate: '11.11', label: 'Нед. 6 (05.11–11.11)', badgeBg: 'bg-orange-600 text-white', headerBg: 'bg-orange-100/90 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800', stripeBg: 'bg-orange-50/25 dark:bg-orange-950/15', borderColor: 'border-r-2 border-orange-400 dark:border-orange-700' },
  { weekNum: 7, startIdx: 30, endIdx: 34, colSpan: 5, startDate: '12.11', endDate: '18.11', label: 'Нед. 7 (12.11–18.11)', badgeBg: 'bg-rose-600 text-white', headerBg: 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800', stripeBg: 'bg-rose-50/25 dark:bg-rose-950/15', borderColor: 'border-r-2 border-rose-400 dark:border-rose-700' },
  { weekNum: 8, startIdx: 35, endIdx: 39, colSpan: 5, startDate: '19.11', endDate: '25.11', label: 'Нед. 8 (19.11–25.11)', badgeBg: 'bg-purple-600 text-white', headerBg: 'bg-purple-100/90 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800', stripeBg: 'bg-purple-50/25 dark:bg-purple-950/15', borderColor: 'border-r-2 border-purple-400 dark:border-purple-700' },
  { weekNum: 9, startIdx: 40, endIdx: 44, colSpan: 5, startDate: '26.11', endDate: '02.12', label: 'Нед. 9 (26.11–02.12)', badgeBg: 'bg-teal-600 text-white', headerBg: 'bg-teal-100/90 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-800', stripeBg: 'bg-teal-50/25 dark:bg-teal-950/15', borderColor: 'border-r-2 border-teal-400 dark:border-teal-700' },
  { weekNum: 10, startIdx: 45, endIdx: 49, colSpan: 5, startDate: '03.12', endDate: '09.12', label: 'Нед. 10 (03.12–09.12)', badgeBg: 'bg-emerald-600 text-white', headerBg: 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800', stripeBg: 'bg-emerald-50/25 dark:bg-emerald-950/15', borderColor: 'border-r-2 border-emerald-400 dark:border-emerald-700' },
  { weekNum: 11, startIdx: 50, endIdx: 54, colSpan: 5, startDate: '10.12', endDate: '16.12', label: 'Нед. 11 (10.12–16.12)', badgeBg: 'bg-cyan-600 text-white', headerBg: 'bg-cyan-100/90 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800', stripeBg: 'bg-cyan-50/25 dark:bg-cyan-950/15', borderColor: 'border-r-2 border-cyan-400 dark:border-cyan-700' },
  { weekNum: 12, startIdx: 55, endIdx: 59, colSpan: 5, startDate: '17.12', endDate: '23.12', label: 'Нед. 12 (17.12–23.12)', badgeBg: 'bg-slate-700 text-white', headerBg: 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700', stripeBg: 'bg-slate-50/25 dark:bg-slate-800/15', borderColor: 'border-r-2 border-slate-400 dark:border-slate-700' },
  { weekNum: 13, startIdx: 60, endIdx: 61, colSpan: 2, startDate: '24.12', endDate: '25.12', label: 'Нед. 13 (24.12–25.12)', badgeBg: 'bg-red-700 text-white', headerBg: 'bg-red-100/90 dark:bg-red-950/70 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800', stripeBg: 'bg-red-50/30 dark:bg-red-950/20', borderColor: '' },
];

export const SSTabView: React.FC<SSTabViewProps> = ({
  isAddTaskModalOpen = false,
  onCloseAddTaskModal,
}) => {
  // Main task list state (persisted in localStorage)
  const [tasks, setTasks] = useState<SSTaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('ss_discipline_tasks_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SS_DISCIPLINE_TASKS;
  });

  // Filter States
  const [selectedMajorCategory, setSelectedMajorCategory] = useState<MajorCategoryFilter>('all');
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemFilter>('all');
  const [selectedExecutor, setSelectedExecutor] = useState<string>('all');
  const [selectedBlockKey, setSelectedBlockKey] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View & UI states
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<SSTaskItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // WEEK ZOOM STATE: when a user clicks on a week header, zoom into that week!
  const [selectedWeekZoom, setSelectedWeekZoom] = useState<number | null>(null);

  // DEPENDENCIES CONFIGURATION
  // "Одна задача исполнителя начинается строго по завершению другой (кроме Рината, у него по умолчанию также как у всех, но есть возможность некоторые задачи выполнять параллельно), можно дать возможность включать - выключать взаимосвязи."
  const [isDependenciesEnabled, setIsDependenciesEnabled] = useState<boolean>(true);
  const [isRinatParallelAllowed, setIsRinatParallelAllowed] = useState<boolean>(true);

  // GOOGLE SHEETS SYNC STATE
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState<string>(() => {
    return localStorage.getItem('ss_google_spreadsheet_id') || '';
  });
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);
  const [googleSyncStatus, setGoogleSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('ss_last_sync_time') || null;
  });
  const [confirmDestructiveModal, setConfirmDestructiveModal] = useState<{
    action: 'export' | 'import';
    description: string;
  } | null>(null);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Quick Date edit popover state
  const [dateEditingTask, setDateEditingTask] = useState<SSTaskItem | null>(null);

  // Dedicated Dependency Manager Modal state ("не могу поправить связность своей задачи")
  const [dependencyEditingTaskId, setDependencyEditingTaskId] = useState<string | null>(null);
  const [activeDependencyHoverId, setActiveDependencyHoverId] = useState<string | null>(null);
  const [draftPredId, setDraftPredId] = useState<string>('none');
  const [draftRinatId, setDraftRinatId] = useState<string>('none');
  const [draftNextId, setDraftNextId] = useState<string>('none');
  const [draftNote, setDraftNote] = useState<string>('');

  // Local Modal for new task
  const [localIsAddOpen, setLocalIsAddOpen] = useState<boolean>(false);
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskMajorCategory, setNewTaskMajorCategory] = useState<SSMajorCategory>('СС');
  const [newTaskSubsystem, setNewTaskSubsystem] = useState<SSSubsystem>('СС: Телеком, СКУД (Домофония), Видеонаблюдение');
  const [newTaskBlockKey, setNewTaskBlockKey] = useState<string>('b_1');
  const [newTaskExecutor, setNewTaskExecutor] = useState<SSExecutor>('Жансулу');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(5);
  const [newTaskStartDay, setNewTaskStartDay] = useState<number>(1);
  const [newTaskPredecessorId, setNewTaskPredecessorId] = useState<string>('none');
  const [newTaskHandoffToRinatId, setNewTaskHandoffToRinatId] = useState<string>('none');
  const [newTaskNextTaskId, setNewTaskNextTaskId] = useState<string>('none');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');

  // Task deletion confirmation modal ("удалять ненужные задачи")
  const [taskToDelete, setTaskToDelete] = useState<SSTaskItem | null>(null);

  const isModalOpen = isAddTaskModalOpen || localIsAddOpen;

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      user => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleCloseModal = () => {
    setLocalIsAddOpen(false);
    onCloseAddTaskModal?.();
  };

  // Google Sign-in Handler
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        showToast(`Успешный вход: ${res.user.email}`);
      }
    } catch (err: any) {
      showToast(`Ошибка входа: ${err.message || 'Не удалось авторизоваться'}`);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    showToast('Вы вышли из учетной записи Google');
  };

  // Export to Google Sheets "СС old" tab
  const handlePerformExport = async () => {
    const cleanId = extractSpreadsheetId(spreadsheetIdInput);
    if (!cleanId) {
      showToast('Укажите ID или ссылку на Google Таблицу');
      return;
    }

    setIsSyncingGoogle(true);
    setGoogleSyncStatus('Экспорт данных в таблицу...');
    try {
      const res = await exportTasksToGoogleSheets(cleanId, tasks);
      localStorage.setItem('ss_google_spreadsheet_id', cleanId);
      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('ss_last_sync_time', nowStr);
      setGoogleSyncStatus('Экспорт завершен успешно!');
      showToast(`Экспорт в Google Таблицу («СС old») успешно завершен! (${res.rowsUpdated} задач)`);
      setConfirmDestructiveModal(null);
    } catch (err: any) {
      setGoogleSyncStatus(`Ошибка: ${err.message}`);
      showToast(`Ошибка экспорта: ${err.message}`);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Import from Google Sheets "СС old" tab
  const handlePerformImport = async () => {
    const cleanId = extractSpreadsheetId(spreadsheetIdInput);
    if (!cleanId) {
      showToast('Укажите ID или ссылку на Google Таблицу');
      return;
    }

    setIsSyncingGoogle(true);
    setGoogleSyncStatus('Чтение данных из вкладки «СС old»...');
    try {
      const res = await importTasksFromGoogleSheets(cleanId, tasks);
      setTasks(res.tasks);
      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(res.tasks));
      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('ss_last_sync_time', nowStr);
      setGoogleSyncStatus(`Импортировано изменений: ${res.updatedCount}`);
      showToast(`Синхронизировано из Google Sheets: обновлено ${res.updatedCount} задач`);
      setConfirmDestructiveModal(null);
    } catch (err: any) {
      setGoogleSyncStatus(`Ошибка: ${err.message}`);
      showToast(`Ошибка импорта: ${err.message}`);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Create brand new Google Sheet
  const handleCreateNewSheet = async () => {
    setIsSyncingGoogle(true);
    setGoogleSyncStatus('Создание новой Google Таблицы...');
    try {
      const newId = await createGoogleSpreadsheet('Рабочий проект ЖК · Раздел СС');
      setSpreadsheetIdInput(newId);
      localStorage.setItem('ss_google_spreadsheet_id', newId);
      showToast(`Создана новая таблица Google Sheets! Выполняем экспорт...`);
      await exportTasksToGoogleSheets(newId, tasks);
      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('ss_last_sync_time', nowStr);
      setGoogleSyncStatus('Новая таблица готова и синхронизирована!');
    } catch (err: any) {
      setGoogleSyncStatus(`Ошибка: ${err.message}`);
      showToast(`Ошибка создания таблицы: ${err.message}`);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // 1-Click Copy TSV for immediate Ctrl+V paste into Google Sheets tab "СС old"
  const handleCopyTsvForGoogleSheets = () => {
    const { values } = buildSsOldSheetMatrix(tasks);
    const tsvContent = values
      .map(row => row.map(cell => (cell === undefined || cell === null ? '' : `${cell}`)).join('\t'))
      .join('\n');

    navigator.clipboard.writeText(tsvContent);
    showToast('Данные скопированы в буфер обмена! Вставьте (Ctrl+V) на вкладку «СС old» Google Sheets.');
  };

  // -------------------------------------------------------------
  // TASK DATE UPDATES WITH CO-DEPENDENCE & SEQUENTIAL CHAINING
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // DYNAMIC CASCADE ENGINE FOR AUTO-CORRECTION OF LINKED TASKS
  // -------------------------------------------------------------
  // "каждое поле в проекте должно быть редактируемо и динамично автоматически корректируемо
  // (например, я хочу иметь возможность сократить количество дней на выполнение той или иной задачи,
  // в т.ч. и графически, скоращая или удлиняя блоки, при этом это изменение корректирует последующие связные задачи)"
  // -------------------------------------------------------------
  // DYNAMIC CASCADE ENGINE FOR AUTO-CORRECTION OF LINKED TASKS
  // -------------------------------------------------------------
  // "каждое поле в проекте должно быть редактируемо и динамично автоматически корректируемо
  // (например, я хочу иметь возможность сократить количество дней на выполнение той или иной задачи,
  // в т.ч. и графически, скоращая или удлиняя блоки, при этом это изменение корректирует последующие связные задачи)"
  // "не могу поправить связность своей задачи (необходимо предусмотреть возможность отражения связности и ее корректировки)"
  const runScheduleCascade = (
    list: SSTaskItem[],
    targetTaskId: string,
    isRinatParallel: boolean
  ): SSTaskItem[] => {
    const updated = list.map(t => ({ ...t }));
    const target = updated.find(t => t.id === targetTaskId);
    if (!target) return updated;

    // 1. Engineering Chains (Диляра & Жансулу):
    // Each engineer executes tasks strictly sequentially or follows custom predecessors.
    // If a task is shortened, all subsequent tasks pull forward immediately!
    // If a task is lengthened, all subsequent tasks push backward immediately!
    const engineers: SSExecutor[] = ['Диляра', 'Жансулу'];

    engineers.forEach(engineer => {
      const engineerTasks = updated.filter(
        t => t.executor === engineer && !t.isOutdoorNetwork && t.blockGroupKey !== 'summary' && t.blockGroupKey !== 'outdoor'
      );

      let runningEnd = 0;
      engineerTasks.forEach((t, idx) => {
        const dur = Math.max(1, t.durationDays || 1);
        let start: number;

        // Custom predecessor check:
        const customPredId = t.handoffFromEngineerTaskId || (t.dependsOnTaskIds && t.dependsOnTaskIds[0]) || t.prevSequentialTaskId;
        const customPred = customPredId ? updated.find(p => p.id === customPredId) : null;

        if (customPred && customPred.endDay) {
          start = customPred.endDay + 1;
        } else if (idx === 0) {
          start = t.startDay ?? 1;
        } else {
          // Strictly upon completion of the previous task
          start = runningEnd + 1;
        }

        start = Math.max(1, Math.min(TOTAL_TIMELINE_DAYS - dur + 1, start));
        const end = Math.min(TOTAL_TIMELINE_DAYS, start + dur - 1);

        t.startDay = start;
        t.durationDays = dur;
        t.endDay = end;
        runningEnd = end;

        // Rinat handoff co-dependency:
        // "задача Рината по контролю созависима с исполнением предыдущей задачи инженера СС и если переносятся сроки исполнения конкретной задачи у Диляры или Жансулу, тут же переносится и задача Рината"
        if (t.handoffToRinatTaskId) {
          const rinatTask = updated.find(rt => rt.id === t.handoffToRinatTaskId);
          if (rinatTask) {
            const rDur = Math.max(1, rinatTask.durationDays || 1);
            const rStart = Math.min(TOTAL_TIMELINE_DAYS - rDur + 1, end + 1);
            const rEnd = Math.min(TOTAL_TIMELINE_DAYS, rStart + rDur - 1);
            rinatTask.startDay = rStart;
            rinatTask.durationDays = rDur;
            rinatTask.endDay = rEnd;
          }
        }

        // Direct next task co-dependency if linked
        if (t.nextSequentialTaskId && t.nextSequentialTaskId !== t.handoffToRinatTaskId) {
          const nextTask = updated.find(nt => nt.id === t.nextSequentialTaskId);
          if (nextTask && nextTask.executor !== engineer) {
            const nDur = Math.max(1, nextTask.durationDays || 1);
            const nStart = Math.min(TOTAL_TIMELINE_DAYS - nDur + 1, end + 1);
            const nEnd = Math.min(TOTAL_TIMELINE_DAYS, nStart + nDur - 1);
            nextTask.startDay = nStart;
            nextTask.durationDays = nDur;
            nextTask.endDay = nEnd;
          }
        }
      });
    });

    // 2. Rinat review tasks sequential constraint if parallel execution is NOT allowed
    if (!isRinatParallel) {
      const rinatReviews = updated.filter(t => t.executor === 'Ринат' && t.isRinatHandoff);
      let rinatRunningEnd = 0;
      rinatReviews.forEach(rt => {
        const rDur = Math.max(1, rt.durationDays || 1);
        const rStart = Math.max(rt.startDay ?? 1, rinatRunningEnd + 1);
        const rEnd = Math.min(TOTAL_TIMELINE_DAYS, rStart + rDur - 1);
        rt.startDay = rStart;
        rt.durationDays = rDur;
        rt.endDay = rEnd;
        rinatRunningEnd = rEnd;
      });
    }

    // 3. Outdoor Networks (НСС) and Final Album:
    // Run strictly after all block design tasks finish!
    const maxDesignEnd = Math.max(
      ...updated
        .filter(t => !t.isOutdoorNetwork && t.blockGroupKey !== 'summary' && t.blockGroupKey !== 'outdoor')
        .map(t => t.endDay ?? 50),
      45
    );

    const nssIndex = updated.findIndex(t => t.id === 'outdoor-nss-rin');
    if (nssIndex !== -1) {
      const nssDur = Math.max(1, updated[nssIndex].durationDays || 6);
      const nssStart = Math.min(TOTAL_TIMELINE_DAYS - nssDur - 3, maxDesignEnd + 1);
      const nssEnd = Math.min(TOTAL_TIMELINE_DAYS - 2, nssStart + nssDur - 1);
      updated[nssIndex].startDay = nssStart;
      updated[nssIndex].durationDays = nssDur;
      updated[nssIndex].endDay = nssEnd;

      const albumIndex = updated.findIndex(t => t.id === 'final-album-rin');
      if (albumIndex !== -1) {
        const albDur = Math.max(1, updated[albumIndex].durationDays || 6);
        const albStart = Math.min(TOTAL_TIMELINE_DAYS - albDur + 1, nssEnd + 1);
        const albEnd = Math.min(TOTAL_TIMELINE_DAYS, albStart + albDur - 1);
        updated[albumIndex].startDay = albStart;
        updated[albumIndex].durationDays = albDur;
        updated[albumIndex].endDay = albEnd;
      }
    }

    return updated;
  };

  // Dedicated connectivity update handler ("не могу поправить связность своей задачи")
  const handleUpdateTaskConnectivity = (
    taskId: string,
    updates: {
      predecessorTaskId?: string | null;
      handoffToRinatTaskId?: string | null;
      nextSequentialTaskId?: string | null;
      transitionNote?: string;
    }
  ) => {
    setTasks(prev => {
      const targetIndex = prev.findIndex(t => t.id === taskId);
      if (targetIndex === -1) return prev;

      let updated = prev.map(t => ({ ...t }));
      const target = updated[targetIndex];

      // 1. Predecessor update
      if (updates.predecessorTaskId !== undefined) {
        if (!updates.predecessorTaskId || updates.predecessorTaskId === 'none') {
          target.handoffFromEngineerTaskId = undefined;
          target.dependsOnTaskIds = [];
          target.prevSequentialTaskId = undefined;
          target.predecessor = 'Старт проекта';
        } else {
          const pred = updated.find(t => t.id === updates.predecessorTaskId);
          if (pred) {
            target.handoffFromEngineerTaskId = pred.id;
            target.dependsOnTaskIds = [pred.id];
            target.prevSequentialTaskId = pred.id;
            target.predecessor = `№${pred.orderNumber} (${pred.executor}, ${pred.blockNumber || pred.targetBlocks})`;
            pred.nextSequentialTaskId = target.id;
            if (target.executor === 'Ринат' && target.isRinatHandoff) {
              pred.handoffToRinatTaskId = target.id;
            }
          }
        }
      }

      // 2. Rinat review handoff update
      if (updates.handoffToRinatTaskId !== undefined) {
        if (!updates.handoffToRinatTaskId || updates.handoffToRinatTaskId === 'none') {
          if (target.handoffToRinatTaskId) {
            const oldRinat = updated.find(t => t.id === target.handoffToRinatTaskId);
            if (oldRinat) {
              oldRinat.handoffFromEngineerTaskId = undefined;
              oldRinat.dependsOnTaskIds = [];
              oldRinat.predecessor = 'Старт проекта';
            }
          }
          target.handoffToRinatTaskId = undefined;
        } else {
          const rinatTask = updated.find(t => t.id === updates.handoffToRinatTaskId);
          if (rinatTask) {
            target.handoffToRinatTaskId = rinatTask.id;
            rinatTask.handoffFromEngineerTaskId = target.id;
            rinatTask.dependsOnTaskIds = [target.id];
            rinatTask.predecessor = `№${target.orderNumber} (${target.executor}, ${target.blockNumber || target.targetBlocks})`;
          }
        }
      }

      // 3. Next sequential task update
      if (updates.nextSequentialTaskId !== undefined) {
        if (!updates.nextSequentialTaskId || updates.nextSequentialTaskId === 'none') {
          target.nextSequentialTaskId = undefined;
        } else {
          const nextTask = updated.find(t => t.id === updates.nextSequentialTaskId);
          if (nextTask) {
            target.nextSequentialTaskId = nextTask.id;
            nextTask.prevSequentialTaskId = target.id;
            nextTask.dependsOnTaskIds = [target.id];
            nextTask.predecessor = `№${target.orderNumber} (${target.executor}, ${target.blockNumber || target.targetBlocks})`;
          }
        }
      }

      // 4. Transition Note
      if (updates.transitionNote !== undefined) {
        target.transitionNote = updates.transitionNote;
        target.successor = updates.transitionNote;
      }

      // Recalculate cascade
      if (isDependenciesEnabled) {
        updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
      }

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });

    const target = tasks.find(t => t.id === taskId);
    showToast(`Связность задачи «${target?.name || taskId}» сохранена. График пересчитан!`);
  };

  // Memoized dependency editing task
  const dependencyEditingTask = useMemo(() => {
    if (!dependencyEditingTaskId) return null;
    return tasks.find(t => t.id === dependencyEditingTaskId) || null;
  }, [dependencyEditingTaskId, tasks]);

  useEffect(() => {
    if (dependencyEditingTask) {
      const pred =
        dependencyEditingTask.handoffFromEngineerTaskId ||
        (dependencyEditingTask.dependsOnTaskIds && dependencyEditingTask.dependsOnTaskIds[0]) ||
        dependencyEditingTask.prevSequentialTaskId ||
        'none';
      setDraftPredId(pred);
      setDraftRinatId(dependencyEditingTask.handoffToRinatTaskId || 'none');
      setDraftNextId(dependencyEditingTask.nextSequentialTaskId || 'none');
      setDraftNote(dependencyEditingTask.successor || dependencyEditingTask.transitionNote || '');
    }
  }, [dependencyEditingTask]);

  // Update task duration and/or start day with full downstream cascade
  const handleUpdateTaskDurationAndStart = (
    taskId: string,
    newDuration: number,
    newStartDay?: number
  ) => {
    setTasks(prev => {
      const targetIndex = prev.findIndex(t => t.id === taskId);
      if (targetIndex === -1) return prev;

      const target = prev[targetIndex];
      const validDur = Math.max(1, Math.min(45, newDuration));
      const targetStart = newStartDay !== undefined ? newStartDay : (target.startDay ?? 1);
      const clampedStart = Math.max(1, Math.min(TOTAL_TIMELINE_DAYS - validDur + 1, targetStart));
      const clampedEnd = Math.min(TOTAL_TIMELINE_DAYS, clampedStart + validDur - 1);

      let updated = prev.map(t => ({ ...t }));
      updated[targetIndex].startDay = clampedStart;
      updated[targetIndex].durationDays = validDur;
      updated[targetIndex].endDay = clampedEnd;

      if (isDependenciesEnabled) {
        updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
      }

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });

    const target = tasks.find(t => t.id === taskId);
    if (target) {
      showToast(`«${target.name}»: ${newDuration} дн., связные задачи скорректированы`);
    }
  };

  // Shortcut for updating dates (e.g. from calendar picker)
  const handleUpdateTaskDates = (taskId: string, newStartDay: number, customEndDay?: number) => {
    const target = tasks.find(t => t.id === taskId);
    const dur = customEndDay !== undefined
      ? Math.max(1, customEndDay - newStartDay + 1)
      : (target?.durationDays || 1);
    handleUpdateTaskDurationAndStart(taskId, dur, newStartDay);
  };

  // Quick duration delta (+1 / -1 day) or absolute setter
  const handleUpdateDuration = (taskId: string, newDuration: number) => {
    const validDur = Math.max(1, Math.min(45, newDuration));
    handleUpdateTaskDurationAndStart(taskId, validDur);
  };

  const handleShiftTaskDays = (taskId: string, deltaDays: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    handleUpdateTaskDates(taskId, (task.startDay || 1) + deltaDays);
  };

  // Universal handler to edit ANY field of a task
  const handleUpdateTaskField = (taskId: string, field: keyof SSTaskItem, value: any) => {
    setTasks(prev => {
      const targetIndex = prev.findIndex(t => t.id === taskId);
      if (targetIndex === -1) return prev;

      let updated = prev.map(t => ({ ...t }));
      (updated[targetIndex] as any)[field] = value;

      if (field === 'majorCategory') {
        if (value === 'АПС') {
          updated[targetIndex].subsystem = 'АПС и СОУЭ';
        } else if (value === 'СС') {
          updated[targetIndex].subsystem = 'СС: Телеком, СКУД, Видео';
        }
      }

      if (field === 'executor') {
        updated[targetIndex].responsible = value;
        if (isDependenciesEnabled) {
          updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
        }
      }

      if (field === 'durationDays') {
        const dur = Math.max(1, parseInt(value, 10) || 1);
        updated[targetIndex].durationDays = dur;
        updated[targetIndex].endDay = Math.min(TOTAL_TIMELINE_DAYS, (updated[targetIndex].startDay || 1) + dur - 1);
        if (isDependenciesEnabled) {
          updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
        }
      }

      if (field === 'startDay') {
        const start = Math.max(1, parseInt(value, 10) || 1);
        const dur = updated[targetIndex].durationDays || 1;
        updated[targetIndex].startDay = start;
        updated[targetIndex].endDay = Math.min(TOTAL_TIMELINE_DAYS, start + dur - 1);
        if (isDependenciesEnabled) {
          updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
        }
      }

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });
  };

  // Drag & drop window listeners (supports MOVE, RESIZE-RIGHT, RESIZE-LEFT)
  useEffect(() => {
    if (!dragState) return;

    const activeWeek = selectedWeekZoom !== null
      ? GANTT_WEEKS.find(w => w.weekNum === selectedWeekZoom)
      : null;

    const daysCount = activeWeek ? activeWeek.colSpan : TOTAL_TIMELINE_DAYS;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - (dragState.startY || e.clientY);
      const dayWidth = Math.max(1, dragState.trackWidth / daysCount);
      const dayDelta = Math.round(deltaX / dayWidth);

      if (dragState.type === 'move') {
        const dur = dragState.initialDurationDays;
        const newStart = Math.max(
          1,
          Math.min(TOTAL_TIMELINE_DAYS - dur + 1, dragState.initialStartDay + dayDelta)
        );
        const rowDelta = Math.round(deltaY / 44);
        setDragState(prev => (prev ? {
          ...prev,
          currentStartDay: newStart,
          currentDurationDays: dur,
          currentY: deltaY,
          targetRowIndex: rowDelta,
        } : null));
      } else if (dragState.type === 'resize-right') {
        // Dragging right edge: shorten or lengthen the block!
        const maxDur = TOTAL_TIMELINE_DAYS - dragState.initialStartDay + 1;
        const newDur = Math.max(1, Math.min(maxDur, dragState.initialDurationDays + dayDelta));
        setDragState(prev => (prev ? { ...prev, currentDurationDays: newDur } : null));
      } else if (dragState.type === 'resize-left') {
        // Dragging left edge: change start date
        const maxShiftLeft = dragState.initialStartDay - 1;
        const maxShiftRight = dragState.initialDurationDays - 1;
        const safeDelta = Math.max(-maxShiftLeft, Math.min(maxShiftRight, dayDelta));
        const newStart = dragState.initialStartDay + safeDelta;
        const newDur = dragState.initialDurationDays - safeDelta;
        setDragState(prev => (prev ? { ...prev, currentStartDay: newStart, currentDurationDays: newDur } : null));
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        // Vertical row movement: reorder row up/down and update sequence numbering
        if (dragState.type === 'move' && dragState.targetRowIndex && dragState.targetRowIndex !== 0) {
          const rowDelta = dragState.targetRowIndex;
          setTasks(prev => {
            const currentIdx = prev.findIndex(t => t.id === dragState.taskId);
            if (currentIdx === -1) return prev;
            const targetIdx = Math.max(0, Math.min(prev.length - 1, currentIdx + rowDelta));
            if (targetIdx === currentIdx) return prev;

            const updated = [...prev];
            const [movedItem] = updated.splice(currentIdx, 1);
            updated.splice(targetIdx, 0, movedItem);

            // Renumber tasks to actual sequence (1..N)
            const renumbered = updated.map((t, idx) => ({
              ...t,
              orderNumber: `${idx + 1}.`,
            }));
            localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(renumbered));
            return renumbered;
          });
          showToast('Строка задачи перемещена, нумерация обновлена на актуальную!');
        }

        // Horizontal date shift or duration resize
        if (dragState.currentStartDay !== dragState.initialStartDay || dragState.currentDurationDays !== dragState.initialDurationDays) {
          handleUpdateTaskDurationAndStart(
            dragState.taskId,
            dragState.currentDurationDays,
            dragState.currentStartDay
          );
        }
        setDragState(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, selectedWeekZoom, isDependenciesEnabled, isRinatParallelAllowed]);

  // Change executor of a task
  const handleUpdateExecutor = (taskId: string, newExecutor: SSExecutor) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            executor: newExecutor,
            responsible: newExecutor,
          };
        }
        return t;
      });
      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });

    const targetTask = tasks.find(t => t.id === taskId);
    showToast(`Ответственный изменен на «${newExecutor}» (${targetTask?.name || 'Задача'})`);
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          const nextCompleted = !t.isCompleted;
          return {
            ...t,
            isCompleted: nextCompleted,
            statusText: nextCompleted ? 'Сделано' : 'В работе',
          };
        }
        return t;
      });
      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });
  };

  // Create / Add New Task handler ("еще хочу иметь возможность добавлять новые и удалять ненужные задачи")
  const handleCreateTask = () => {
    const finalName = newTaskName.trim() || 'Новая задача СС';
    const taskId = `task-custom-${Date.now()}`;
    const nextOrderNumber = `${tasks.length + 1}`;

    const blockObj = SS_BLOCK_GROUPS.find(bg => bg.key === newTaskBlockKey);
    const blockLabel = blockObj ? blockObj.shortLabel : 'Блок 1';

    let calcStartDay = Math.max(1, Math.min(TOTAL_TIMELINE_DAYS, newTaskStartDay));
    let dependsOn: string[] = [];
    const predTask = newTaskPredecessorId !== 'none' ? tasks.find(t => t.id === newTaskPredecessorId) : null;

    if (predTask) {
      dependsOn = [predTask.id];
      if (predTask.endDay) {
        calcStartDay = Math.min(TOTAL_TIMELINE_DAYS, predTask.endDay + 1);
      }
    }

    const dur = Math.max(1, Math.min(45, newTaskDuration));
    const calcEndDay = Math.min(TOTAL_TIMELINE_DAYS, calcStartDay + dur - 1);

    const newTaskItem: SSTaskItem = {
      id: taskId,
      orderNumber: nextOrderNumber,
      stageCode: 'СС',
      stageGroup: 'Общее',
      majorCategory: newTaskMajorCategory,
      subsystem: newTaskSubsystem,
      name: finalName,
      blockNumber: blockLabel,
      targetBlocks: blockLabel,
      blockGroupKey: newTaskBlockKey,
      executor: newTaskExecutor,
      responsible: newTaskExecutor,
      statusText: 'Не начато',
      isCompleted: false,
      durationDays: dur,
      startDay: calcStartDay,
      endDay: calcEndDay,
      notes: newTaskNotes,
      fullDescription: newTaskNotes || finalName,
      dependsOnTaskIds: dependsOn,
      handoffFromEngineerTaskId: predTask ? predTask.id : undefined,
      handoffToRinatTaskId: newTaskHandoffToRinatId !== 'none' ? newTaskHandoffToRinatId : undefined,
      nextSequentialTaskId: newTaskNextTaskId !== 'none' ? newTaskNextTaskId : undefined,
      predecessor: predTask
        ? `№${predTask.orderNumber} (${predTask.executor}, ${predTask.blockNumber || predTask.targetBlocks})`
        : 'Старт проекта',
      successor: '',
      isRinatHandoff: newTaskExecutor === 'Ринат',
    };

    setTasks(prev => {
      let updated = [...prev, newTaskItem];

      // If linking to predecessor, update predecessor's nextSequentialTaskId
      if (predTask) {
        const pIndex = updated.findIndex(t => t.id === predTask.id);
        if (pIndex !== -1) {
          updated[pIndex] = {
            ...updated[pIndex],
            nextSequentialTaskId: taskId,
            successor: `Переход к №${nextOrderNumber} (${finalName})`,
          };
          if (newTaskExecutor === 'Ринат') {
            updated[pIndex].handoffToRinatTaskId = taskId;
          }
        }
      }

      // If linking to rinat handoff
      if (newTaskHandoffToRinatId !== 'none') {
        const rIndex = updated.findIndex(t => t.id === newTaskHandoffToRinatId);
        if (rIndex !== -1) {
          updated[rIndex] = {
            ...updated[rIndex],
            handoffFromEngineerTaskId: taskId,
            dependsOnTaskIds: [taskId],
            predecessor: `№${nextOrderNumber} (${newTaskExecutor})`,
          };
        }
      }

      // If linking to next sequential task
      if (newTaskNextTaskId !== 'none') {
        const nIndex = updated.findIndex(t => t.id === newTaskNextTaskId);
        if (nIndex !== -1) {
          updated[nIndex] = {
            ...updated[nIndex],
            prevSequentialTaskId: taskId,
            dependsOnTaskIds: [taskId],
            predecessor: `№${nextOrderNumber} (${newTaskExecutor})`,
          };
        }
      }

      if (isDependenciesEnabled) {
        updated = runScheduleCascade(updated, taskId, isRinatParallelAllowed);
      }

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });

    showToast(`Задача «${finalName}» успешно добавлена в график раздела СС!`);
    // Reset form
    setNewTaskName('');
    setNewTaskNotes('');
    setNewTaskDuration(5);
    setNewTaskPredecessorId('none');
    setNewTaskHandoffToRinatId('none');
    setNewTaskNextTaskId('none');
    handleCloseModal();
  };

  // Delete task handler ("еще хочу иметь возможность добавлять новые и удалять ненужные задачи")
  const handleConfirmDeleteTask = () => {
    if (!taskToDelete) return;
    const deletedId = taskToDelete.id;
    const deletedName = taskToDelete.name;

    setTasks(prev => {
      // Remove deleted task
      let updated = prev.filter(t => t.id !== deletedId);

      // Clean up dependencies across other tasks that pointed to this deleted task
      updated = updated.map(t => {
        let changed = false;
        const tCopy = { ...t };

        if (tCopy.handoffFromEngineerTaskId === deletedId) {
          tCopy.handoffFromEngineerTaskId = undefined;
          tCopy.predecessor = 'Старт проекта';
          changed = true;
        }
        if (tCopy.handoffToRinatTaskId === deletedId) {
          tCopy.handoffToRinatTaskId = undefined;
          changed = true;
        }
        if (tCopy.nextSequentialTaskId === deletedId) {
          tCopy.nextSequentialTaskId = undefined;
          changed = true;
        }
        if (tCopy.prevSequentialTaskId === deletedId) {
          tCopy.prevSequentialTaskId = undefined;
          tCopy.predecessor = 'Старт проекта';
          changed = true;
        }
        if (tCopy.dependsOnTaskIds?.includes(deletedId)) {
          tCopy.dependsOnTaskIds = tCopy.dependsOnTaskIds.filter(id => id !== deletedId);
          if (tCopy.dependsOnTaskIds.length === 0) {
            tCopy.predecessor = 'Старт проекта';
          }
          changed = true;
        }

        return changed ? tCopy : t;
      });

      if (isDependenciesEnabled && updated.length > 0) {
        updated = runScheduleCascade(updated, updated[0].id, isRinatParallelAllowed);
      }

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });

    // Close any editing modals if deleting that task
    if (dateEditingTask?.id === deletedId) {
      setDateEditingTask(null);
    }
    if (dependencyEditingTaskId === deletedId) {
      setDependencyEditingTaskId(null);
    }
    if (selectedTaskId === deletedId) {
      setSelectedTaskId(null);
    }

    setTaskToDelete(null);
    showToast(`Задача «${deletedName}» удалена. Взаимосвязи пересчитаны!`);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Сбросить график раздела СС к исходному равномерному распределению до 25.12.2026?')) {
      setTasks(SS_DISCIPLINE_TASKS);
      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(SS_DISCIPLINE_TASKS));
      showToast('График СС сброшен к исходному эталону до 25.12.2026');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Major Category
      if (selectedMajorCategory !== 'all' && task.majorCategory !== selectedMajorCategory) {
        return false;
      }
      // Subsystem
      if (selectedSubsystem !== 'all' && task.subsystem !== selectedSubsystem) {
        return false;
      }
      // Executor
      if (selectedExecutor !== 'all' && task.executor !== selectedExecutor) {
        return false;
      }
      // Block group
      if (selectedBlockKey !== 'all') {
        if (selectedBlockKey === 'seq_1_12_27') {
          if (task.blockSequenceGroup !== 'seq_1_12_27') return false;
        } else if (task.blockGroupKey !== selectedBlockKey) {
          return false;
        }
      }
      // Status
      if (selectedStatus === 'done' && !task.isCompleted) return false;
      if (selectedStatus === 'pending' && task.isCompleted) return false;

      // Week Zoom: when zoomed to a week, show tasks that are active during this week!
      if (selectedWeekZoom !== null) {
        const week = GANTT_WEEKS.find(w => w.weekNum === selectedWeekZoom);
        if (week) {
          const weekStartDay = week.startIdx + 1;
          const weekEndDay = week.endIdx + 1;
          const isActiveThisWeek = task.startDay <= weekEndDay && task.endDay >= weekStartDay;
          if (!isActiveThisWeek) return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = task.name.toLowerCase().includes(q);
        const matchExec = task.executor.toLowerCase().includes(q);
        const matchBlock = (task.blockNumber || task.targetBlocks || '').toLowerCase().includes(q);
        const matchSub = (task.subsystem || '').toLowerCase().includes(q);
        const matchFull = (task.fullDescription || '').toLowerCase().includes(q);
        if (!matchName && !matchExec && !matchBlock && !matchSub && !matchFull) {
          return false;
        }
      }
      return true;
    });
  }, [
    tasks,
    selectedMajorCategory,
    selectedSubsystem,
    selectedExecutor,
    selectedBlockKey,
    selectedStatus,
    selectedWeekZoom,
    searchQuery,
  ]);

  // Move task up or down relative to current position ("задачи нужно иметь возможность перемещать вверх и вниз относительно текущего положения")
  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    setTasks(prev => {
      const currentFilteredIndex = filteredTasks.findIndex(t => t.id === taskId);
      if (currentFilteredIndex === -1) return prev;

      const targetFilteredIndex = direction === 'up' ? currentFilteredIndex - 1 : currentFilteredIndex + 1;
      if (targetFilteredIndex < 0 || targetFilteredIndex >= filteredTasks.length) {
        return prev;
      }

      const targetTask = filteredTasks[targetFilteredIndex];
      const fromIndex = prev.findIndex(t => t.id === taskId);
      const toIndex = prev.findIndex(t => t.id === targetTask.id);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      const newTargetIndex = updated.findIndex(t => t.id === targetTask.id);
      if (direction === 'up') {
        updated.splice(newTargetIndex, 0, movedItem);
      } else {
        updated.splice(newTargetIndex + 1, 0, movedItem);
      }

      // Automatically renumber tasks to actual sequence (1..N)
      const renumbered = updated.map((t, idx) => ({
        ...t,
        orderNumber: `${idx + 1}.`,
      }));

      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(renumbered));
      return renumbered;
    });
  };

  // Auto-renumber tasks sequentially based on current list order ("нумерация задач должна быть редактируема (1 столбец)")
  const handleAutoRenumber = () => {
    setTasks(prev => {
      const updated = prev.map((t, idx) => ({
        ...t,
        orderNumber: `${idx + 1}.`,
      }));
      localStorage.setItem('ss_discipline_tasks_v7', JSON.stringify(updated));
      return updated;
    });
    showToast('Нумерация задач обновлена по текущему порядку (1..N)!');
  };

  // Total summary metrics
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active zoomed week info if any
  const currentZoomWeek = selectedWeekZoom !== null
    ? GANTT_WEEKS.find(w => w.weekNum === selectedWeekZoom)
    : null;

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & GOOGLE SHEETS / ACTIONS BAR */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                <Network className="w-3.5 h-3.5" />
                Раздел СС & АПС
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Календарный график до 25.12.2026 (13 недель)
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {completedCount}/{totalCount} задач ({progressPercent}%)
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  Синхронизировано с Google Sheets в {lastSyncTime}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Комплекс слаботочных сетей (СС, АПС, СКУД, видеонаблюдение, контроль загазованности паркинга и НСС) с автоматической созависимостью задач Рината.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* ADD TASK BUTTON ("добавлять новые задачи") */}
            <button
              onClick={() => setLocalIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              title="Добавить новую задачу в раздел СС"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить задачу</span>
            </button>

            {/* GOOGLE SHEETS SYNC BUTTON & STATUS */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                title="Указать ID / ссылку на Google Таблицу и настроить экспорт/импорт вкладки «СС old»"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Google Таблица («СС old»)</span>
                {spreadsheetIdInput ? (
                  <span className="px-1.5 py-0.2 bg-emerald-800 text-[10px] rounded font-mono">
                    ID привязан
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-900 text-[10px] rounded font-semibold animate-pulse">
                    Указать ссылку
                  </span>
                )}
              </button>
            </div>

            {/* Quick 1-Click TSV Copy for Google Sheets */}
            <button
              onClick={handleCopyTsvForGoogleSheets}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Скопировать таблицу в буфер для вставки Ctrl+V на вкладку «СС old»"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Копировать для «СС old»</span>
            </button>

            {/* Reset to initial */}
            <button
              onClick={handleResetToDefaults}
              className="p-2 text-xs rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Сбросить даты и распределение до 25.12"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Таблица
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition ${
                  viewMode === 'gantt'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Диаграмма Ганта
              </button>
            </div>
          </div>
        </div>

        {/* DEPENDENCIES & CO-DEPENDENCE TOGGLE BAR */}
        {/* "Одна задача исполнителя начинается строго по завершению другой (кроме Рината, у него по умолчанию также как у всех, но есть возможность некоторые задачи выполнять параллельно), можно дать возможность включать - выключать взаимосвязи." */}
        <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Global Dependencies switch */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextVal = !isDependenciesEnabled;
                  setIsDependenciesEnabled(nextVal);
                  showToast(
                    nextVal
                      ? 'Взаимосвязи включены: строгая цепочка задач исполнителя и авто-перенос контроля Рината активированы'
                      : 'Взаимосвязи выключены: задачи можно двигать полностью независимо'
                  );
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs border transition ${
                  isDependenciesEnabled
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isDependenciesEnabled ? <Link2 className="w-3.5 h-3.5 text-blue-600" /> : <Unlink className="w-3.5 h-3.5 text-slate-400" />}
                <span>Взаимосвязи задач: {isDependenciesEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                (Задача исполнителя начинается строго по завершению предыдущей)
              </span>
            </div>

            {/* Rinat Parallel switch */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsRinatParallelAllowed(prev => !prev);
                  showToast(
                    !isRinatParallelAllowed
                      ? 'Параллельные задачи Рината разрешены'
                      : 'Задачи Рината строго последовательны'
                  );
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
                  isRinatParallelAllowed
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300'
                }`}
                title="Возможность для Рината выполнять некоторые задачи параллельно"
              >
                Параллельность для Рината: {isRinatParallelAllowed ? 'Разрешена' : 'По цепочке'}
              </button>
            </div>
          </div>

          {/* Rinat Co-dependence explanation badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Контроль Рината созависим со сроками Диляры и Жансулу (авто-перенос)</span>
          </div>
        </div>

        {/* ACTIVE WEEK ZOOM BANNER */}
        {selectedWeekZoom !== null && currentZoomWeek && (
          <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold text-indigo-900 dark:text-indigo-200">
                  Увеличенный масштаб недели: {currentZoomWeek.label}
                </span>
                <span className="text-indigo-700 dark:text-indigo-300 ml-2">
                  (Рабочие дни {currentZoomWeek.startIdx + 1}–{currentZoomWeek.endIdx + 1})
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedWeekZoom(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition"
            >
              <ZoomOut className="w-3 h-3" />
              Показать все 13 недель
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. EXECUTOR CARDS & FILTER BAR (COLORED ACCORDING TO EXECUTOR) */}
      {/* ======================================================== */}
      {/* "на вкладке выбора ответственного покрашивать в соответствии с цветом исполнителя" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SS_EXECUTORS.map(exec => {
          const meta = EXECUTOR_META[exec];
          const execTasks = tasks.filter(t => t.executor === exec);
          const doneTasks = execTasks.filter(t => t.isCompleted).length;
          const totalDays = execTasks.reduce((acc, t) => acc + t.durationDays, 0);
          const isSelected = selectedExecutor === exec;

          return (
            <div
              key={exec}
              onClick={() => setSelectedExecutor(isSelected ? 'all' : exec)}
              className={`p-3.5 rounded-xl border transition cursor-pointer select-none relative overflow-hidden ${
                isSelected
                  ? `${meta.border} ${meta.lightBg} ring-2 ring-offset-1 ${
                      exec === 'Ринат'
                        ? 'ring-amber-500'
                        : exec === 'Жансулу'
                        ? 'ring-blue-500'
                        : 'ring-emerald-500'
                    }`
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Colored top accent stripe */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${meta.accent}`} />

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${meta.accent}`}
                  >
                    {exec.charAt(0)}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {exec}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${meta.badgeBg} ${meta.color}`}>
                        ({meta.competency})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {meta.role}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {doneTasks}/{execTasks.length}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {totalDays} раб. дн.
                  </span>
                </div>
              </div>

              {/* Status indicator button */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${isSelected ? meta.color : 'text-slate-500'}`}>
                  {isSelected ? '✓ Выбран исполнитель' : 'Нажмите для фильтра'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {exec === 'Ринат' ? 'Контроль + НСС' : 'АПС и СС по блокам'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. COMPACT SEARCH & CATEGORY FILTERS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input & block filter */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по задачам, блокам, составу..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Block filter */}
          <select
            value={selectedBlockKey}
            onChange={e => setSelectedBlockKey(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {SS_BLOCK_GROUPS.map(b => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>

          {/* Major category tabs (APS in red, SS in blue) */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedMajorCategory('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                selectedMajorCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setSelectedMajorCategory('АПС')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                selectedMajorCategory === 'АПС'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
            >
              <Flame className="w-3 h-3" />
              АПС
            </button>
            <button
              onClick={() => setSelectedMajorCategory('СС')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                selectedMajorCategory === 'СС'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <Radio className="w-3 h-3" />
              СС
            </button>
            <button
              onClick={() => setSelectedMajorCategory('НСС_Выпуск')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                selectedMajorCategory === 'НСС_Выпуск'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Network className="w-3 h-3" />
              НСС / Альбом
            </button>
          </div>
        </div>

        {/* Right: Reset filters */}
        {(selectedMajorCategory !== 'all' ||
          selectedExecutor !== 'all' ||
          selectedBlockKey !== 'all' ||
          selectedWeekZoom !== null ||
          searchQuery) && (
          <button
            onClick={() => {
              setSelectedMajorCategory('all');
              setSelectedSubsystem('all');
              setSelectedExecutor('all');
              setSelectedBlockKey('all');
              setSelectedStatus('all');
              setSelectedWeekZoom(null);
              setSearchQuery('');
            }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Сбросить все фильтры
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. MAIN VIEW (TABLE OR GANTT CHART) */}
      {/* ======================================================== */}
      {viewMode === 'table' ? (
        /* ======================================================== */
        /* TABLE VIEW WITH RED ROW TITLE FOR APS & BLUE FOR CC     */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 select-none">
                  <th className="py-3 px-2 w-28 text-center" title="Номер задачи (редактируемый) и перемещение вверх/вниз относительно текущего положения">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>№ Порядок</span>
                      <button
                        type="button"
                        onClick={handleAutoRenumber}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition"
                        title="Автоматически перенумеровать задачи по порядку 1..N"
                      >
                        <ListOrdered className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-3 w-28">Блок ЖК</th>
                  <th className="py-3 px-3 w-24">Раздел</th>
                  <th className="py-3 px-4 min-w-[260px]">
                    Наименование задачи (наведите для полного состава)
                  </th>
                  <th className="py-3 px-3 w-40">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Исполнитель
                    </span>
                  </th>
                  <th className="py-3 px-2 w-16 text-center">Срок</th>
                  <th className="py-3 px-3 min-w-[220px]">
                    <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      Календарный график (до 25.12)
                    </span>
                  </th>
                  <th className="py-3 px-3 min-w-[250px]">
                    <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                      <GitBranch className="w-3.5 h-3.5" />
                      Связность & Зависимости
                    </span>
                  </th>
                  <th className="py-3 px-3 w-24 text-center">Статус</th>
                  <th className="py-3 px-3 w-24 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <p className="mb-2">Задачи по выбранным фильтрам не найдены.</p>
                      <button
                        onClick={() => setLocalIsAddOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить новую задачу
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, taskIndex) => {
                    const isSelected = selectedTaskId === task.id;
                    const isAps = task.majorCategory === 'АПС';
                    const isCC = task.majorCategory === 'СС';
                    const isHandoff = task.isRinatHandoff;
                    const execMeta = EXECUTOR_META[task.executor as SSExecutor] || EXECUTOR_META['Ринат'];

                    const displayStart = task.startDay || 1;
                    const displayEnd = task.endDay || displayStart + task.durationDays - 1;
                    const calendarFullStr = getCalendarRange(displayStart, displayEnd);
                    const calendarShortStr = getCalendarRangeShort(displayStart, displayEnd);

                    // Connectivity Lookups:
                    const predId = task.handoffFromEngineerTaskId || (task.dependsOnTaskIds && task.dependsOnTaskIds[0]) || task.prevSequentialTaskId;
                    const predTask = predId ? tasks.find(t => t.id === predId) : null;
                    const rinatHandoffTask = task.handoffToRinatTaskId ? tasks.find(t => t.id === task.handoffToRinatTaskId) : null;
                    const nextTask = task.nextSequentialTaskId ? tasks.find(t => t.id === task.nextSequentialTaskId) : null;

                    // Hover connectivity highlight
                    const isHoveredPred = activeDependencyHoverId
                      ? (() => {
                          const active = tasks.find(t => t.id === activeDependencyHoverId);
                          if (!active) return false;
                          const preds = [active.handoffFromEngineerTaskId, ...(active.dependsOnTaskIds || []), active.prevSequentialTaskId].filter(Boolean);
                          return preds.includes(task.id);
                        })()
                      : false;

                    const isHoveredSucc = activeDependencyHoverId
                      ? (() => {
                          const active = tasks.find(t => t.id === activeDependencyHoverId);
                          if (!active) return false;
                          return active.handoffToRinatTaskId === task.id || active.nextSequentialTaskId === task.id;
                        })()
                      : false;

                    // Multi-line comprehensive description for native browser tooltip
                    const nativeFullTooltip = `${task.name}\n\nРаздел: ${task.majorCategory} · ${task.subsystem}\nИсполнитель: ${task.executor} (${execMeta.competency})\nСроки: ${calendarFullStr} (${task.durationDays} раб. дн.)\n\nПОЛНЫЙ СОСТАВ ЗАДАЧИ:\n• ${task.fullDescription || ''}\n\nВКЛЮЧАЕТ В СОСТАВ АЛЬБОМА:\n${(task.deliverables || []).map(d => '• ' + d).join('\n')}\n\nСВЯЗНОСТЬ ЗАДАЧИ:\n• Предшественник: ${predTask ? `№${predTask.orderNumber} ${predTask.name} (${predTask.executor})` : 'Старт проекта'}\n• Контроль Рината: ${rinatHandoffTask ? `№${rinatHandoffTask.orderNumber} (${rinatHandoffTask.executor})` : 'Нет'}\n• Преемник: ${nextTask ? `№${nextTask.orderNumber} (${nextTask.executor})` : (task.successor || '—')}`;

                    return (
                      <tr
                        key={task.id}
                        className={`transition-colors group hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500' : ''
                        } ${
                          isHoveredPred ? 'bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500 z-10' : ''
                        } ${
                          isHoveredSucc ? 'bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500 z-10' : ''
                        } ${
                          isAps
                            ? 'border-l-4 border-l-red-500'
                            : isCC
                            ? 'border-l-4 border-l-blue-500'
                            : 'border-l-4 border-l-amber-500'
                        }`}
                      >
                        {/* 1. EDITABLE ORDER NUMBER & MOVE UP/DOWN ("нумерация задач должна быть редактируема (1 столбец) и задачи нужно иметь возможность перемещать вверх и вниз относительно текущего положения") */}
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={task.orderNumber}
                              onChange={e => handleUpdateTaskField(task.id, 'orderNumber', e.target.value)}
                              className="w-12 text-center font-mono font-bold text-xs py-1 px-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition shadow-2xs"
                              title="Редактируемый номер задачи (кликните для изменения)"
                              placeholder="№"
                            />
                            <div className="flex flex-col -space-y-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveTask(task.id, 'up')}
                                disabled={taskIndex === 0}
                                className={`p-0.5 rounded transition ${
                                  taskIndex === 0
                                    ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95'
                                }`}
                                title="Переместить задачу вверх относительно текущего положения"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveTask(task.id, 'down')}
                                disabled={taskIndex === filteredTasks.length - 1}
                                className={`p-0.5 rounded transition ${
                                  taskIndex === filteredTasks.length - 1
                                    ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95'
                                }`}
                                title="Переместить задачу вниз относительно текущего положения"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2. Block (Editable Select) */}
                        <td className="py-2.5 px-2">
                          <select
                            value={task.blockNumber || task.targetBlocks}
                            onChange={e => handleUpdateTaskField(task.id, 'blockNumber', e.target.value)}
                            className="w-full text-[11px] font-bold py-1 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition"
                            title="Изменить блок ЖК для задачи"
                          >
                            {SS_BLOCK_GROUPS.map(bg => (
                              <option key={bg.key} value={bg.shortLabel}>
                                {bg.shortLabel}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Major category (Editable Select with Red for APS and Blue for CC) */}
                        <td className="py-2.5 px-2">
                          <select
                            value={task.majorCategory}
                            onChange={e => handleUpdateTaskField(task.id, 'majorCategory', e.target.value as SSMajorCategory)}
                            className={`text-[10px] font-black py-1 px-1.5 rounded-md border cursor-pointer transition ${
                              isAps
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                                : isCC
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}
                            title="Сменить раздел (АПС - красный заголовок, СС - синий заголовок)"
                          >
                            <option value="АПС">АПС</option>
                            <option value="СС">СС</option>
                            <option value="НСС_Выпуск">НСС / Альбом</option>
                          </select>
                        </td>

                        {/* 4. TASK TITLE (INLINE EDITABLE, RED FOR APS, BLUE FOR CC, FULL TOOLTIP ON HOVER) */}
                        {/* "заголовок строки окрашивать в красный цвет, если задача - АПС, и в синий - если СС." */}
                        {/* "почему-то при наведении курсора на задачу видна только ее часть, например, 'АПС: расстановка извещателей и СОУЭ', а должно быть полнее" */}
                        <td className="py-2.5 px-3">
                          <div
                            className="relative flex items-center gap-1.5 group/name"
                            onMouseEnter={e => {
                              setHoveredTask(task);
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseMove={e => {
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => setHoveredTask(null)}
                          >
                            <input
                              type="text"
                              value={task.name}
                              onChange={e => handleUpdateTaskField(task.id, 'name', e.target.value)}
                              className={`flex-1 text-[12px] font-bold py-1 px-1.5 rounded-md border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 bg-transparent transition ${
                                task.isCompleted
                                  ? 'line-through opacity-70'
                                  : isAps
                                  ? 'text-red-700 dark:text-red-400 hover:text-red-800'
                                  : isCC
                                  ? 'text-blue-700 dark:text-blue-400 hover:text-blue-800'
                                  : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
                              }`}
                              title="Кликните для редактирования наименования задачи"
                            />
                            <button
                              type="button"
                              onClick={() => setDateEditingTask(task)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 transition shrink-0 opacity-40 hover:opacity-100"
                              title="Открыть окно редактирования задачи"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-md pl-1.5">
                            {task.fullDescription || task.notes}
                          </span>
                        </td>

                        {/* 5. EXECUTOR SELECTOR (COLORED IN ACCORDANCE WITH EXECUTOR'S COLOR) */}
                        {/* "на вкладке выбора ответственного покрашивать в соответствии с цветом исполнителя" */}
                        <td className="py-2.5 px-3">
                          <div className="relative">
                            <select
                              value={task.executor}
                              onChange={e => handleUpdateExecutor(task.id, e.target.value as SSExecutor)}
                              className={`w-full text-xs font-bold py-1 px-2 rounded-lg border cursor-pointer transition shadow-2xs ${execMeta.badgeBg} ${execMeta.color} ${execMeta.border}`}
                            >
                              <option value="Ринат">Ринат (Ведущий)</option>
                              <option value="Жансулу">Жансулу (АПС, СС)</option>
                              <option value="Диляра">Диляра (АПС, СС)</option>
                            </select>
                          </div>
                        </td>

                        {/* 6. DURATION (INTERACTIVE DURATION STEPPER: - / input / + WITH DYNAMIC CASCADE) */}
                        {/* "например, я хочу иметь возможность сократить количество дней на выполнение той или иной задачи... при этом это изменение корректирует последующие связные задачи" */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex items-center justify-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                            <button
                              onClick={() => handleUpdateDuration(task.id, Math.max(1, task.durationDays - 1))}
                              className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs transition"
                              title="Сократить срок на 1 день (динамически корректирует связные задачи)"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="45"
                              value={task.durationDays}
                              onChange={e => handleUpdateDuration(task.id, parseInt(e.target.value, 10) || 1)}
                              className="w-9 text-center font-mono text-[11px] font-bold py-0.5 bg-transparent border-none tabular-nums focus:outline-hidden text-slate-800 dark:text-slate-200"
                              title="Введите количество дней: связные задачи автоматически скорректируются"
                            />
                            <button
                              onClick={() => handleUpdateDuration(task.id, task.durationDays + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs transition"
                              title="Увеличить срок на 1 день (динамически корректирует связные задачи)"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* 7. CALENDAR SCHEDULE (DIRECT TEXT INPUTS, STEPPERS & CALENDAR POPUP) */}
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1">
                            {/* Decrement start date */}
                            <button
                              onClick={() => handleShiftTaskDays(task.id, -1)}
                              disabled={(task.startDay || 1) <= 1}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 disabled:opacity-30 transition shrink-0"
                              title="-1 рабочий день"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>

                            {/* Direct Start Date Text Input */}
                            <input
                              type="text"
                              defaultValue={getCalendarDateShort(displayStart)}
                              key={`t-start-${task.id}-${displayStart}`}
                              onBlur={e => {
                                const parsed = parseDayFromText(e.target.value);
                                if (parsed) {
                                  handleUpdateTaskDates(task.id, parsed);
                                } else {
                                  e.target.value = getCalendarDateShort(displayStart);
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-12 text-center font-mono font-bold text-[11px] py-0.5 px-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                              title="Дата начала (введите текстом, например 01.10 или 01.10.2026)"
                              placeholder="ДД.ММ"
                            />

                            <span className="text-slate-400 font-bold text-[10px]">–</span>

                            {/* Direct End Date Text Input */}
                            <input
                              type="text"
                              defaultValue={getCalendarDateShort(displayEnd)}
                              key={`t-end-${task.id}-${displayEnd}`}
                              onBlur={e => {
                                const parsedEnd = parseDayFromText(e.target.value);
                                if (parsedEnd && parsedEnd >= displayStart) {
                                  const newDur = Math.max(1, parsedEnd - displayStart + 1);
                                  handleUpdateDuration(task.id, newDur);
                                } else {
                                  e.target.value = getCalendarDateShort(displayEnd);
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-12 text-center font-mono font-bold text-[11px] py-0.5 px-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                              title="Дата окончания (введите текстом, например 15.10 — длительность пересчитается автоматически)"
                              placeholder="ДД.ММ"
                            />

                            {/* Increment start date */}
                            <button
                              onClick={() => handleShiftTaskDays(task.id, 1)}
                              disabled={(task.endDay || 1) >= TOTAL_TIMELINE_DAYS}
                              className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 disabled:opacity-30 transition shrink-0"
                              title="+1 рабочий день"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            {/* Modal Trigger for detailed calendar popup */}
                            <button
                              type="button"
                              onClick={() => setDateEditingTask(task)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition shrink-0"
                              title="Открыть окно точной настройки дат в календаре"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 8. CONNECTIVITY & DEPENDENCIES (REFLECT & ADJUST: "не могу поправить связность своей задачи (необходимо предусмотреть возможность отражения связности и ее корректировки)") */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center flex-wrap gap-1">
                              {/* Predecessor Badge */}
                              {predTask ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTaskId(predTask.id)}
                                  onMouseEnter={() => setActiveDependencyHoverId(predTask.id)}
                                  onMouseLeave={() => setActiveDependencyHoverId(null)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition truncate max-w-[140px]"
                                  title={`Предшественник: №${predTask.orderNumber} ${predTask.name} (${predTask.executor})\nКликните для выбора этой задачи`}
                                >
                                  <span className="opacity-70 font-sans">⤹</span>
                                  <span>№{predTask.orderNumber}</span>
                                  <span className="truncate">{predTask.executor}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                  <span>⤹</span>
                                  <span>Старт</span>
                                </span>
                              )}

                              {/* Rinat Handoff Badge */}
                              {rinatHandoffTask && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTaskId(rinatHandoffTask.id)}
                                  onMouseEnter={() => setActiveDependencyHoverId(rinatHandoffTask.id)}
                                  onMouseLeave={() => setActiveDependencyHoverId(null)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition truncate max-w-[140px]"
                                  title={`Передача Ринату: №${rinatHandoffTask.orderNumber} ${rinatHandoffTask.name}\nКликните для выбора задачи проверки`}
                                >
                                  <span className="opacity-70 font-sans">➔</span>
                                  <UserCheck className="w-2.5 h-2.5 text-amber-600" />
                                  <span>№{rinatHandoffTask.orderNumber} Ринат</span>
                                </button>
                              )}

                              {/* Next task in sequence */}
                              {nextTask && nextTask.id !== rinatHandoffTask?.id && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTaskId(nextTask.id)}
                                  onMouseEnter={() => setActiveDependencyHoverId(nextTask.id)}
                                  onMouseLeave={() => setActiveDependencyHoverId(null)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition truncate max-w-[120px]"
                                  title={`Следующая задача: №${nextTask.orderNumber} ${nextTask.name}`}
                                >
                                  <span>⇥</span>
                                  <span>№{nextTask.orderNumber}</span>
                                </button>
                              )}

                              {/* Interactive configure dependency button */}
                              <button
                                type="button"
                                onClick={() => setDependencyEditingTaskId(task.id)}
                                className="p-1 px-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition shadow-2xs flex items-center gap-1 text-[10px] font-bold"
                                title="Настроить связность задачи: изменить предшественника, контроль Рината или преемника"
                              >
                                <Link2 className="w-3 h-3" />
                                <span>Связи</span>
                              </button>
                            </div>

                            {/* Transition Note */}
                            <input
                              type="text"
                              value={task.successor || task.transitionNote || ''}
                              onChange={e => {
                                handleUpdateTaskField(task.id, 'successor', e.target.value);
                                handleUpdateTaskField(task.id, 'transitionNote', e.target.value);
                              }}
                              placeholder="Условие перехода..."
                              className="w-full py-0.5 px-1.5 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
                              title="Редактировать текстовое условие перехода"
                            />
                          </div>
                        </td>

                        {/* 9. STATUS (EDITABLE SELECT WITH COMPLETED TOGGLE) */}
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={task.statusText || (task.isCompleted ? 'Сделано' : 'Не начато')}
                            onChange={e => {
                              const val = e.target.value;
                              const isDone = val === 'Сделано';
                              handleUpdateTaskField(task.id, 'statusText', val);
                              handleUpdateTaskField(task.id, 'isCompleted', isDone);
                            }}
                            className={`text-[10px] font-bold py-1 px-2 rounded-lg border transition cursor-pointer ${
                              task.isCompleted
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : task.statusText === 'В процессе'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : task.statusText === 'На проверке'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="Не начато">Не начато</option>
                            <option value="В процессе">В процессе</option>
                            <option value="На проверке">На проверке</option>
                            <option value="Сделано">Сделано</option>
                          </select>
                        </td>

                        {/* 10. ACTIONS (MOVE UP/DOWN, EDIT, DEPENDENCIES, DELETE: "перемещать вверх и вниз") */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, 'up')}
                              disabled={taskIndex === 0}
                              className={`p-1.5 rounded-lg transition ${
                                taskIndex === 0
                                  ? 'opacity-20 cursor-not-allowed text-slate-400'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
                              }`}
                              title="Переместить задачу выше (Вверх)"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, 'down')}
                              disabled={taskIndex === filteredTasks.length - 1}
                              className={`p-1.5 rounded-lg transition ${
                                taskIndex === filteredTasks.length - 1
                                  ? 'opacity-20 cursor-not-allowed text-slate-400'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
                              }`}
                              title="Переместить задачу ниже (Вниз)"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDateEditingTask(task)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                              title="Редактировать параметры задачи"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDependencyEditingTaskId(task.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                              title="Настроить связность и созависимости"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskToDelete(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Удалить задачу из графика"
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
            </table>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* GANTT VIEW WITH CALENDAR WEEKS 1–13 (UP TO 25.12.2026)    */
        /* WITH WEEK CLICK TO ZOOM & DRAGGABLE BARS                 */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {/* Zoom notice */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Кликните на заголовок любой недели (Нед. 1–13) для увеличения масштаба. Потяните плашку задачи мышкой для переноса даты.
              </span>
            </span>
            {selectedWeekZoom !== null && (
              <button
                onClick={() => setSelectedWeekZoom(null)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                Сбросить масштаб
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Gantt Header: Two tiers (Weeks + Days) */}
              <div className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                {/* Tier 1: Weeks */}
                <div className="grid grid-cols-12 divide-x divide-slate-300 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <div className="col-span-3 p-2 text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-900/80">
                    Задачи раздела СС & АПС
                  </div>
                  <div className="col-span-9 grid grid-flow-col auto-cols-fr divide-x divide-slate-300 dark:divide-slate-700">
                    {(selectedWeekZoom !== null
                      ? GANTT_WEEKS.filter(w => w.weekNum === selectedWeekZoom)
                      : GANTT_WEEKS
                    ).map(week => (
                      <button
                        key={week.weekNum}
                        onClick={() => setSelectedWeekZoom(selectedWeekZoom === week.weekNum ? null : week.weekNum)}
                        className={`p-2 text-center font-bold transition hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer ${
                          week.headerBg
                        } ${selectedWeekZoom === week.weekNum ? 'ring-2 ring-indigo-500 z-10' : ''}`}
                        title="Нажмите для увеличения масштаба этой недели"
                      >
                        <span className="truncate">{week.label}</span>
                        <ZoomIn className="w-3 h-3 opacity-60 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier 2: Specific Calendar Dates (NO ordinal day numbers!) */}
                {/* "в диаграмме ганта нумерация дней не должна отражать его порядковый номер, а именно что конкретную дату с выделением цветами понедельно" */}
                <div className="grid grid-cols-12 divide-x divide-slate-200 dark:divide-slate-700 text-[10px] font-mono">
                  <div className="col-span-3 p-1.5 px-3 text-slate-500 dark:text-slate-400 bg-slate-150/60 dark:bg-slate-900/50">
                    Исполнитель & Сроки
                  </div>
                  <div className="col-span-9 grid grid-flow-col auto-cols-fr divide-x divide-slate-200/80 dark:divide-slate-700/80 text-center">
                    {(selectedWeekZoom !== null
                      ? TIMELINE_DAYS.filter((_, idx) => {
                          const w = GANTT_WEEKS.find(wk => wk.weekNum === selectedWeekZoom);
                          return w && idx >= w.startIdx && idx <= w.endIdx;
                        })
                      : TIMELINE_DAYS
                    ).map((day, idx) => {
                      const week = GANTT_WEEKS.find(w => day.weekNumber === w.weekNum)!;
                      const dayOfWeek = getDayOfWeekName(day.dateStr);
                      const isMonday = dayOfWeek === 'Пн';

                      return (
                        <div
                          key={day.dateStr + idx}
                          className={`py-1 px-0.5 truncate ${
                            isMonday ? 'font-black text-slate-900 dark:text-white bg-slate-200/50' : 'text-slate-600 dark:text-slate-400'
                          } ${week.stripeBg}`}
                          title={`${day.dateStr} (${dayOfWeek}), Неделя ${day.weekNumber}`}
                        >
                          <span className="block font-sans text-[9px] text-slate-400">{dayOfWeek}</span>
                          <span className="font-bold">{day.dateStr.slice(0, 5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="divide-y divide-slate-150 dark:divide-slate-800">
                {filteredTasks.map((task, taskIndex) => {
                  const isAps = task.majorCategory === 'АПС';
                  const isCC = task.majorCategory === 'СС';
                  const execMeta = EXECUTOR_META[task.executor as SSExecutor] || EXECUTOR_META['Ринат'];
                  const isDraggingThis = dragState?.taskId === task.id;
                  const displayDuration = isDraggingThis ? dragState.currentDurationDays : task.durationDays;
                  const displayStart = isDraggingThis ? dragState.currentStartDay : (task.startDay || 1);
                  const displayEnd = displayStart + displayDuration - 1;

                  // Connectivity lookups
                  const predId = task.handoffFromEngineerTaskId || (task.dependsOnTaskIds && task.dependsOnTaskIds[0]) || task.prevSequentialTaskId;
                  const predTask = predId ? tasks.find(t => t.id === predId) : null;
                  const rinatHandoffTask = task.handoffToRinatTaskId ? tasks.find(t => t.id === task.handoffToRinatTaskId) : null;
                  const nextTask = task.nextSequentialTaskId ? tasks.find(t => t.id === task.nextSequentialTaskId) : null;

                  const isHoveredPred = activeDependencyHoverId
                    ? (() => {
                        const active = tasks.find(t => t.id === activeDependencyHoverId);
                        if (!active) return false;
                        const preds = [active.handoffFromEngineerTaskId, ...(active.dependsOnTaskIds || []), active.prevSequentialTaskId].filter(Boolean);
                        return preds.includes(task.id);
                      })()
                    : false;

                  const isHoveredSucc = activeDependencyHoverId
                    ? (() => {
                        const active = tasks.find(t => t.id === activeDependencyHoverId);
                        if (!active) return false;
                        return active.handoffToRinatTaskId === task.id || active.nextSequentialTaskId === task.id;
                      })()
                    : false;

                  // Visible bounds in Gantt
                  const activeWeek = selectedWeekZoom !== null
                    ? GANTT_WEEKS.find(w => w.weekNum === selectedWeekZoom)
                    : null;

                  const timelineStart = activeWeek ? activeWeek.startIdx + 1 : 1;
                  const timelineEnd = activeWeek ? activeWeek.endIdx + 1 : TOTAL_TIMELINE_DAYS;
                  const totalVisibleDays = timelineEnd - timelineStart + 1;

                  const barLeftPct = Math.max(0, ((displayStart - timelineStart) / totalVisibleDays) * 100);
                  const barWidthPct = Math.min(
                    100 - barLeftPct,
                    Math.max(2.5, (displayDuration / totalVisibleDays) * 100)
                  );

                  return (
                    <div
                      key={task.id}
                      className={`grid grid-cols-12 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        isHoveredPred
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500 z-10'
                          : isHoveredSucc
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500 z-10'
                          : ''
                      } ${
                        isAps ? 'border-l-4 border-l-red-500' : isCC ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-amber-500'
                      }`}
                    >
                      {/* Left: Task Name & Executor Select */}
                      <div className="col-span-3 p-2.5 flex items-center justify-between gap-2 border-r border-slate-200 dark:border-slate-800">
                        {/* Number & Up/Down in Gantt row */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="text"
                            value={task.orderNumber}
                            onChange={e => handleUpdateTaskField(task.id, 'orderNumber', e.target.value)}
                            className="w-9 text-center font-mono font-bold text-[10px] py-0.5 px-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                            title="Номер задачи (редактируемый)"
                          />
                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, 'up')}
                              disabled={taskIndex === 0}
                              className={`p-0.5 rounded transition ${
                                taskIndex === 0
                                  ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                  : 'text-slate-400 hover:text-blue-600'
                              }`}
                              title="Переместить задачу выше"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, 'down')}
                              disabled={taskIndex === filteredTasks.length - 1}
                              className={`p-0.5 rounded transition ${
                                taskIndex === filteredTasks.length - 1
                                  ? 'opacity-20 cursor-not-allowed text-slate-300 dark:text-slate-700'
                                  : 'text-slate-400 hover:text-blue-600'
                              }`}
                              title="Переместить задачу ниже"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="truncate flex-1">
                          <input
                            type="text"
                            value={task.name}
                            onChange={e => handleUpdateTaskField(task.id, 'name', e.target.value)}
                            className={`font-bold truncate block text-xs bg-transparent border-none p-0 focus:outline-hidden w-full ${
                              isAps
                                ? 'text-red-700 dark:text-red-400'
                                : isCC
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                            title="Кликните для редактирования наименования"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {getCalendarRangeShort(displayStart, displayEnd)} · <strong className="text-slate-700 dark:text-slate-300">{displayDuration} дн.</strong>
                            </span>

                            {/* Connectivity mini-badges */}
                            {predTask && (
                              <button
                                type="button"
                                onClick={() => setSelectedTaskId(predTask.id)}
                                onMouseEnter={() => setActiveDependencyHoverId(predTask.id)}
                                onMouseLeave={() => setActiveDependencyHoverId(null)}
                                className="text-[9px] font-mono font-bold px-1 rounded bg-blue-50 text-blue-700 border border-blue-200/60 truncate max-w-[70px]"
                                title={`Предшественник: №${predTask.orderNumber} (${predTask.executor})`}
                              >
                                ⤹ №{predTask.orderNumber}
                              </button>
                            )}

                            {rinatHandoffTask && (
                              <button
                                type="button"
                                onClick={() => setSelectedTaskId(rinatHandoffTask.id)}
                                onMouseEnter={() => setActiveDependencyHoverId(rinatHandoffTask.id)}
                                onMouseLeave={() => setActiveDependencyHoverId(null)}
                                className="text-[9px] font-mono font-bold px-1 rounded bg-amber-50 text-amber-700 border border-amber-200/60 truncate max-w-[70px]"
                                title={`Передача на контроль: №${rinatHandoffTask.orderNumber} (Ринат)`}
                              >
                                ➔ Ринат
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDependencyEditingTaskId(task.id)}
                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 ml-auto"
                              title="Настроить связность этой задачи"
                            >
                              <Link2 className="w-2.5 h-2.5" />
                              <span>Связи</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Executor selector */}
                          <select
                            value={task.executor}
                            onChange={e => handleUpdateExecutor(task.id, e.target.value as SSExecutor)}
                            className={`text-[10px] font-bold py-0.5 px-1.5 rounded border cursor-pointer ${execMeta.badgeBg} ${execMeta.color} ${execMeta.border}`}
                          >
                            <option value="Ринат">Ринат</option>
                            <option value="Жансулу">Жансулу</option>
                            <option value="Диляра">Диляра</option>
                          </select>

                          {/* Quick Edit & Delete */}
                          <button
                            type="button"
                            onClick={() => setDateEditingTask(task)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Редактировать параметры задачи"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Удалить задачу из графика"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Gantt Track with Interactive Resizing & Dragging */}
                      <div
                        ref={el => {
                          trackRefs.current[`gantt-${task.id}`] = el;
                        }}
                        className="col-span-9 relative h-11 flex items-center select-none"
                      >
                        {/* Task Bar */}
                        <div
                          onMouseDown={e => {
                            e.stopPropagation();
                            const trackEl = trackRefs.current[`gantt-${task.id}`];
                            if (!trackEl) return;
                            const rect = trackEl.getBoundingClientRect();
                            setDragState({
                              type: 'move',
                              taskId: task.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              initialStartDay: task.startDay || 1,
                              initialDurationDays: task.durationDays,
                              currentStartDay: task.startDay || 1,
                              currentDurationDays: task.durationDays,
                              trackWidth: rect.width,
                            });
                          }}
                          className={`absolute h-7 rounded-lg text-[10px] font-bold text-white flex items-center px-3 shadow-sm transition-all overflow-visible cursor-grab active:cursor-grabbing group/bar ${
                            task.executor === 'Ринат'
                              ? 'bg-amber-500 hover:bg-amber-600'
                              : task.executor === 'Жансулу'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          } ${task.isCompleted ? 'ring-2 ring-emerald-300' : ''} ${
                            isDraggingThis ? 'ring-2 ring-white scale-[1.02] z-40 shadow-xl' : ''
                          }`}
                          style={{
                            left: `${barLeftPct}%`,
                            width: `${barWidthPct}%`,
                            transform: isDraggingThis && dragState?.currentY ? `translateY(${dragState.currentY}px)` : undefined,
                          }}
                          title={`${task.name}\nИсполнитель: ${task.executor} (${execMeta.competency})\nДаты: ${getCalendarRange(displayStart, displayEnd)}\nПотяните правый край для сокращения/удлинения срока задачи\nПотяните блок для переноса дат`}
                        >
                          {/* Live tooltip while dragging/resizing */}
                          {isDraggingThis && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-bold whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none z-40 flex items-center gap-1.5">
                              <span>{displayDuration} дн.</span>
                              <span>·</span>
                              <span>{getCalendarRangeShort(displayStart, displayEnd)}</span>
                            </div>
                          )}

                          {/* LEFT RESIZE HANDLE (change start date) */}
                          <div
                            onMouseDown={e => {
                              e.stopPropagation();
                              const trackEl = trackRefs.current[`gantt-${task.id}`];
                              if (!trackEl) return;
                              const rect = trackEl.getBoundingClientRect();
                              setDragState({
                                type: 'resize-left',
                                taskId: task.id,
                                startX: e.clientX,
                                initialStartDay: task.startDay || 1,
                                initialDurationDays: task.durationDays,
                                currentStartDay: task.startDay || 1,
                                currentDurationDays: task.durationDays,
                                trackWidth: rect.width,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center rounded-l-lg z-20 group/l"
                            title="Потяните для изменения даты начала"
                          >
                            <div className="w-1 h-3.5 bg-white/70 rounded-full group-hover/l:bg-white transition" />
                          </div>

                          <MoveHorizontal className="w-3 h-3 mr-1 opacity-80 shrink-0 pointer-events-none" />
                          <span className="truncate pointer-events-none pr-3">
                            {task.executor} ({displayDuration} дн.)
                          </span>

                          {/* RIGHT RESIZE HANDLE (shorten / lengthen duration: "сокращая или удлиняя блоки") */}
                          <div
                            onMouseDown={e => {
                              e.stopPropagation();
                              const trackEl = trackRefs.current[`gantt-${task.id}`];
                              if (!trackEl) return;
                              const rect = trackEl.getBoundingClientRect();
                              setDragState({
                                type: 'resize-right',
                                taskId: task.id,
                                startX: e.clientX,
                                initialStartDay: task.startDay || 1,
                                initialDurationDays: task.durationDays,
                                currentStartDay: task.startDay || 1,
                                currentDurationDays: task.durationDays,
                                trackWidth: rect.width,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-3.5 cursor-col-resize hover:bg-black/25 dark:hover:bg-white/25 flex items-center justify-center rounded-r-lg z-20 group/r"
                            title="Потяните для сокращения или удлинения задачи (изменение количества дней)"
                          >
                            <div className="w-1.5 h-3.5 bg-white/80 rounded-full group-hover/r:bg-white group-hover/r:scale-110 transition shadow-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FLOATING COMPREHENSIVE HOVER TOOLTIP (FIXED PORTAL)    */}
      {/* ======================================================== */}
      {/* "почему-то при наведении курсора на задачу видна только ее часть, например, 'АПС: расстановка извещателей и СОУЭ', а должно быть полнее" */}
      {hoveredTask && (
        <div
          className="fixed z-50 p-4 rounded-xl bg-slate-900/95 text-white shadow-2xl border border-slate-700 backdrop-blur-md pointer-events-none max-w-md w-96 animate-in fade-in duration-150"
          style={{
            left: Math.min(window.innerWidth - 410, mousePos.x + 15),
            top: Math.min(window.innerHeight - 320, mousePos.y + 15),
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  hoveredTask.majorCategory === 'АПС'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : hoveredTask.majorCategory === 'СС'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {hoveredTask.blockNumber || hoveredTask.targetBlocks} · {hoveredTask.majorCategory}
              </span>
              <h4 className="text-xs font-bold text-white mt-1">
                {hoveredTask.name}
              </h4>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                EXECUTOR_META[hoveredTask.executor as SSExecutor]?.badgeBg || 'bg-slate-800'
              } ${EXECUTOR_META[hoveredTask.executor as SSExecutor]?.color || 'text-white'}`}
            >
              {hoveredTask.executor}
            </span>
          </div>

          {/* Full description */}
          <div className="space-y-2 text-[11px]">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">
                Полный состав задачи:
              </span>
              <p className="text-slate-200 leading-relaxed bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                {hoveredTask.fullDescription || hoveredTask.notes}
              </p>
            </div>

            {/* Deliverables checklist */}
            {hoveredTask.deliverables && hoveredTask.deliverables.length > 0 && (
              <div>
                <span className="text-slate-400 font-semibold block mb-1">
                  Включает в состав альбома:
                </span>
                <ul className="space-y-1">
                  {hoveredTask.deliverables.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-slate-300">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dates & transitions */}
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Сроки: {getCalendarRange(hoveredTask.startDay, hoveredTask.endDay)}</span>
              <span>{hoveredTask.durationDays} раб. дней</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. GOOGLE SHEETS SYNC MODAL («СС old» TAB)              */}
      {/* ======================================================== */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600 text-white">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Синхронизация с Google Таблицей («СС old»)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Экспорт и двусторонняя синхронизация графика раздела СС
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Auth Status */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {googleUser ? (
                    <>
                      <img
                        src={googleUser.photoURL || 'https://www.gravatar.com/avatar?d=mp'}
                        alt=""
                        className="w-8 h-8 rounded-full border border-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {googleUser.displayName || googleUser.email}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3" />
                          Авторизован в Google (доступ к таблицам разрешен)
                        </span>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Вход в Google не выполнен
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Войдите через Google для записи на вкладку «СС old»
                      </span>
                    </div>
                  )}
                </div>

                {googleUser ? (
                  <button
                    onClick={handleGoogleLogout}
                    className="px-2.5 py-1 text-[11px] rounded font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    Выйти
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Войти через Google
                  </button>
                )}
              </div>

              {/* Spreadsheet ID / Link Input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Ссылка на Google Таблицу или её ID:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="https://docs.google.com/spreadsheets/d/... или ID"
                    value={spreadsheetIdInput}
                    onChange={e => {
                      const val = e.target.value;
                      setSpreadsheetIdInput(val);
                      localStorage.setItem('ss_google_spreadsheet_id', val);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                  {spreadsheetIdInput && (
                    <a
                      href={
                        spreadsheetIdInput.startsWith('http')
                          ? spreadsheetIdInput
                          : `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(spreadsheetIdInput)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      title="Открыть таблицу в новой вкладке"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  В таблице автоматически будет создана или обновлена вкладка «СС old» с сохранением форматирования, цветов АПС (красный) и СС (синий).
                </p>
              </div>

              {/* Status report */}
              {googleSyncStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                  {isSyncingGoogle ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{googleSyncStatus}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={isSyncingGoogle}
                    onClick={() => {
                      if (!googleUser) {
                        handleGoogleLogin();
                        return;
                      }
                      setConfirmDestructiveModal({
                        action: 'export',
                        description: `Выгрузить текущий график (${tasks.length} задач, даты до 25.12.2026) на вкладку «СС old» Google Таблицы? Содержимое вкладки будет обновлено.`,
                      });
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition"
                  >
                    <Upload className="w-4 h-4" />
                    Экспорт на вкладку «СС old»
                  </button>

                  <button
                    disabled={isSyncingGoogle}
                    onClick={() => {
                      if (!googleUser) {
                        handleGoogleLogin();
                        return;
                      }
                      setConfirmDestructiveModal({
                        action: 'import',
                        description: `Импортировать изменения из вкладки «СС old» Google Таблицы? Будут обновлены исполнители, статусы и сроки соответствующих задач.`,
                      });
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition"
                  >
                    <Download className="w-4 h-4" />
                    Импорт изменений из «СС old»
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                  <button
                    onClick={handleCreateNewSheet}
                    disabled={isSyncingGoogle || !googleUser}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Создать новую Google Таблицу («СС old»)
                  </button>

                  <button
                    onClick={handleCopyTsvForGoogleSheets}
                    className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Копировать для вставки через буфер
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MANDATORY CONFIRMATION DIALOG FOR MUTATING OPERATIONS  */}
      {/* (AS ENFORCED BY WORKSPACE INTEGRATION CONSTITUTION)      */}
      {/* ======================================================== */}
      {confirmDestructiveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Подтверждение операции с Google Sheets
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {confirmDestructiveModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <button
                onClick={() => setConfirmDestructiveModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (confirmDestructiveModal.action === 'export') {
                    handlePerformExport();
                  } else {
                    handlePerformImport();
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                Подтвердить и выполнить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. QUICK CALENDAR DATE EDIT POPOVER MODAL                */}
      {/* ======================================================== */}
      {dateEditingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    dateEditingTask.majorCategory === 'АПС'
                      ? 'bg-red-100 text-red-700'
                      : dateEditingTask.majorCategory === 'СС'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {dateEditingTask.majorCategory}
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  Редактирование задачи
                </h4>
              </div>
              <button
                onClick={() => setDateEditingTask(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Order Number & Name */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    № Номер:
                  </label>
                  <input
                    type="text"
                    value={dateEditingTask.orderNumber}
                    onChange={e => {
                      const val = e.target.value;
                      handleUpdateTaskField(dateEditingTask.id, 'orderNumber', val);
                      setDateEditingTask(prev => (prev ? { ...prev, orderNumber: val } : null));
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-center"
                    placeholder="1."
                    title="Номер задачи (редактируемый)"
                  />
                </div>
                <div className="col-span-3">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Наименование задачи:
                  </label>
                  <input
                    type="text"
                    value={dateEditingTask.name}
                    onChange={e => {
                      const val = e.target.value;
                      handleUpdateTaskField(dateEditingTask.id, 'name', val);
                      setDateEditingTask(prev => (prev ? { ...prev, name: val } : null));
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Category & Block */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Раздел:
                  </label>
                  <select
                    value={dateEditingTask.majorCategory}
                    onChange={e => {
                      const cat = e.target.value as SSMajorCategory;
                      handleUpdateTaskField(dateEditingTask.id, 'majorCategory', cat);
                      setDateEditingTask(prev => (prev ? { ...prev, majorCategory: cat } : null));
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="АПС">АПС (красный)</option>
                    <option value="СС">СС (синий)</option>
                    <option value="НСС_Выпуск">НСС / Альбом</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Блок ЖК:
                  </label>
                  <select
                    value={dateEditingTask.blockNumber || dateEditingTask.targetBlocks}
                    onChange={e => {
                      const val = e.target.value;
                      handleUpdateTaskField(dateEditingTask.id, 'blockNumber', val);
                      setDateEditingTask(prev => (prev ? { ...prev, blockNumber: val } : null));
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    {SS_BLOCK_GROUPS.map(bg => (
                      <option key={bg.key} value={bg.shortLabel}>
                        {bg.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Executor & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Исполнитель:
                  </label>
                  <select
                    value={dateEditingTask.executor}
                    onChange={e => {
                      const exec = e.target.value as SSExecutor;
                      handleUpdateExecutor(dateEditingTask.id, exec);
                      setDateEditingTask(prev => (prev ? { ...prev, executor: exec, responsible: exec } : null));
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Ринат">Ринат</option>
                    <option value="Жансулу">Жансулу</option>
                    <option value="Диляра">Диляра</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Статус:
                  </label>
                  <select
                    value={dateEditingTask.statusText || (dateEditingTask.isCompleted ? 'Сделано' : 'Не начато')}
                    onChange={e => {
                      const val = e.target.value;
                      const isDone = val === 'Сделано';
                      handleUpdateTaskField(dateEditingTask.id, 'statusText', val);
                      handleUpdateTaskField(dateEditingTask.id, 'isCompleted', isDone);
                      setDateEditingTask(prev =>
                        prev ? { ...prev, statusText: val, isCompleted: isDone } : null
                      );
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Не начато">Не начато</option>
                    <option value="В процессе">В процессе</option>
                    <option value="На проверке">На проверке</option>
                    <option value="Сделано">Сделано</option>
                  </select>
                </div>
              </div>

              {/* DATE & DURATION SECTION (TEXT INPUTS, CALENDAR PICKER & LIVE RECIPROCAL RECALCULATION) */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Сроки и длительность задачи
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50">
                    {getCalendarRangeShort(dateEditingTask.startDay, dateEditingTask.endDay || (dateEditingTask.startDay + dateEditingTask.durationDays - 1))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Дата начала (текст / выбор):
                    </label>
                    <input
                      type="text"
                      defaultValue={getCalendarDate(dateEditingTask.startDay)}
                      key={`start-${dateEditingTask.id}-${dateEditingTask.startDay}`}
                      onBlur={e => {
                        const parsed = parseDayFromText(e.target.value);
                        if (parsed) {
                          handleUpdateTaskDates(dateEditingTask.id, parsed);
                          setDateEditingTask(prev => prev ? {
                            ...prev,
                            startDay: parsed,
                            endDay: Math.min(TOTAL_TIMELINE_DAYS, parsed + prev.durationDays - 1)
                          } : null);
                        } else {
                          e.target.value = getCalendarDate(dateEditingTask.startDay);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="ДД.ММ или ДД.ММ.ГГГГ"
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      title="Введите дату начала текстом (например: 01.10 или 01.10.2026)"
                    />
                    <select
                      value={dateEditingTask.startDay}
                      onChange={e => {
                        const newStart = Number(e.target.value);
                        handleUpdateTaskDates(dateEditingTask.id, newStart);
                        setDateEditingTask(prev => prev ? {
                          ...prev,
                          startDay: newStart,
                          endDay: Math.min(TOTAL_TIMELINE_DAYS, newStart + prev.durationDays - 1)
                        } : null);
                      }}
                      className="w-full mt-1.5 py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-600 dark:text-slate-400"
                    >
                      {TIMELINE_DAYS.map(d => (
                        <option key={d.dayNumber} value={d.dayNumber}>
                          {d.dateStr} ({getDayOfWeekName(d.dateStr)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Дата окончания (текст / выбор):
                    </label>
                    <input
                      type="text"
                      defaultValue={getCalendarDate(dateEditingTask.endDay || (dateEditingTask.startDay + dateEditingTask.durationDays - 1))}
                      key={`end-${dateEditingTask.id}-${dateEditingTask.endDay || (dateEditingTask.startDay + dateEditingTask.durationDays - 1)}`}
                      onBlur={e => {
                        const parsedEnd = parseDayFromText(e.target.value);
                        if (parsedEnd && parsedEnd >= dateEditingTask.startDay) {
                          const newDur = Math.max(1, parsedEnd - dateEditingTask.startDay + 1);
                          handleUpdateDuration(dateEditingTask.id, newDur);
                          setDateEditingTask(prev => prev ? {
                            ...prev,
                            durationDays: newDur,
                            endDay: parsedEnd
                          } : null);
                        } else {
                          e.target.value = getCalendarDate(dateEditingTask.endDay || (dateEditingTask.startDay + dateEditingTask.durationDays - 1));
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="ДД.ММ или ДД.ММ.ГГГГ"
                      className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      title="Введите дату завершения текстом (например: 15.10 или 15.10.2026)"
                    />
                    <select
                      value={dateEditingTask.endDay || (dateEditingTask.startDay + dateEditingTask.durationDays - 1)}
                      onChange={e => {
                        const newEnd = Number(e.target.value);
                        if (newEnd >= dateEditingTask.startDay) {
                          const newDur = Math.max(1, newEnd - dateEditingTask.startDay + 1);
                          handleUpdateDuration(dateEditingTask.id, newDur);
                          setDateEditingTask(prev => prev ? {
                            ...prev,
                            durationDays: newDur,
                            endDay: newEnd
                          } : null);
                        }
                      }}
                      className="w-full mt-1.5 py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-600 dark:text-slate-400"
                    >
                      {TIMELINE_DAYS.filter(d => d.dayNumber >= dateEditingTask.startDay).map(d => (
                        <option key={d.dayNumber} value={d.dayNumber}>
                          {d.dateStr} ({getDayOfWeekName(d.dateStr)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration with interactive stepper & direct text input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Длительность (рабочих дней):
                    </label>
                    <span className="text-[10px] text-slate-500">
                      изменение пересчитывает дату окончания и связные задачи
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextDur = Math.max(1, (dateEditingTask.durationDays || 1) - 1);
                        handleUpdateDuration(dateEditingTask.id, nextDur);
                        setDateEditingTask(prev => (prev ? {
                          ...prev,
                          durationDays: nextDur,
                          endDay: Math.min(TOTAL_TIMELINE_DAYS, prev.startDay + nextDur - 1)
                        } : null));
                      }}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-sm flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs transition"
                      title="-1 день"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="45"
                      value={dateEditingTask.durationDays}
                      onChange={e => {
                        const newDur = Math.max(1, Number(e.target.value) || 1);
                        handleUpdateDuration(dateEditingTask.id, newDur);
                        setDateEditingTask(prev => (prev ? {
                          ...prev,
                          durationDays: newDur,
                          endDay: Math.min(TOTAL_TIMELINE_DAYS, prev.startDay + newDur - 1)
                        } : null));
                      }}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-800 dark:text-slate-100 shadow-2xs"
                      title="Введите длительность задачи"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextDur = (dateEditingTask.durationDays || 1) + 1;
                        handleUpdateDuration(dateEditingTask.id, nextDur);
                        setDateEditingTask(prev => (prev ? {
                          ...prev,
                          durationDays: nextDur,
                          endDay: Math.min(TOTAL_TIMELINE_DAYS, prev.startDay + nextDur - 1)
                        } : null));
                      }}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-sm flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs transition"
                      title="+1 день"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* CONNECTIVITY & DEPENDENCIES IN QUICK EDIT MODAL */}
              <div className="pt-2 border-t border-slate-150 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    Связность и созависимость
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const taskId = dateEditingTask.id;
                      setDateEditingTask(null);
                      setDependencyEditingTaskId(taskId);
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    Схема связей
                  </button>
                </div>

                {/* Predecessor */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">
                    Предшественник (старт зависит от):
                  </label>
                  <select
                    value={
                      dateEditingTask.handoffFromEngineerTaskId ||
                      (dateEditingTask.dependsOnTaskIds && dateEditingTask.dependsOnTaskIds[0]) ||
                      dateEditingTask.prevSequentialTaskId ||
                      'none'
                    }
                    onChange={e => {
                      const val = e.target.value;
                      handleUpdateTaskConnectivity(dateEditingTask.id, {
                        predecessorTaskId: val,
                      });
                      setDateEditingTask(prev => {
                        if (!prev) return null;
                        const pred = val === 'none' ? undefined : val;
                        return {
                          ...prev,
                          handoffFromEngineerTaskId: pred,
                          dependsOnTaskIds: pred ? [pred] : [],
                          prevSequentialTaskId: pred,
                        };
                      });
                    }}
                    className="w-full py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  >
                    <option value="none">Старт проекта (без предшественника)</option>
                    {tasks
                      .filter(t => t.id !== dateEditingTask.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          №{t.orderNumber} · {t.name.slice(0, 32)} ({t.executor}, до {TIMELINE_DAYS[(t.endDay || 1) - 1]?.dateStr || ''})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Rinat Handoff */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">
                    Передача на контроль Ринату:
                  </label>
                  <select
                    value={dateEditingTask.handoffToRinatTaskId || 'none'}
                    onChange={e => {
                      const val = e.target.value;
                      handleUpdateTaskConnectivity(dateEditingTask.id, {
                        handoffToRinatTaskId: val,
                      });
                      setDateEditingTask(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          handoffToRinatTaskId: val === 'none' ? undefined : val,
                        };
                      });
                    }}
                    className="w-full py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  >
                    <option value="none">Без передачи на контроль</option>
                    {tasks
                      .filter(t => t.executor === 'Ринат' && t.id !== dateEditingTask.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          №{t.orderNumber} · {t.name.slice(0, 32)} (Ринат)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Summary Period */}
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-800 dark:text-indigo-300">
                Итоговый период: <span className="font-bold">{getCalendarRange(dateEditingTask.startDay || 1, (dateEditingTask.startDay || 1) + (dateEditingTask.durationDays || 1) - 1)}</span>
                <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                  ✓ Связные задачи автоматически скорректированы в графике
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const taskToDel = dateEditingTask;
                  setDateEditingTask(null);
                  setTaskToDelete(taskToDel);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-md transition"
                title="Удалить эту задачу из графика"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить задачу</span>
              </button>

              <button
                onClick={() => setDateEditingTask(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
              >
                Сохранить и закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8b. DEDICATED DEPENDENCY & CONNECTIVITY MANAGER MODAL     */}
      {/* "не могу поправить связность своей задачи                */}
      {/* (необходимо предусмотреть возможность отражения связности */}
      {/* и ее корректировки)"                                     */}
      {/* ======================================================== */}
      {dependencyEditingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      №{dependencyEditingTask.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        dependencyEditingTask.majorCategory === 'АПС'
                          ? 'bg-red-100 text-red-700'
                          : dependencyEditingTask.majorCategory === 'СС'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {dependencyEditingTask.majorCategory}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {dependencyEditingTask.executor}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-md">
                    {dependencyEditingTask.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDependencyEditingTaskId(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE CHAIN PIPELINE (VISUAL FLOW) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Визуальная схема связности:</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Срок задачи: {dependencyEditingTask.durationDays} дн.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                {/* Step 1: Predecessor Box */}
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-bold">⤹ Предшественник:</span>
                    {draftPredId !== 'none' ? (
                      (() => {
                        const pred = tasks.find(t => t.id === draftPredId);
                        return pred ? (
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px]">
                            №{pred.orderNumber} {pred.name} ({pred.executor})
                          </span>
                        ) : (
                          <span className="text-slate-400">Не найдено</span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-500 font-medium">Старт проекта (без ожидания)</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {draftPredId !== 'none'
                      ? (() => {
                          const pred = tasks.find(t => t.id === draftPredId);
                          return pred && pred.endDay ? `до ${TIMELINE_DAYS[pred.endDay - 1]?.dateStr}` : '';
                        })()
                      : 'с 01.10'}
                  </span>
                </div>

                <div className="flex justify-center -my-1 text-slate-400">
                  <span className="text-xs">⬇ (завершение задачи запускает следующую)</span>
                </div>

                {/* Step 2: Current Task Box */}
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      ★ ЭТА ЗАДАЧА: №{dependencyEditingTask.orderNumber}
                    </span>
                    <span className="block text-[10px] text-blue-700 dark:text-blue-300">
                      Исполнитель: {dependencyEditingTask.executor} · {dependencyEditingTask.durationDays} рабочих дней
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-900 dark:text-blue-200 text-[11px]">
                    {getCalendarRange(dependencyEditingTask.startDay || 1, (dependencyEditingTask.startDay || 1) + dependencyEditingTask.durationDays - 1)}
                  </span>
                </div>

                <div className="flex justify-center -my-1 text-slate-400">
                  <span className="text-xs">⬇ (передача результатов на контроль)</span>
                </div>

                {/* Step 3: Rinat Handoff & Next Task */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <span className="text-amber-800 dark:text-amber-300 font-bold block text-[10px]">
                      ➔ Контроль Рината:
                    </span>
                    {draftRinatId !== 'none' ? (
                      (() => {
                        const r = tasks.find(t => t.id === draftRinatId);
                        return (
                          <span className="font-semibold text-slate-900 dark:text-white truncate block text-[10px]">
                            {r ? `№${r.orderNumber} (созависима)` : 'Выбрано'}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 text-[10px]">Без передачи</span>
                    )}
                  </div>

                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-bold block text-[10px]">
                      ⇥ Следующая задача:
                    </span>
                    {draftNextId !== 'none' ? (
                      (() => {
                        const n = tasks.find(t => t.id === draftNextId);
                        return (
                          <span className="font-semibold text-slate-900 dark:text-white truncate block text-[10px]">
                            {n ? `№${n.orderNumber} (${n.executor})` : 'Выбрано'}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 text-[10px]">Конец ветки</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FORM CONTROLS */}
            <div className="space-y-3 text-xs">
              {/* 1. Predecessor Select */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Предшествующая задача (старт текущей задачи строго после её сдачи):
                </label>
                <select
                  value={draftPredId}
                  onChange={e => setDraftPredId(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="none">Старт проекта (без ожидания предшественников)</option>
                  {tasks
                    .filter(t => t.id !== dependencyEditingTask.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        №{t.orderNumber} · {t.name} ({t.executor}, завершение: {TIMELINE_DAYS[(t.endDay || 1) - 1]?.dateStr || ''})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  При изменении сроков предшественника дата старта этой задачи скорректируется автоматически.
                </p>
              </div>

              {/* 2. Rinat Review Handoff Select */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Задача контроля Рината (созависима с выполнением этой задачи):
                </label>
                <select
                  value={draftRinatId}
                  onChange={e => setDraftRinatId(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="none">Не передавать на контроль (без связки с Ринатом)</option>
                  {tasks
                    .filter(t => t.executor === 'Ринат' && t.id !== dependencyEditingTask.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        №{t.orderNumber} · {t.name} (Ринат)
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Если переносятся сроки этой задачи, тут же переносится и задача Рината по контролю.
                </p>
              </div>

              {/* 3. Next Sequential Task Select */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  3. Следующая задача в цепочке (преемник):
                </label>
                <select
                  value={draftNextId}
                  onChange={e => setDraftNextId(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="none">Без следующей задачи (финальная в этой ветке)</option>
                  {tasks
                    .filter(t => t.id !== dependencyEditingTask.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        №{t.orderNumber} · {t.name} ({t.executor})
                      </option>
                    ))}
                </select>
              </div>

              {/* 4. Transition Note */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  4. Текстовое примечание связи (для пояснений):
                </label>
                <input
                  type="text"
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  placeholder="Например: Переход к следующему блоку после согласования"
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-150 dark:border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftPredId('none');
                  setDraftRinatId('none');
                  setDraftNextId('none');
                  setDraftNote('');
                  handleUpdateTaskConnectivity(dependencyEditingTask.id, {
                    predecessorTaskId: 'none',
                    handoffToRinatTaskId: 'none',
                    nextSequentialTaskId: 'none',
                    transitionNote: '',
                  });
                  setDependencyEditingTaskId(null);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1"
                title="Разорвать все связки для этой задачи"
              >
                <Unlink className="w-3.5 h-3.5" />
                Разорвать связи
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDependencyEditingTaskId(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateTaskConnectivity(dependencyEditingTask.id, {
                      predecessorTaskId: draftPredId,
                      handoffToRinatTaskId: draftRinatId,
                      nextSequentialTaskId: draftNextId,
                      transitionNote: draftNote,
                    });
                    setDependencyEditingTaskId(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Применить связность и обновить график
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8c. ADD NEW TASK MODAL ("добавлять новые задачи")        */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Добавить новую задачу
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Создание задачи раздела СС/АПС с автоматической созависимостью
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Name */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Наименование задачи: *
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="Например: Блок 2. Разводка магистралей СС и СКУД"
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* 2. Major Category & Subsystem */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    2. Раздел:
                  </label>
                  <select
                    value={newTaskMajorCategory}
                    onChange={e => {
                      const cat = e.target.value as SSMajorCategory;
                      setNewTaskMajorCategory(cat);
                      if (cat === 'АПС') {
                        setNewTaskSubsystem('АПС и СОУЭ');
                      } else if (cat === 'СС') {
                        setNewTaskSubsystem('СС: Телеком, СКУД (Домофония), Видеонаблюдение');
                      }
                    }}
                    className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <option value="СС">СС (Телеком, СКУД, Видео)</option>
                    <option value="АПС">АПС (Пожарная сигнализация)</option>
                    <option value="НСС_Выпуск">НСС / Выпуск альбома</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Подсистема:
                  </label>
                  <select
                    value={newTaskSubsystem}
                    onChange={e => setNewTaskSubsystem(e.target.value as SSSubsystem)}
                    className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer"
                  >
                    <option value="СС: Телеком, СКУД (Домофония), Видеонаблюдение">СС: Телеком, СКУД, Видео</option>
                    <option value="АПС и СОУЭ">АПС и СОУЭ</option>
                    <option value="Контроль загазованности паркинга">Контроль загазованности</option>
                    <option value="Автоматизация НСС и выпуск альбома">Автоматизация НСС / Альбом</option>
                  </select>
                </div>
              </div>

              {/* 3. Block & Executor */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    3. Блок ЖК:
                  </label>
                  <select
                    value={newTaskBlockKey}
                    onChange={e => setNewTaskBlockKey(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {SS_BLOCK_GROUPS.map(bg => (
                      <option key={bg.key} value={bg.key}>
                        {bg.label} ({bg.shortLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Исполнитель:
                  </label>
                  <select
                    value={newTaskExecutor}
                    onChange={e => setNewTaskExecutor(e.target.value as SSExecutor)}
                    className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <option value="Жансулу">Жансулу (инженер СС)</option>
                    <option value="Диляра">Диляра (инженер СС)</option>
                    <option value="Ринат">Ринат (контроль / эксперт)</option>
                  </select>
                </div>
              </div>

              {/* 4. Dates & Duration */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    4. Длительность (дней):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewTaskDuration(d => Math.max(1, d - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-sm flex items-center justify-center border cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="45"
                      value={newTaskDuration}
                      onChange={e => setNewTaskDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setNewTaskDuration(d => d + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-sm flex items-center justify-center border cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Дата начала:
                  </label>
                  <select
                    value={newTaskStartDay}
                    onChange={e => setNewTaskStartDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono cursor-pointer"
                  >
                    {TIMELINE_DAYS.map(d => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        {d.dateStr} (Нед. {d.weekNumber}, {getDayOfWeekName(d.dateStr)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Dependencies section */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                  Связность и созависимости задачи
                </span>

                {/* Predecessor */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Предшественник (старт зависит от завершения):
                  </label>
                  <select
                    value={newTaskPredecessorId}
                    onChange={e => {
                      const val = e.target.value;
                      setNewTaskPredecessorId(val);
                      if (val !== 'none') {
                        const pred = tasks.find(t => t.id === val);
                        if (pred && pred.endDay) {
                          setNewTaskStartDay(Math.min(TOTAL_TIMELINE_DAYS, pred.endDay + 1));
                        }
                      }
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer"
                  >
                    <option value="none">Старт проекта (без предшественника)</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        №{t.orderNumber} · {t.name.slice(0, 38)} ({t.executor})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rinat Handoff */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Передача на проверку Ринату (созависимый контроль):
                  </label>
                  <select
                    value={newTaskHandoffToRinatId}
                    onChange={e => setNewTaskHandoffToRinatId(e.target.value)}
                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer"
                  >
                    <option value="none">Не передавать на контроль (без связки)</option>
                    {tasks
                      .filter(t => t.executor === 'Ринат')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          №{t.orderNumber} · {t.name.slice(0, 38)} (Ринат)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 6. Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  6. Примечания и состав работ:
                </label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  placeholder="Дополнительные детали, состав альбома, примечания..."
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateTask}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Создать задачу и включить в график
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8d. DELETE TASK CONFIRMATION MODAL ("удалять ненужные задачи") */}
      {/* ======================================================== */}
      {taskToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Удаление задачи из графика
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Вы действительно хотите удалить задачу:
                </p>
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    №{taskToDelete.orderNumber} · {taskToDelete.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Исполнитель: <strong>{taskToDelete.executor}</strong></span>
                    <span>•</span>
                    <span>Блок: {taskToDelete.blockNumber || taskToDelete.targetBlocks}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Сроки: {getCalendarRange(taskToDelete.startDay || 1, taskToDelete.endDay || 1)} ({taskToDelete.durationDays} дн.)
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
              <p className="font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-amber-600" />
                Автоматическая очистка связей:
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                Связанные задачи и контроль Рината будут сохранены, а ссылки на эту задачу аккуратно сняты без сбоев в графике.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTask}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. TOAST NOTIFICATION                                   */}
      {/* ======================================================== */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
