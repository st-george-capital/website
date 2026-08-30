'use client';

import { useEffect } from 'react';
import { DashboardErrorState } from '@/components/dashboard-state';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application route error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-20">
      <DashboardErrorState reset={reset} title="This page took an unexpected turn" />
    </main>
  );
}
