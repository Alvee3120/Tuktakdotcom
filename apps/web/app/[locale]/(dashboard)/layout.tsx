import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar - will be built in Milestone 10 */}
      <aside className="border-border bg-card hidden w-64 border-r lg:block">
        <div className="text-foreground p-4 font-semibold">Dashboard</div>
      </aside>
      <main className="flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
