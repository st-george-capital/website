import { DashboardLoadingState } from '@/components/dashboard-state';

export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-20">
      <div className="w-full">
        <DashboardLoadingState
          label="Preparing St. George Capital"
          description="Loading the page and its supporting data."
        />
      </div>
    </main>
  );
}
