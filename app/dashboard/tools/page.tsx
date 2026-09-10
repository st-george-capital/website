"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, Pin } from "lucide-react";
import { toolCatalog } from "@/lib/tool-catalog";
import { useWorkspacePins } from "@/components/workspace-pins";

const groups = [
  {
    name: "Valuation & research",
    ids: ["dcf", "equity-research", "sentiment-tool", "supplementary-tools"],
  },
  {
    name: "Markets & positioning",
    ids: [
      "capital-flows",
      "country-health",
      "macro-engine",
      "trade-radar",
      "g10-rates",
      "equity-positioning",
    ],
  },
  { name: "Portfolio construction", ids: ["cvar-optimizer"] },
  { name: "Learning", ids: ["interview-tool"] },
];
export default function ToolsDashboardPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All tools");
  const { pins, toggle } = useWorkspacePins();
  const visible = toolCatalog.filter((t) =>
    `${t.name} ${t.description} ${t.features.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="workspace-tool-library">
      <header className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">Research workspace</p>
          <h1>Tools for the next question.</h1>
          <p>Value a company. Understand a market. Build a portfolio.</p>
        </div>
      </header>
      <div className="workspace-search">
        <Search size={18} />
        <input
          aria-label="Search tools"
          placeholder="Search tools, capabilities, or markets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span>{visible.length} tools</span>
      </div>
      <div className="workspace-tabs" aria-label="Tool categories">
        {["All tools", ...groups.map((g) => g.name)].map((name) => (
          <button
            key={name}
            onClick={() => setCategory(name)}
            aria-pressed={category === name}
          >
            {name}
          </button>
        ))}
      </div>
      {groups
        .filter((g) => category === "All tools" || category === g.name)
        .map((g) => {
          const tools = visible.filter((t) => g.ids.includes(t.id));
          if (!tools.length) return null;
          return (
            <section key={g.name}>
              <div className="workspace-section-heading">
                <h2>{g.name}</h2>
                <span className="workspace-count">
                  {tools.length.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="workspace-tool-grid">
                {tools.map((t) => (
                  <article className="workspace-tool-card" key={t.id}>
                    <div className="workspace-tool-card-top">
                      <t.icon size={24} />
                      <button
                        aria-label={`${pins.includes(t.id) ? "Unpin" : "Pin"} ${t.name}`}
                        aria-pressed={pins.includes(t.id)}
                        onClick={() => toggle(t.id)}
                      >
                        <Pin size={16} />
                      </button>
                    </div>
                    <Link href={t.href}>
                      <h3>
                        {t.name}
                        <ArrowUpRight size={17} />
                      </h3>
                      <p>{t.description}</p>
                    </Link>
                    <div className="workspace-tool-tags">
                      {t.features.slice(0, 2).map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      {!visible.some(
        (t) =>
          category === "All tools" ||
          groups.find((g) => g.name === category)?.ids.includes(t.id),
      ) && (
        <p className="workspace-empty">
          No matching tools. Try another category or search.
        </p>
      )}
    </div>
  );
}
