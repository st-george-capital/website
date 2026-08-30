import { DashboardLoadingState } from '@/components/dashboard-state';

export default function ToolLoading() {
  return (
    <DashboardLoadingState
      label="Loading research tool"
      description="Preparing models, market data, and your saved tool context."
    />
  );
}
