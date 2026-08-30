'use client';

import { useEffect } from 'react';
import { DashboardErrorState } from '@/components/dashboard-state';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return <DashboardErrorState reset={reset} />;
}
