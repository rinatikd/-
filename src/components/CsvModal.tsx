import React, { useState } from 'react';
import { BlockGroup, TaskItem } from '../types';
import { exportTasksToCsv, downloadCsvFile, exportMatrixToGoogleSheetsTsv } from '../utils/csvHelper';
import { X, Download, Copy, Check, RotateCcw, Upload } from 'lucide-react';

interface CsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup: BlockGroup;
  allGroups: BlockGroup[];
  onResetToDefaults: () => void;
  onImportCsv: (csvText: string) => void;
}

export const CsvModal: React.FC<CsvModalProps> = ({
  isOpen,
  onClose,
  currentGroup,
  allGroups,
  onResetToDefaults,
  onImportCsv,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  const currentCsv = exportTasksToCsv(currentGroup);

  const [copiedGoogle, setCopiedGoogle] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyGoogleSheets = () => {
    // Copy as TSV (Tab-Separated Values) which Google Sheets natively splits into columns and rows on Ctrl+V
    const tsvData = exportMatrixToGoogleSheetsTsv(allGroups);
    navigator.clipboard.writeText(tsvData);
    setCopiedGoogle(true);
    setTimeout(() => setCopiedGoogle(false), 2500);
  };

  const handleDownload = () => {
    downloadCsvFile(`АР_График_${currentGroup.title.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}.csv`, currentCsv);
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    onImportCsv(importText);
    setImportText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Экспорт и импорт таблицы (Excel / CSV)
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400">
              {currentGroup.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Экспорт в CSV / Excel
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Импорт из CSV
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Выгрузка содержит все поля текущей группы блоков ({currentGroup.tasks.length} строк): стадию, статус «Сделано», исполнителя, зависимости, длительность. Файл сохраняется с кодировкой UTF-8 BOM, поэтому корректно открывается в Microsoft Excel без искажения кириллицы.
              </p>

              <div className="relative">
                <textarea
                  readOnly
                  value={currentCsv}
                  rows={8}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 select-all focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onResetToDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить к исходным данным</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCopyGoogleSheets}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 dark:border-emerald-800"
                    title="Копирует всю сводную сетку СС со всеми 11 блоками в буфер обмена для мгновенной вставки в Google Таблицу (Ctrl+V)"
                  >
                    {copiedGoogle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGoogle ? 'Скопировано для Google Таблиц!' : 'Вставить в Google Таблицу'}</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать CSV'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .CSV файл</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Вставьте данные в формате CSV (разделитель запятая или точка с запятой) для обновления текущей таблицы:
              </p>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Вставьте строки CSV..."
                rows={8}
                className="w-full p-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={!importText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Применить импорт</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
