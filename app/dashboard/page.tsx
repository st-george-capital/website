"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Calendar,
  FileText,
  Clock,
  Search,
  ArrowRight,
} from "lucide-react";
import { toolCatalog } from "@/lib/tool-catalog";
import { MarketBenchmarks, DailyLearning } from "@/components/workspace-daily";
import { useWorkspacePins } from "@/components/workspace-pins";

type Report = {
  id: string;
  ticker: string;
  companyName: string;
  status: string;
  updatedAt: string;
};
type Event = {
  id: string;
  title: string;
  startDate: string;
  location?: string;
};
type Mover = {
  ticker: string;
  price: number | null;
  changePercentage: number | null;
};
type Movers = {
  topGainers: Mover[];
  topLosers: Mover[];
  mostActivelyTraded: Mover[];
  lastUpdated?: string;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { pins } = useWorkspacePins();
  const [reports, setReports] = useState<Report[]>([]);
  const [researchState, setResearchState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [events, setEvents] = useState<Event[]>([]);
  const [agendaState, setAgendaState] = useState("loading");
  const [movers, setMovers] = useState<Movers | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketTab, setMarketTab] = useState<
    "mostActivelyTraded" | "topGainers" | "topLosers"
  >("mostActivelyTraded");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const isMember =
    session?.user?.role === "user" || session?.user?.role === "admin";
  useEffect(() => {
    if (!isMember) return;
    const controller = new AbortController();
    const get = async (url: string) => {
      const r = await fetch(url, { signal: controller.signal });
      if (!r.ok) throw new Error();
      return r.json();
    };
    setResearchState("loading");
    get("/api/dashboard/workspace")
      .then((data) => {
        setReports(data.reports);
        setResearchState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setResearchState("error");
      });
    const now = new Date();
    get(
      `/api/calendar?start=${now.toISOString()}&end=${new Date(now.getTime() + 90 * 86400000).toISOString()}`,
    )
      .then((data) => {
        setEvents(
          (Array.isArray(data) ? data : [])
            .filter((e: Event) => new Date(e.startDate) >= now)
            .sort(
              (a: Event, b: Event) =>
                Date.parse(a.startDate) - Date.parse(b.startDate),
            )
            .slice(0, 3),
        );
        setAgendaState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAgendaState("error");
      });
    get("/api/dashboard/market-movers")
      .then((data) => setMovers(data))
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setMarketLoading(false);
      });
    return () => controller.abort();
  }, [isMember, reload]);
  if (session?.user?.role === "visitor")
    return (
      <div className="workspace-empty">
        <h1>Welcome to SGC</h1>
        <p>Contact an administrator to gain access to the workspace.</p>
      </div>
    );
  const searchTools = query.trim()
    ? toolCatalog.filter((t) =>
        `${t.name} ${t.description}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
  const rows = movers?.[marketTab]?.slice(0, 6) || [];
  return (
    <div className="workspace-home">
      <header className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">Your workspace</p>
          <h1>
            Good to see you, {session?.user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link href="/dashboard/research/new" className="workspace-primary">
          <Plus size={16} /> New report
        </Link>
      </header>
      <DailyLearning />
      <div className="workspace-search">
        <Search size={18} />
        <input
          aria-label="Find a research tool"
          placeholder="Find a tool — valuation, sentiment, portfolio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span>{toolCatalog.length} tools</span>
      </div>
      {query.trim() && (
        <section
          className="workspace-search-results"
          aria-label="Tool search results"
        >
          {searchTools.length ? (
            searchTools.map((t) => (
              <Link href={t.href} key={t.id}>
                {t.name}
                <ArrowUpRight size={15} />
              </Link>
            ))
          ) : (
            <p>No tools match “{query}”.</p>
          )}
        </section>
      )}
      <div className="workspace-columns">
        <section className="workspace-panel workspace-recent">
          <div className="workspace-section-heading">
            <div>
              <p className="workspace-eyebrow">Pick up where you left off</p>
              <h2>Your research</h2>
            </div>
            <Link href="/dashboard/research">
              All reports <ArrowUpRight size={15} />
            </Link>
          </div>
          {researchState === "loading" ? (
            <p className="workspace-empty">Loading your research…</p>
          ) : researchState === "error" ? (
            <div className="workspace-empty">
              <p>Your research could not be loaded.</p>
              <button onClick={() => setReload((n) => n + 1)}>Try again</button>
            </div>
          ) : reports.length ? (
            <div className="workspace-report-list">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/research/${r.id}/edit`}
                  className="workspace-report-row"
                >
                  <span className="workspace-ticker">{r.ticker}</span>
                  <div>
                    <h3>{r.companyName}</h3>
                    <p>
                      Updated{" "}
                      {new Date(r.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="workspace-status">
                    {r.status.replaceAll("_", " ")}
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <FileText size={26} />
              <h3>Your next research idea starts here.</h3>
              <p>
                Create a report or open the library to explore the team’s work.
              </p>
              <Link href="/dashboard/research/new">
                Start a report <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <aside className="workspace-panel workspace-agenda">
          <div className="workspace-section-heading">
            <div>
              <p className="workspace-eyebrow">Coming up</p>
              <h2>On the calendar</h2>
            </div>
            <Calendar size={19} />
          </div>
          {agendaState === "loading" ? (
            <p className="workspace-empty">Loading calendar…</p>
          ) : events.length ? (
            events.map((e) => (
              <Link
                href="/dashboard/calendar"
                key={e.id}
                className="workspace-event"
              >
                <div className="workspace-event-date">
                  <span>
                    {new Date(e.startDate).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </span>
                  <strong>{new Date(e.startDate).getDate()}</strong>
                </div>
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    {e.location ||
                      new Date(e.startDate).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="workspace-empty">
              {agendaState === "error"
                ? "Calendar is unavailable right now."
                : "No upcoming meetings scheduled."}
            </p>
          )}
          <Link href="/dashboard/calendar" className="workspace-agenda-link">
            Open calendar <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
      <section>
        <div className="workspace-section-heading">
          <div>
            <p className="workspace-eyebrow">Keep your essentials close</p>
            <h2>Pinned tools</h2>
          </div>
          <Link href="/dashboard/tools">
            Manage tools <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="workspace-pins">
          {toolCatalog
            .filter((t) => pins.includes(t.id))
            .map((t) => (
              <Link href={t.href} key={t.id}>
                <t.icon size={21} />
                <h3>{t.name.replace(" Tool", "")}</h3>
                <p>{t.plainSummary.replace(/^Use when you /, "")}</p>
                <ArrowUpRight className="workspace-pin-arrow" size={16} />
              </Link>
            ))}
        </div>
        {pins.length === 0 && (
          <p className="workspace-empty">
            Pin tools in the tools library to keep them here.
          </p>
        )}
      </section>
      <section className="workspace-panel">
        <div className="workspace-section-heading">
          <div>
            <p className="workspace-eyebrow">Market overview</p>
            <h2>The latest session</h2>
          </div>
          {movers?.lastUpdated && (
            <span className="workspace-updated">
              <Clock size={13} />
              {movers.lastUpdated}
            </span>
          )}
        </div>
        <MarketBenchmarks />
        <div className="workspace-tabs" aria-label="Market movers">
          <button
            aria-pressed={marketTab === "mostActivelyTraded"}
            onClick={() => setMarketTab("mostActivelyTraded")}
          >
            Most active
          </button>
          <button
            aria-pressed={marketTab === "topGainers"}
            onClick={() => setMarketTab("topGainers")}
          >
            Gainers
          </button>
          <button
            aria-pressed={marketTab === "topLosers"}
            onClick={() => setMarketTab("topLosers")}
          >
            Decliners
          </button>
        </div>
        {marketLoading ? (
          <p className="workspace-empty">Loading market data…</p>
        ) : rows.length ? (
          <table className="workspace-market-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Last price</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <td>{r.ticker}</td>
                  <td>{r.price != null ? `$${r.price.toFixed(2)}` : "—"}</td>
                  <td
                    className={
                      r.changePercentage != null && r.changePercentage < 0
                        ? "workspace-negative"
                        : "workspace-positive"
                    }
                  >
                    {r.changePercentage != null
                      ? `${r.changePercentage > 0 ? "+" : ""}${r.changePercentage.toFixed(2)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="workspace-empty">
            Market data is unavailable right now.
          </p>
        )}
      </section>
      <Link href="/dashboard/learning" className="workspace-learning">
        Keep learning{" "}
        <span>
          Interview preparation, financial concepts, and member resources.
        </span>
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
