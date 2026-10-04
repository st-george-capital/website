'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ToolPageHeader } from '@/components/tool-page-header';
import { ChatPanel } from '@/components/consigliere/chat-panel';
import { LaptopPanel } from '@/components/consigliere/laptop-panel';
import { SetupPanel } from '@/components/consigliere/setup-panel';
import { useConsigliereLaptop } from '@/components/consigliere/use-consigliere-laptop';
import { profileFor } from '@/lib/consigliere/models';
import type { ConsigliereToolSpec } from '@/lib/consigliere/types';

const MEMBER_ROLES = ['user', 'editor', 'admin'];

export default function ConsiglierePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const laptop = useConsigliereLaptop();
  const [tools, setTools] = useState<ConsigliereToolSpec[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const isMember = MEMBER_ROLES.includes(session?.user?.role ?? '');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [router, status]);

  useEffect(() => {
    if (!isMember) return;
    fetch('/api/consigliere/tools', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Could not load Consigliere's tools (HTTP ${res.status}).`);
        setTools(body.tools ?? []);
      })
      .catch((err) => setToolsError(err instanceof Error ? err.message : "Could not load Consigliere's tools."));
  }, [isMember]);

  if (status === 'loading') {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">Loading Consigliere…</div>;
  }

  if (!isMember) {
    return (
      <div className="space-y-6">
        <ToolPageHeader category="Assistant" title="Consigliere" description="A research assistant that runs on your own laptop." />
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Consigliere is available to SGC members. Contact an admin if you need member access.
        </p>
      </div>
    );
  }

  const connected = laptop.connection === 'connected';
  const groupsOn = laptop.settings.groups.length > 0;
  const ready = connected && Boolean(laptop.activeModel) && tools.length > 0 && groupsOn && !toolsError;
  const notReadyReason = toolsError
    ? toolsError
    : !connected
      ? 'Connect to Ollama on this laptop first.'
      : !laptop.activeModel
        ? laptop.settings.model
          ? `Download ${profileFor(laptop.settings.model)?.label ?? laptop.settings.model} in the Model panel, or pick an installed model.`
          : 'Download or pick a model in the Model panel.'
        : !groupsOn
          ? 'Switch on at least one data group.'
          : 'Loading tools…';

  return (
    <div className="space-y-6">
      <ToolPageHeader
        category="Assistant"
        title="Consigliere"
        description="Ask questions about the fund, markets and portfolios. The model runs free on your laptop; data comes from the SGC database, Alpha Vantage and FRED."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {!connected && <SetupPanel connection={laptop.connection} host={laptop.settings.host} onConnect={() => void laptop.connect()} />}
          <ChatPanel
            host={laptop.settings.host}
            model={laptop.activeModel}
            numCtx={laptop.numCtx}
            think={laptop.settings.think && laptop.canThink}
            groups={laptop.settings.groups}
            tools={tools}
            userName={session?.user?.name}
            ready={ready}
            notReadyReason={notReadyReason}
            onConnectionLost={() => void laptop.connect()}
          />
        </div>
        <LaptopPanel laptop={laptop} />
      </div>
    </div>
  );
}
