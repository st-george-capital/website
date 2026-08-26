'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export function ToolAtAGlance({
  headline,
  bullets,
  footnote,
}: {
  headline: string;
  bullets: string[];
  footnote?: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Start here
          </div>
          <p className="mt-2 text-base font-semibold leading-relaxed text-slate-900">{headline}</p>
          {bullets.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {footnote ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{footnote}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function CollapsibleCard({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card hover={false}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description ? (
                <CardDescription className="mt-1 text-[11px] leading-relaxed">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            <div className="mt-0.5 rounded-full border border-slate-200 bg-slate-50 p-1 text-slate-500">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}

export function PlainLabel({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</div> : null}
    </div>
  );
}
