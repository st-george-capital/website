'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function TeamPageTabs() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') ?? 'current';

  return (
    <div className="flex justify-center mb-10">
      <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
        <Link
          href="/team"
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'current'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Current Team
        </Link>
        <Link
          href="/team?view=alumni"
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'alumni'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Alumni
        </Link>
      </div>
    </div>
  );
}
