export type TaskStatus = 'done' | 'in_progress' | 'pending' | 'todo';

export type TaskStage = 'Эскизный проект' | '25%' | '50%' | '75%' | '100%' | 'Общее';

export interface TaskItem {
  id: string;
  stageCode: string; // e.g., '1', '25%', '50%', '75%', '100%', 'Исп'
  stageGroup: TaskStage;
  orderNumber: string; // e.g. "1.", "2.", "41."
  name: string;
  targetBlocks: string; // "Блоки 1-4", "Все блоки", "Блок 1"
  executor: string; // "Ерсін, Амир", "Алихан", "Нурдаулет", "Айя", "Армана"
  isCompleted: boolean;
  statusText?: string; // "Сделано", "запас", etc.
  taskType?: string;
  predecessor?: string; // "от ГИПа", "от ГП", "Концептуалиста", "ОВ", "КЖ", "ЭОМ", "СС", "Лифтовик"
  successor?: string; // "для АР", "для всех", "ВК"
  responsible: string; // "Амир", "Алихан", "Нурдаулет", "Айя"
  durationDays: number; // in working days
  startDay?: number; // 1 to 56
  endDay?: number;
  notes?: string;
  isMilestone?: boolean;
  dependsOnTaskIds?: string[];
  mepDiscipline?: 'OV' | 'VK' | 'OV_VK' | 'EOM' | 'SS' | 'KZ' | 'GIP' | 'NONE';
}

export interface BlockGroup {
  id: string;
  title: string;
  subtitle?: string;
  leadArchitect?: string;
  tasks: TaskItem[];
}

export interface TimelineDay {
  dayNumber: number; // 1 to 56
  weekNumber: number; // 1 to 12
  dateStr: string; // "01.10.2026"
  isWeekend?: boolean;
}
