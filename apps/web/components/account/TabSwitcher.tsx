'use client';

import { motion } from 'framer-motion';
import { type Package } from 'lucide-react';

import { cn } from '@/lib/utils';

type Tab = {
  key: string;
  label: string;
  icon: typeof Package;
  count?: number;
};

export function TabSwitcher({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="border-border bg-muted/50 flex gap-1 rounded-xl border p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors duration-200',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="bg-background absolute inset-0 rounded-lg shadow-sm"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
