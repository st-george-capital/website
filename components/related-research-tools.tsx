'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  RESEARCH_TOOL_LINKS,
  buildResearchToolLink,
  type ResearchToolId,
} from '@/lib/tool-links';

export function RelatedResearchTools({
  symbol,
  currentTool,
  tab,
}: {
  symbol: string | null | undefined;
  currentTool: ResearchToolId;
  tab?: string;
}) {
  if (!symbol) return null;

  const links = RESEARCH_TOOL_LINKS.filter((tool) => tool.id !== currentTool);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Related Research Tools
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((tool) => (
          <Link
            key={tool.id}
            href={buildResearchToolLink(tool.id, symbol, tab)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            {tool.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
