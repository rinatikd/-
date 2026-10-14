import { SSTaskItem, SSExecutor } from '../data/ssInitialData';
import { TIMELINE_DAYS } from '../data/timelineDays';
import { getAccessToken } from './googleAuth';

export interface SyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  rowsUpdated?: number;
}

// Extract spreadsheet ID from either a raw ID or full Google Sheets URL
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Builds the exact matrix of rows matching the project's layout and attached sheet format
 */
export function buildSsOldSheetMatrix(tasks: SSTaskItem[]): {
  values: (string | number)[][];
  taskRowIndices: { taskId: string; rowIndex: number }[];
} {
  const values: (string | number)[][] = [];
  const taskRowIndices: { taskId: string; rowIndex: number }[] = [];

  // Top header matching attached sheet layout
  // Row 1: Section Title
  const row1 = ['Раздел СС и АПС · Календарный график выполнения проекта (до 25.12.2026)'];
  values.push(row1);

  // Row 2: Columns description
  const row2 = [
    '№',
    'Наименование работ',
    'К каким блокам относится задание',
    'Исполнитель',
    'Статус (Сделано / В работе)',
    'Раздел / Категория',
    'Предшественник (задание от)',
    'Последователи (задание для)',
    'Ответственный',
    'Длительность, рабочих дней',
    'Календарный график (Старт – Финиш)',
  ];

  // Add month headers spanning weeks
  for (let d = 0; d < TIMELINE_DAYS.length; d++) {
    const item = TIMELINE_DAYS[d];
    if (d === 0) row2.push('Месяц 1 (Октябрь)');
    else if (d === 22) row2.push('Месяц 2 (Ноябрь)');
    else if (d === 44) row2.push('Месяц 3 (Декабрь)');
    else row2.push('');
  }
  values.push(row2);

  // Row 3: Weeks headers
  const row3 = ['', '', '', '', '', '', '', '', '', '', ''];
  for (let d = 0; d < TIMELINE_DAYS.length; d++) {
    const weekNum = TIMELINE_DAYS[d].weekNumber;
    if (d % 5 === 0 || d === 0) {
      row3.push(`Неделя ${weekNum}`);
    } else {
      row3.push('');
    }
  }
  values.push(row3);

  // Row 4: Working day indices
  const row4: (string | number)[] = ['', '', '', '', '', '', '', '', '', '', 'Рабочий день №:'];
  for (let d = 0; d < TIMELINE_DAYS.length; d++) {
    row4.push(TIMELINE_DAYS[d].dayNumber);
  }
  values.push(row4);

  // Row 5: Calendar dates
  const row5 = ['', '', '', '', '', '', '', '', '', '', 'Календарная дата:'];
  for (let d = 0; d < TIMELINE_DAYS.length; d++) {
    row5.push(TIMELINE_DAYS[d].dateStr);
  }
  values.push(row5);

  // Task rows
  tasks.forEach((task, index) => {
    const rowNum = values.length + 1; // 1-indexed for sheets
    taskRowIndices.push({ taskId: task.id, rowIndex: values.length });

    const startDateStr = TIMELINE_DAYS[task.startDay - 1]?.dateStr || `д.${task.startDay}`;
    const endDateStr = TIMELINE_DAYS[task.endDay - 1]?.dateStr || `д.${task.endDay}`;
    const dateRangeStr = `${startDateStr} – ${endDateStr}`;

    const taskRow: (string | number)[] = [
      task.orderNumber || `${index + 1}`,
      task.name,
      task.targetBlocks || task.blockNumber || 'Все блоки',
      task.executor,
      task.isCompleted ? 'Сделано' : 'В работе',
      task.majorCategory,
      task.predecessor || '—',
      task.successor || '—',
      task.responsible,
      task.durationDays,
      dateRangeStr,
    ];

    // Gantt timeline cells for each day
    for (let d = 1; d <= TIMELINE_DAYS.length; d++) {
      if (d >= task.startDay && d <= task.endDay) {
        if (task.isCompleted) {
          taskRow.push('V'); // Completed mark
        } else {
          taskRow.push(task.executor.charAt(0)); // Initial
        }
      } else {
        taskRow.push('');
      }
    }

    values.push(taskRow);
  });

  return { values, taskRowIndices };
}

