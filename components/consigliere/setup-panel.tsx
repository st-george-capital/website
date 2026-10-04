'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, ExternalLink, Laptop, PlugZap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConnectionState } from './use-consigliere-laptop';

type Os = 'mac' | 'windows' | 'linux';

const MAC_SCRIPT_FILE = 'consigliere-setup-mac.sh';

function detectOs(): Os {
  const platform = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('linux') && !platform.includes('android')) return 'linux';
  return 'mac';
}

function CopyCommand({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-3 py-2.5 font-mono text-xs leading-5 text-slate-100">{command}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="flex shrink-0 items-center gap-1.5 border-l border-slate-800 px-3 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

const STATUS_HELP: Partial<Record<ConnectionState, { title: string; body: string }>> = {
  'origin-blocked': {
    title: 'Ollama is running but is refusing this website.',
    body: 'Run the step 2 command, then quit Ollama completely and open it again so it picks up the new setting.',
  },
  'permission-denied': {
    title: 'Your browser blocked the connection to this laptop.',
    body: 'Click the icon to the left of the address bar, open Site settings, allow local network / apps-on-this-device access for this site, then reload the page.',
  },
  unreachable: {
    title: 'Could not reach Ollama on this laptop.',
    body: 'Make sure the Ollama app is open (llama icon in the menu bar or system tray), or run "ollama serve" in a terminal, then try again.',
  },
};

export function SetupPanel({ connection, host, onConnect }: { connection: ConnectionState; host: string; onConnect: () => void }) {
  const [os, setOs] = useState<Os>('mac');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOs(detectOs());
    setOrigin(window.location.origin);
  }, []);

  const isLocalSite = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const help = STATUS_HELP[connection];
  const commands: Record<Os, { label: string; command: string; after: string }> = {
    mac: {
      label: 'macOS setup command',
      command: `curl -fsSL ${origin}/consigliere/setup-mac.sh | bash -s -- ${origin}`,
      after: 'This allows this site in Ollama (and keeps it allowed after restarts), restarts Ollama and downloads the right model for your memory.',
    },
    windows: {
      label: 'Windows setup command',
      command: `setx OLLAMA_ORIGINS "${origin}"`,
      after: 'Run in PowerShell, then quit Ollama from the system tray and open it again.',
    },
    linux: {
      label: 'Linux setup command',
      command: [
        'sudo mkdir -p /etc/systemd/system/ollama.service.d',
        `printf '[Service]\\nEnvironment="OLLAMA_ORIGINS=${origin}"\\n' | sudo tee /etc/systemd/system/ollama.service.d/sgc-origins.conf`,
        'sudo systemctl daemon-reload && sudo systemctl restart ollama',
      ].join('\n'),
      after: 'For the systemd service created by the Ollama Linux installer.',
    },
  };

  return (
    <section aria-labelledby="consigliere-setup-title" className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a] text-white">
          <Laptop className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="consigliere-setup-title" className="text-lg font-semibold text-slate-950">
            Connect Consigliere to this laptop
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            The AI model runs on your own computer with Ollama, so it costs nothing to use. Your questions go from this tab
            to your laptop; only data lookups (for example &ldquo;FRED series UNRATE&rdquo;) are sent to the SGC server, which
            holds the API keys and the database.
          </p>
        </div>
      </div>

      {help && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{help.title}</p>
            <p className="mt-1 leading-6">{help.body}</p>
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-5">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">1</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Install Ollama</p>
            <p className="mt-1 text-sm text-slate-600">Free app for Mac, Windows and Linux. Open it once after installing.</p>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#0b1f3a] hover:underline"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              ollama.com/download
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">2</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Allow this website in Ollama</p>
            {isLocalSite ? (
              <p className="mt-1 text-sm text-slate-600">You are on a local development server. Ollama already allows localhost, so skip this step.</p>
            ) : (
              <>
                <div className="mt-2 inline-flex rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="Operating system">
                  {(['mac', 'windows', 'linux'] as Os[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={os === option}
                      onClick={() => setOs(option)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${os === option ? 'bg-[#0b1f3a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {option === 'mac' ? 'macOS' : option === 'windows' ? 'Windows' : 'Linux'}
                    </button>
                  ))}
                </div>
                <CopyCommand command={commands[os].command} label={commands[os].label} />
                <p className="mt-2 text-xs leading-5 text-slate-500">{commands[os].after}</p>
                {os === 'mac' && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                    <p>
                      Terminal printed HTML or &ldquo;syntax error near unexpected token&rdquo;? The site is behind a login (for example
                      a Vercel preview), so Terminal can&rsquo;t fetch the script. Download it with your browser instead, then run it:
                    </p>
                    <a
                      href="/consigliere/setup-mac.sh"
                      download={MAC_SCRIPT_FILE}
                      className="mt-1.5 inline-flex items-center gap-1.5 font-medium text-[#0b1f3a] hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download {MAC_SCRIPT_FILE}
                    </a>
                    <CopyCommand command={`bash ~/Downloads/${MAC_SCRIPT_FILE} ${origin}`} label="downloaded script command" />
                  </div>
                )}
              </>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">3</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Connect and allow access</p>
            <p className="mt-1 text-sm text-slate-600">
              Your browser will ask whether this site may connect to apps on your device. Choose <strong>Allow</strong>. Chrome
              or Edge is recommended; some browsers block websites from reaching your laptop.
            </p>
            <Button type="button" className="mt-3" onClick={onConnect} loading={connection === 'checking'}>
              {connection !== 'checking' && <PlugZap className="h-4 w-4" aria-hidden="true" />}
              {connection === 'idle' ? 'Connect to Ollama' : 'Try again'}
            </Button>
            <p className="mt-2 text-xs text-slate-500">Looking for Ollama at {host}</p>
          </div>
        </li>
      </ol>

      <p className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        Consigliere can only read an approved list of SGC tables (no member emails, passwords, resumes or applications) and cannot
        change anything.
      </p>
    </section>
  );
}
