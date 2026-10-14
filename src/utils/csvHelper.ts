import { BlockGroup, TaskItem } from '../types';

export function exportTasksToCsv(blockGroup: BlockGroup): string {
  const headers = [
    'Стадия',
    '№',
    'Наименование работ',
    'К каким блокам относится задание',
    'Исполнитель',
    'Статус (Сделано)',
    'Предшественник (задание от)',
    'Последователи (задание для)',
    'Ответственный',
    'Длительность (рабочих дней)',
    'День старта',
    'День завершения',
    'Заметки'
  ];

  const rows = blockGroup.tasks.map(t => [
    `"${t.stageCode}"`,
    `"${t.orderNumber}"`,
    `"${t.name.replace(/"/g, '""')}"`,
    `"${t.targetBlocks}"`,
    `"${t.executor}"`,
    `"${t.isCompleted ? 'Сделано' : (t.statusText || 'В плане')}"`,
    `"${t.predecessor || ''}"`,
    `"${t.successor || ''}"`,
    `"${t.responsible || ''}"`,
    `"${t.durationDays}"`,
    `"${t.startDay || ''}"`,
    `"${t.endDay || ''}"`,
    `"${t.notes || ''}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportTasksToGoogleSheetsTsv(blockGroup: BlockGroup): string {
  const headers = [
    'Стадия',
    '№',
    'Наименование работ',
    'К каким блокам относится задание',
    'Исполнитель',
    'Статус (Сделано)',
    'Предшественник (задание от)',
    'Последователи (задание для)',
    'Ответственный',
    'Длительность (рабочих дней)',
    'День старта',
    'День завершения',
    'Заметки'
  ];

  const rows = blockGroup.tasks.map(t => [
    t.stageCode,
    t.orderNumber,
    t.name,
    t.targetBlocks,
    t.executor,
    t.isCompleted ? 'Сделано' : (t.statusText || 'В плане'),
    t.predecessor || '',
    t.successor || '',
    t.responsible || '',
    t.durationDays.toString(),
    (t.startDay || '').toString(),
    (t.endDay || '').toString(),
    t.notes || ''
  ]);

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}

export function exportMatrixToGoogleSheetsTsv(groups: BlockGroup[]): string {
  const headers = ['№', 'Наименование работ', 'Стадия', 'Сводный %', ...groups.map(g => g.title)];
  const masterTasks = groups[0].tasks;

  const rows = masterTasks.map(master => {
    const blockStatuses = groups.map(g => {
      const match = g.tasks.find(t => t.name === master.name);
      return match ? (match.isCompleted ? 'Сделано' : match.executor) : '—';
    });

    const doneCount = groups.filter(g => g.tasks.find(t => t.name === master.name)?.isCompleted).length;
    const pct = `${Math.round((doneCount / groups.length) * 100)}% (${doneCount}/${groups.length})`;

    return [master.orderNumber, master.name, master.stageCode, pct, ...blockStatuses].join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