/**
 * Creates a brand-new Google Spreadsheet with the "СС old" sheet tab
 */
export async function createGoogleSpreadsheet(title: string = 'Рабочий проект ЖК · Раздел СС'): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Не авторизован в Google. Пожалуйста, выполните вход.');

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'СС old',
            gridProperties: {
              frozenRowCount: 5,
              frozenColumnCount: 2,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ошибка создания таблицы Google Sheets: ${errText}`);
  }

  const data = await res.json();
  return data.spreadsheetId;
}

/**
 * Checks if tab "СС old" exists; if not, creates it via batchUpdate
 */
export async function ensureSsOldSheetExists(spreadsheetId: string): Promise<number> {
  const token = await getAccessToken();
  if (!token) throw new Error('Не авторизован в Google');

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Не удалось получить доступ к таблице: ${errText}`);
  }

  const meta = await metaRes.json();
  const sheets: any[] = meta.sheets || [];
  const existingSheet = sheets.find(s => s.properties?.title === 'СС old');

  if (existingSheet) {
    return existingSheet.properties.sheetId;
  }

  // Create sheet "СС old"
  const addSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: 'СС old',
              gridProperties: {
                frozenRowCount: 5,
                frozenColumnCount: 2,
              },
            },
          },
        },
      ],
    }),
  });

  if (!addSheetRes.ok) {
    throw new Error('Не удалось создать вкладку «СС old» в Google Sheets');
  }

  const addData = await addSheetRes.json();
  return addData.replies[0].addSheet.properties.sheetId;
}

/**
 * Exports tasks to Google Sheets tab "СС old" with colors, cell formatting, and timeline bars
 */
export async function exportTasksToGoogleSheets(
  spreadsheetIdInput: string,
  tasks: SSTaskItem[]
): Promise<SyncResult> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdInput);
  if (!spreadsheetId) {
    throw new Error('Укажите корректный Spreadsheet ID или ссылку на Google Таблицу');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Требуется вход через Google. Нажмите «Войти через Google»');
  }

  // 1. Ensure tab exists
  const sheetId = await ensureSsOldSheetExists(spreadsheetId);

  // 2. Build matrix
  const { values, taskRowIndices } = buildSsOldSheetMatrix(tasks);

  // 3. Clear existing values on sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'СС old'!A1:ZZ500:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // 4. Write data values
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'СС old'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'СС old'!A1`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Ошибка записи в таблицу: ${errText}`);
  }

  // 5. Apply styling requests
  const formattingRequests: any[] = [
    // Header Row 1 formatting (Title)
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: values[0].length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.15, blue: 0.25 },
            textFormat: { bold: true, fontSize: 13, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Row 2-5 Table Headers
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 5,
          startColumnIndex: 0,
          endColumnIndex: 11,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.93, green: 0.95, blue: 0.98 },
            textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.1, green: 0.15, blue: 0.2 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Freeze rows 5 and cols 2
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 5,
            frozenColumnCount: 2,
          },
        },
        fields: 'gridProperties(frozenRowCount,frozenColumnCount)',
      },
    },
  ];

  // Row formatting for tasks: Red for APS, Blue for CC
  taskRowIndices.forEach(({ taskId, rowIndex }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isAps = task.majorCategory === 'АПС';
    const titleColor = isAps
      ? { red: 0.85, green: 0.15, blue: 0.15 } // Red
      : { red: 0.15, green: 0.35, blue: 0.85 }; // Blue

    // Style Title cell (col index 1)
    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, fontSize: 10, foregroundColor: titleColor },
          },
        },
        fields: 'userEnteredFormat(textFormat)',
      },
    });

    // Style Gantt bar cells for this task (col index 11 + (startDay - 1) to 11 + endDay)
    const startCol = 11 + (task.startDay - 1);
    const endCol = 11 + task.endDay;

    let barColor = { red: 0.23, green: 0.51, blue: 0.96 }; // Blue default (Zhansulu)
    if (task.isCompleted) {
      barColor = { red: 0.13, green: 0.65, blue: 0.35 }; // Green
    } else if (task.executor === 'Ринат') {
      barColor = { red: 0.92, green: 0.6, blue: 0.15 }; // Amber
    } else if (task.executor === 'Диляра') {
      barColor = { red: 0.06, green: 0.72, blue: 0.51 }; // Emerald
    }

    formattingRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: startCol,
          endColumnIndex: endCol,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: barColor,
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
      },
    });
  });

  // Execute batchUpdate formatting (in safe chunks if large)
  if (formattingRequests.length > 0) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formattingRequests.slice(0, 500) }),
      });
    } catch (fmtErr) {
      console.warn('Formatting batch update non-fatal error:', fmtErr);
    }
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;

  return {
    success: true,
    message: `Данные успешно экспортированы во вкладку «СС old» Google Таблицы (${tasks.length} задач, до 25.12.2026)`,
    spreadsheetId,
    spreadsheetUrl,
    rowsUpdated: tasks.length,
  };
}

