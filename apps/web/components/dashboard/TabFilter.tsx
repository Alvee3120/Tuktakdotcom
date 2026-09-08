'use client';

import { cn } from '@/lib/utils';

interface TabFilterProps {
  tabs: { label: string; count?: number; value: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export function TabFilter({ tabs, activeTab, onTabChange, className }: TabFilterProps) {
  return (
    <div
      className={cn(
        'border-border bg-card flex items-center gap-1 rounded-lg border p-1',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab.value
              ? 'bg-card border-border border text-emerald-600 shadow-sm dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'text-xs',
                activeTab === tab.value
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground/70'
              )}
            >
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
