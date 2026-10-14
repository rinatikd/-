import React from 'react';
import { Download, Plus, FileSpreadsheet, Lock } from 'lucide-react';

export type ActiveTab = 'ss' | 'gp' | 'ov' | 'vk' | 'ar';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onAddTask: () => void;
  onOpenCsvModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onAddTask,
  onOpenCsvModal,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-40">
      {/* Zone 1: Branding and Current Tab Clarification */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
          СС
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap block leading-tight">
              График Проекта · ЖК «Ажур»
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
              Вкладка СС (между ГП и ОВ)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            Только раздел «СС» обновляется · Разделы ГП, ОВ, ВК, АР сохранены без изменений
          </span>
        </div>
      </div>

      {/* Zone 2: Google Sheets-Style Tabs in exact workbook order */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <span className="text-[10px] font-bold text-slate-400 uppercase px-2 tracking-wider hidden xl:inline">
          Листы:
        </span>

        {/* 1. ГП */}
        <button
          onClick={() => onTabChange('gp')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'gp'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
          title="Вкладка ГП (Генеральный план) — сохранена без изменений"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>ГП</span>
        </button>

        {/* 2. СС (TARGET ACTIVE TAB - explicitly between ГП and ОВ) */}
        <button
          onClick={() => onTabChange('ss')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ss'
              ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300'
          }`}
          title="Вкладка СС (Сети связи / Слаботочные сети) — активная обновляемая вкладка"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>СС (Слаботочные сети)</span>
          <span className="text-[9px] bg-indigo-500/80 text-white px-1 py-0.2 rounded font-normal">
            Редактируется
          </span>
        </button>

        {/* 3. ОВ */}
        <button
          onClick={() => onTabChange('ov')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ov'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
          title="Вкладка ОВ (Отопление и вентиляция) — сохранена без изменений"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>ОВ</span>
        </button>

        {/* 4. ВК */}
        <button
          onClick={() => onTabChange('vk')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'vk'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
          title="Вкладка ВК (Водопровод и канализация) — сохранена без изменений"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>ВК</span>
        </button>

        {/* 5. АР */}
        <button
          onClick={() => onTabChange('ar')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ar'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
          title="Вкладка АР (Архитектурные решения) — сохранена без изменений"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>АР</span>
        </button>
      </div>

      {/* Zone 3: Actions for SS */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenCsvModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          title="Экспорт в Excel / CSV или копирование для Google Sheets"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Экспорт CSV/Excel</span>
        </button>
        <button
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
          title="Добавить задачу во вкладку СС"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить задачу в СС</span>
        </button>
      </div>
    </header>
  );
};
