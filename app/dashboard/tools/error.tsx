'use client';

import { useEffect } from 'react';
import { DashboardErrorState } from '@/components/dashboard-state';

export default function ToolError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard tool error:', error);
  }, [error]);

  return (
    <DashboardErrorState
      reset={reset}
      title="This research tool could not start"
      description="An unexpected error interrupted this tool. Try loading it again; if it persists, return to the tools hub and choose another workspace."
    />
  );
}
