'use client';

import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { buildResearchToolLink } from '@/lib/tool-links';
import type { ToolReadingGuide as ToolReadingGuideType } from '@/lib/tool-reading-guides';

export function ToolReadingGuide({
  guide,
  symbol,
  defaultOpen = true,
  compact = false,
}: {
  guide: ToolReadingGuideType;
  symbol?: string | null;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              How to read this tool
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{guide.question}</p>
            {!compact ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{guide.whenToUse}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-5 pb-5">
          <ol className="mt-4 space-y-4">
            {guide.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          {guide.advancedNote ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              {guide.advancedNote}
            </p>
          ) : null}

          {guide.relatedTools?.length && symbol ? (
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Next on the same ticker
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {guide.relatedTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={buildResearchToolLink(tool.id, symbol)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ToolsHubReadingGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Reading roadmap
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">How to use any research tool</h2>
          <p className="mt-1 text-sm text-slate-600">
            New tools follow the same flow: question → Start here → numbered steps → related tools.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white p-1 text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open ? (
        <ol className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Pick the question',
              detail: 'Use the “Use when…” line on each card below to choose the right tool.',
            },
            {
              title: 'Read Start here',
              detail: 'Inside the tool, the blue summary tells you the takeaway before you scroll.',
            },
            {
              title: 'Follow the numbered roadmap',
              detail: 'Each tool has a “How to read this tool” section with step-by-step order.',
            },
            {
              title: 'Cross-check related tools',
              detail: 'Jump between positioning, sentiment, and supplementary on the same ticker.',
            },
          ].map((step, index) => (
            <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-900">{step.title}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
