'use client';

export function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-md border border-slate-200 bg-white p-8" role="alert">
    <h2 className="text-lg font-medium text-slate-800">Unable to load this section</h2>
    <p className="mt-2 text-sm text-slate-600">The request failed. Your records have not been removed.</p>
    <button type="button" onClick={onRetry} className="mt-4 rounded border border-slate-300 px-4 py-2 text-sm text-slate-800 hover:bg-slate-50">Try again</button>
  </div>;
}
