'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardLoadingStateProps {
  label?: string;
  description?: string;
  compact?: boolean;
}

export function DashboardLoadingState({
  label = 'Preparing your research workspace',
  description = 'Loading live data, tools, and saved context.',
  compact = false,
}: DashboardLoadingStateProps) {
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-6' : 'min-h-[420px] p-8 sm:p-12'}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.09),transparent_42%)]" />
      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          <LoaderCircle className="h-6 w-6" aria-hidden="true" />
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">St. George Capital</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{label}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-8 grid w-full grid-cols-3 gap-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{ opacity: [0.35, 0.85, 0.35], scaleY: [0.75, 1, 0.75] }}
              transition={{ duration: 1.15, repeat: Infinity, delay: index * 0.14, ease: 'easeInOut' }}
              className="h-16 origin-bottom rounded-xl bg-gradient-to-t from-primary/15 to-primary/5"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface DashboardErrorStateProps {
  reset?: () => void;
  title?: string;
  description?: string;
}

export function DashboardErrorState({
  reset,
  title = 'We could not load this workspace',
  description = 'An unexpected error interrupted this view. Your saved work is unaffected; refresh the data or return to the dashboard.',
}: DashboardErrorStateProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-rose-200 bg-white p-8 shadow-sm sm:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.12),transparent_42%)]" />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Unexpected error</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {reset && (
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