/**
 * Imports tasks from Google Sheets tab "СС old" to update local application state
 */
export async function importTasksFromGoogleSheets(
  spreadsheetIdInput: string,
  currentTasks: SSTaskItem[]
): Promise<{ tasks: SSTaskItem[]; updatedCount: number }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdInput);
  if (!spreadsheetId) {
    throw new Error('Укажите корректный Spreadsheet ID или ссылку на Google Таблицу');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('Требуется вход через Google. Нажмите «Войти через Google»');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'СС old'!A6:K200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Не удалось прочитать вкладку «СС old»: ${errText}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    throw new Error('Вкладка «СС old» пуста или не содержит строк с задачами');
  }

  let updatedCount = 0;
  const updatedTasks = currentTasks.map((task, idx) => {
    // Find matching row by name or orderNumber
    const row = rows.find(r => {
      const order = r[0]?.trim();
      const name = r[1]?.trim();
      return (order && order === task.orderNumber) || (name && name === task.name);
    }) || rows[idx];

    if (!row) return task;

    let modified = false;
    const newTask = { ...task };

    // Column 3: Executor
    const sheetExecutor = row[3]?.trim() as SSExecutor;
    if (sheetExecutor && ['Ринат', 'Жансулу', 'Диляра'].includes(sheetExecutor) && sheetExecutor !== task.executor) {
      newTask.executor = sheetExecutor;
      newTask.responsible = sheetExecutor;
      modified = true;
    }

    // Column 4: Status
    const sheetStatus = row[4]?.trim();
    if (sheetStatus) {
      const isDone = sheetStatus.toLowerCase().includes('сделано') || sheetStatus.toLowerCase() === 'v';
      if (isDone !== task.isCompleted) {
        newTask.isCompleted = isDone;
        newTask.statusText = isDone ? 'Сделано' : 'В работе';
        modified = true;
      }
    }

    // Column 9: Duration
    const sheetDuration = parseFloat(row[9]?.toString().replace(',', '.') || '0');
    if (!isNaN(sheetDuration) && sheetDuration > 0 && sheetDuration !== task.durationDays) {
      newTask.durationDays = sheetDuration;
      newTask.endDay = newTask.startDay + Math.max(1, Math.round(sheetDuration)) - 1;
      modified = true;
    }

    if (modified) updatedCount++;
    return newTask;
  });

  return { tasks: updatedTasks, updatedCount };
}
