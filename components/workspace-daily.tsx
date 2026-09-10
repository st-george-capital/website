"use client";
import { useEffect, useState } from "react";
import type { OverviewMetric } from "@/lib/market-data/overview";

const benchmarks: OverviewMetric[] = [
  {
    id: "us10y",
    name: "U.S. 10Y Treasury",
    unit: "yield",
    value: null,
    change: null,
    asOf: null,
    source: "",
  },
  {
    id: "sp500",
    name: "S&P 500",
    unit: "index",
    value: null,
    change: null,
    asOf: null,
    source: "",
  },
  {
    id: "nasdaq",
    name: "Nasdaq Composite",
    unit: "index",
    value: null,
    change: null,
    asOf: null,
    source: "",
  },
  {
    id: "russell2000",
    name: "Russell 2000",
    unit: "index",
    value: null,
    change: null,
    asOf: null,
    source: "",
  },
];
export function MarketBenchmarks() {
  const [metrics, setMetrics] = useState(benchmarks);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const r = await fetch("/api/dashboard/market-overview", {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (Array.isArray(data.metrics)) setMetrics(data.metrics);
      } catch {
        /* Keep observation dates visible if a refresh fails. */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 300000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="workspace-benchmarks" aria-label="Market benchmarks">
      {metrics.map((m) => (
        <div key={m.id} className="workspace-benchmark">
          <h3>{m.name}</h3>
          <div className="workspace-benchmark-value">
            {loading
              ? "…"
              : m.value == null
                ? "—"
                : m.unit === "yield"
                  ? `${m.value.toFixed(2)}%`
                  : m.value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
          </div>
          <p
            className={
              m.unit === "yield"
                ? ""
                : m.change != null && m.change < 0
                  ? "workspace-negative"
                  : "workspace-positive"
            }
          >
            {m.change == null
              ? loading
                ? "Loading"
                : "Change unavailable"
              : `${m.change > 0 ? "+" : ""}${m.change.toFixed(m.unit === "yield" ? 1 : 2)}${m.unit === "yield" ? " bp" : "%"} vs prior observation`}
          </p>
          <span title={m.source}>
            {m.asOf
              ? new Date(m.asOf).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: m.unit === "yield" ? "UTC" : "America/New_York",
                })
              : loading
                ? ""
                : "Data unavailable"}
          </span>
        </div>
      ))}
      <p className="workspace-market-source">
        Latest available observations · Treasury: FRED / Alpha Vantage ·
        Indices: Yahoo Finance; may be delayed.
      </p>
    </div>
  );
}

type Concept = {
  term: string;
  definition: string;
  category: string;
  totalConcepts?: number;
};
type Quote = { quote: string; author: string };
export function DailyLearning() {
  const [concept, setConcept] = useState<Concept | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const get = async (path: string) => {
      const r = await fetch(path, { signal: controller.signal });
      if (!r.ok) throw new Error();
      return r.json();
    };
    Promise.allSettled([
      get("/api/dashboard/finance-term").then(setConcept),
      get("/api/dashboard/quote").then(setQuote),
    ]).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);
  return (
    <section className="workspace-daily" aria-label="Daily learning">
      <article className="workspace-daily-concept">
        <p className="workspace-eyebrow">
          Concept of the day {concept && <span>/ {concept.category}</span>}
        </p>
        <h2>
          {concept?.term ||
            (loading ? "Loading today’s concept…" : "Concept unavailable")}
        </h2>
        <p>
          {concept?.definition ||
            (!loading ? "Please check back shortly." : "")}
        </p>
      </article>
      <article className="workspace-daily-quote">
        <p className="workspace-eyebrow">A thought for today</p>
        {quote ? (
          <>
            <blockquote>{quote.quote}</blockquote>
            <p className="workspace-quote-author">— {quote.author}</p>
          </>
        ) : (
          <p>
            {loading
              ? "Loading today’s quote…"
              : "Today’s quote is unavailable."}
          </p>
        )}
      </article>
    </section>
  );
}
