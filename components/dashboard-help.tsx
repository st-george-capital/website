'use client';

import Link from 'next/link';
import { CircleHelp, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DASHBOARD_HELP_TOPICS, type DashboardHelpTopicId, getDashboardHelpTopic } from '@/lib/dashboard-help';

export function DashboardHelpButton({
  topic = 'members',
  label = 'Help & guides',
  compact = false,
}: {
  topic?: DashboardHelpTopicId;
  label?: string;
  compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<DashboardHelpTopicId>(topic);
  const selected = getDashboardHelpTopic(selectedId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? 'icon' : 'sm'} className="gap-2" aria-label={compact ? label : undefined}>
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          {!compact ? label : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Dashboard guide</p>
          <DialogTitle>{selected.title}</DialogTitle>
          <DialogDescription className="leading-6">{selected.summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          {DASHBOARD_HELP_TOPICS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                entry.id === selected.id
                  ? 'border-primary bg-primary/5 text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
              }`}
            >
              <span className="font-semibold">{entry.label}</span>
              <ChevronRight className="float-right mt-0.5 h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>

        <ol className="space-y-4 border-t border-slate-100 pt-5">
          {selected.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link href={selected.href}>
            {selected.linkLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
