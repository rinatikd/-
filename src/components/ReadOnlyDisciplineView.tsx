import React from 'react';
import { Lock, ArrowRight, ShieldCheck, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface ReadOnlyDisciplineViewProps {
  discipline: 'gp' | 'ov' | 'vk' | 'ar';
  onNavigateToSS: () => void;
}

const DISCIPLINE_META = {
  gp: {
    code: 'ГП',
    fullName: 'Генеральный план (ГП)',
    location: 'Вкладка слева от «СС»',
    statusNote: 'Сохранена в исходном виде без изменений',
    description: 'Генеральный план участка, посадка корпусов, схемы наружных сетей и дорожных покрытий.',
    ssIntegration: [
      {
        task: 'Выдача точек ввода наружных кабелей связи в здания',
        status: 'Передано в СС (Задачи 1, 2)',
        ready: true,
      },
      {
        task: 'Координаты колодцев телефонной канализации и оптики',
        status: 'Увязано с трассировкой СС',
        ready: true,
      },
    ],
  },
  ov: {
    code: 'ОВ',
    fullName: 'Отопление и вентиляция (ОВ)',
    location: 'Вкладка справа от «СС»',
    statusNote: 'Сохранена в исходном виде без изменений',
    description: 'Проектирование систем отопления, общеобменной и противодымной вентиляции, теплоснабжения.',
    ssIntegration: [
      {
        task: 'Задание на управление огнезадерживающими клапанами (ОЗК)',
        status: 'Ожидается разделом СС (Задачи 6, 7)',
        ready: false,
      },
      {
        task: 'Задание на отключение общеобменной вентиляции при пожаре',
        status: 'Критическая зависимость для финального альбома СС',
        ready: false,
      },
      {
        task: 'План отверстий в перекрытиях и стенах для воздуховодов',
        status: 'Передается в раздел АР и СС',
        ready: false,
      },
    ],
  },
  vk: {
    code: 'ВК',
    fullName: 'Водопровод и канализация (ВК)',
    location: 'Вкладка после «ОВ»',
    statusNote: 'Сохранена в исходном виде без изменений',
    description: 'Системы холодного/горячего водоснабжения, бытовой и ливневой канализации, насосные станции.',
    ssIntegration: [
      {
        task: 'Задание на диспетчеризацию насосных установок пожаротушения',
        status: 'Ожидается разделом СС (Задачи 8, 9)',
        ready: false,
      },
      {
        task: 'Датчики затопления в водомерных узлах и приямках',
        status: 'Вход для автоматики СС',
        ready: false,
      },
      {
        task: 'Координаты ливневых воронок и дренажных насосов',
        status: 'Увязано со слаботочными датчиками уровня',
        ready: false,
      },
    ],
  },
  ar: {
    code: 'АР',
    fullName: 'Архитектурные решения (АР)',
    location: 'Вкладка проекта АР',
    statusNote: 'Сохранена в исходном виде без изменений',
    description: 'Архитектурно-строительные чертежи, поэтажные планы, разрезы и ведомости отделки.',
    ssIntegration: [
      {
        task: 'Архитектурные подосновы и экспликация помещений',
        status: 'Передано в СС как базовая подоснова',
        ready: true,
      },
    ],
  },
};

export const ReadOnlyDisciplineView: React.FC<ReadOnlyDisciplineViewProps> = ({
  discipline,
  onNavigateToSS,
}) => {
  const meta = DISCIPLINE_META[discipline];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        {/* Top badge */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-base border border-slate-200 dark:border-slate-700">
              {meta.code}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{meta.fullName}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-normal bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md">
                  <Lock className="w-3 h-3" />
                  Без изменений
                </span>
              </h2>
              <span className="text-xs text-slate-500">
                {meta.location} · {meta.statusNote}
              </span>
            </div>
          </div>

          <button
            onClick={onNavigateToSS}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs shrink-0"
          >
            <span>Вкладка «СС»</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Protection Notice */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-semibold">
              Вкладка «{meta.code}» защищена от изменений согласно вашему требованию: «остальные не трогать!».
            </p>
            <p className="text-emerald-800 dark:text-emerald-300">
              Все доработки (классическая диаграмма Ганта, интерактивная таблица, расчет сумм трудозатрат и сквозные зависимости от смежников ОВ/ВК) ведутся исключительно в целевой вкладке <strong>«СС» (между «ГП» и «ОВ»)</strong>.
            </p>
          </div>
        </div>

        {/* Section description */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Описание раздела
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {meta.description}
          </p>
        </div>

        {/* Integration into SS */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Взаимосвязь с вкладкой «СС» (Сети связи):</span>
            <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
              Передача заданий смежников
            </span>
          </h3>

          <div className="space-y-2">
            {meta.ssIntegration.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.task}</span>
                </div>
                <span className={`font-mono text-[11px] ${item.ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            <span>Структура листов: [ГП] → <strong>[СС]</strong> → [ОВ] → [ВК]</span>
          </div>

          <button
            onClick={onNavigateToSS}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm"
          >
            <span>Перейти к редактируемой вкладке «СС»</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
