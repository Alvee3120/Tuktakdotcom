'use client';

import { AccountShell } from '@/components/account/AccountShell';
import { AuthGuard } from '@/components/shared/AuthGuard';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AccountShell>{children}</AccountShell>
    </AuthGuard>
  );
}
