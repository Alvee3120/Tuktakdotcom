'use client';

import { LayoutDashboard, Package, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import { OverviewTab, OrdersTab } from '@/components/account/OverviewTab';
import { StatsGrid } from '@/components/account/StatsGrid';
import { TabSwitcher } from '@/components/account/TabSwitcher';
import { useSession, useSignOut } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';

export default function ProfilePage() {
  const { data: ordersRes, isLoading: ordersLoading } = useOrders({ limit: 50 });
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const handleSignOut = useSignOut('/');

  const user = session?.user;
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  const orders = ordersRes?.data ?? [];
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
  );
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        {/* Admin/Moderator Dashboard Button */}
        {isAdminOrMod && (
          <Link
            href="/admin"
            className="border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
          >
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Admin Dashboard</p>
              <p className="text-muted-foreground text-xs">
                {user?.role === 'admin'
                  ? 'Manage products, orders, and settings'
                  : 'View your assigned dashboard'}
              </p>
            </div>
            <svg className="text-muted-foreground h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <StatsGrid />
        <TabSwitcher
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: 'overview', label: 'Overview', icon: Sparkles },
            { key: 'orders', label: 'My Orders', icon: Package, count: activeOrders.length },
          ]}
        />
        {activeTab === 'overview' ? (
          <OverviewTab orders={orders} activeOrders={activeOrders} ordersLoading={ordersLoading} />
        ) : (
          <OrdersTab
            orders={orders}
            ordersLoading={ordersLoading}
            activeCount={activeOrders.length}
            deliveredCount={deliveredOrders}
          />
        )}
        <div className="sm:hidden">
          <button
            onClick={handleSignOut}
            className="border-border bg-card text-muted-foreground hover:border-destructive/30 hover:text-destructive flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
