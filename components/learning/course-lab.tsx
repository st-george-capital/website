"use client";
import { useId, useState } from "react";
import type { Workshop } from "@/lib/learning/curriculum";
import {
  bondPrice,
  callProfit,
  currencyReturn,
  equityPrice,
  executionCost,
} from "@/lib/learning/models";
const fmt = (v: number, d = 2) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function CourseLab({ workshop }: { workshop: Workshop }) {
  const [selected, setSelected] = useState(0);
  const [x, setX] = useState(
    workshop.lab === "bonds"
      ? 5
      : workshop.lab === "valuation"
        ? 10
        : workshop.lab === "fx"
          ? -5
          : workshop.lab === "execution"
            ? 250
            : 100,
  );
  const id = useId();
  if (workshop.lab === "process")
    return (
      <section className="course-lab">
        <div className="course-eyebrow">Decision walkthrough</div>
        <h3>Follow the reasoning</h3>
        <div className="course-process">
          {workshop.steps.map((step, i) => (
            <button
              key={step.title}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
            >
              <span>0{i + 1}</span>
              {step.title}
            </button>
          ))}
        </div>
        <p className="course-process-detail" aria-live="polite">
          {workshop.steps[selected].detail}
        </p>
      </section>
    );
  if (workshop.lab === "regime") {
    const regimes = [
      [
        "Growth ↑ · Inflation ↓",
        "Disinflationary expansion",
        "Earnings can improve while discount-rate pressure eases. Equities may benefit, but valuations and what is already priced matter.",
      ],
      [
        "Growth ↓ · Inflation ↓",
        "Disinflationary slowdown",
        "Duration may benefit from lower expected rates. Weak earnings and wider spreads can hurt risk assets.",
      ],
      [
        "Growth ↑ · Inflation ↑",
        "Reflation",
        "Nominal revenues may rise, while tighter policy can pressure long-duration assets. Supply constraints change the result.",
      ],
      [
        "Growth ↓ · Inflation ↑",
        "Stagflationary pressure",
        "Policy faces a trade-off. Both earnings and discount rates can work against equities; nominal bonds may also struggle.",
      ],
    ];
    return (
      <section className="course-lab">
        <div className="course-eyebrow">Scenario explorer</div>
        <h3>Change the economic surprise</h3>
        <div className="course-regimes">
          {regimes.map((r, i) => (
            <button
              key={r[0]}
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
            >
              {r[0]}
            </button>
          ))}
        </div>
        <h4>{regimes[selected][1]}</h4>
        <p aria-live="polite">{regimes[selected][2]}</p>
        <small>
          Conditional mechanisms, not forecasts or stable return correlations.
        </small>
      </section>
    );
  }
  const spec =
    workshop.lab === "options"
      ? {
          min: 70,
          max: 140,
          step: 1,
          label: "Stock price at expiry",
          unit: "$",
          fn: (v: number) => callProfit(v, 100, 5),
          title: "Long call: payoff is not profit",
          metric: "Profit per share",
          suffix: "",
          prefix: "$",
          note: "Strike $100 · Premium $5 per share · Expiry only, before fees. One standard 100-share contract multiplies the result by 100.",
        }
      : workshop.lab === "bonds"
        ? {
            min: 1,
            max: 10,
            step: 0.1,
            label: "Yield to maturity",
            unit: "%",
            fn: bondPrice,
            title: "The price–yield relationship",
            metric: "Bond price",
            suffix: "",
            prefix: "$",
            note: "$1,000 face value · 5% annual coupon · Five years · Annual compounding · No credit spread or embedded option.",
          }
        : workshop.lab === "valuation"
          ? {
              min: 6,
              max: 16,
              step: 0.1,
              label: "WACC",
              unit: "%",
              fn: equityPrice,
              title: "How much is the discount rate doing?",
              metric: "Equity value per share",
              suffix: "",
              prefix: "$",
              note: "Steady-state illustration: $120m firm cash flow, 3% growth, $250m net debt, 50m shares. This is not a full forecast-period DCF.",
            }
          : workshop.lab === "fx"
            ? {
                min: -15,
                max: 15,
                step: 0.5,
                label: "Foreign currency return versus USD",
                unit: "%",
                fn: currencyReturn,
                title: "Translate the return back into dollars",
                metric: "USD total return",
                suffix: "%",
                prefix: "",
                note: "Local asset return held at +4%. Currency return uses USD per unit of foreign currency. No hedge or trading costs.",
              }
            : {
                min: 50,
                max: 600,
                step: 10,
                label: "Market buy quantity",
                unit: " shares",
                fn: (v: number) => executionCost(v).bps,
                title: "See the cost of walking the book",
                metric: "Cost versus arrival midpoint",
                suffix: " bp",
                prefix: "",
                note: "Ask depth: 100 shares at $100.01, 200 at $100.03, 300 at $100.06. Arrival midpoint $100. Static book; no fees or cancellations.",
              };
  const inputLabel = (v: number, d = 0) =>
    spec.unit === "$" ? `$${fmt(v, d)}` : `${fmt(v, d)}${spec.unit}`;
  const result = spec.fn(x);
  const resultLabel = `${result < 0 ? "−" : ""}${spec.prefix}${fmt(Math.abs(result))}${spec.suffix}`;
  const points = Array.from({ length: 71 }, (_, i) => {
    const v = spec.min + ((spec.max - spec.min) * i) / 70;
    return { x: v, y: spec.fn(v) };
  });
  const lo = Math.min(0, ...points.map((p) => p.y)),
    hi = Math.max(...points.map((p) => p.y));
  const span = hi - lo || 1;
  const px = (v: number) => 64 + ((v - spec.min) / (spec.max - spec.min)) * 472;
  const py = (v: number) => 210 - ((v - lo) / span) * 156;
  return (
    <section className="course-lab">
      <div className="course-eyebrow">Interactive model</div>
      <h3>{spec.title}</h3>
      <div className="course-lab-result">
        <span>{spec.metric}</span>
        <output htmlFor={id}>{resultLabel}</output>
      </div>
      <svg
        className="course-model-chart"
        viewBox="0 0 580 264"
        role="img"
        aria-label={`${spec.metric} as ${spec.label.toLowerCase()} changes. Current result ${fmt(spec.fn(x))}${spec.suffix}.`}
      >
        {[0, 0.5, 1].map((f) => {
          const v = lo + span * f;
          return (
            <g key={f}>
              <line x1="64" x2="536" y1={py(v)} y2={py(v)} stroke="#dce5ee" />
              <text
                x="54"
                y={py(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#63768e"
              >
                {fmt(v, Math.abs(v) > 100 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {lo < 0 && hi > 0 && (
          <line
            x1="64"
            x2="536"
            y1={py(0)}
            y2={py(0)}
            stroke="#8fa5be"
            strokeDasharray="3 3"
          />
        )}
        <path
          d={points
            .map((p, i) => `${i ? "L" : "M"}${px(p.x)},${py(p.y)}`)
            .join(" ")}
          stroke="#214a79"
          strokeWidth="2.5"
          fill="none"
        />
        <line
          x1={px(x)}
          x2={px(x)}
          y1="40"
          y2="210"
          stroke="#8fa5be"
          strokeDasharray="4 4"
        />
        <circle
          cx={px(x)}
          cy={py(spec.fn(x))}
          r="5"
          fill="#172f50"
          stroke="white"
          strokeWidth="2"
        />
        {[spec.min, (spec.max + spec.min) / 2, spec.max].map((v) => (
          <text
            key={v}
            x={px(v)}
            y="235"
            textAnchor="middle"
            fontSize="11"
            fill="#63768e"
          >
            {inputLabel(v)}
          </text>
        ))}
      </svg>
      <label htmlFor={id} className="course-slider-label">
        {spec.label}
        <strong>
          {inputLabel(
            x,
            workshop.lab === "options" || workshop.lab === "execution" ? 0 : 1,
          )}
        </strong>
      </label>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={x}
        onChange={(e) => setX(Number(e.target.value))}
      />
      {workshop.lab === "execution" && (
        <p>
          Execution VWAP: <strong>${fmt(executionCost(x).vwap, 3)}</strong> ·
          Spend: ${fmt(executionCost(x).spend)}
        </p>
      )}
      <small>{spec.note}</small>
    </section>
  );
}
