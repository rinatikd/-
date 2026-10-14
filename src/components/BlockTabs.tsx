import React from 'react';
import { BlockGroup } from '../types';
import { Building2, CheckCircle2 } from 'lucide-react';

interface BlockTabsProps {
  groups: BlockGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}

export const BlockTabs: React.FC<BlockTabsProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Блоки:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {groups.map((group) => {
            const isSelected = group.id === selectedGroupId;
            const completedCount = group.tasks.filter(t => t.isCompleted).length;
            const totalCount = group.tasks.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-transparent hover:bg-white/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                }`}
              >
                <span>{group.title}</span>
                {completedCount > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {percent}%
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {totalCount} зад.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
