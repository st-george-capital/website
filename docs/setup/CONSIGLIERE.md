# Consigliere

`/dashboard/tools/consigliere` is the fund's research advisor for members. The language model runs on the member's own laptop with [Ollama](https://ollama.com), so the site pays nothing per question. The data tools run on the SGC server, which keeps the database credentials and the Alpha Vantage and FRED keys.

## How a question flows

1. The member's browser sends the conversation and the tool schemas straight to `http://127.0.0.1:11434/api/chat` (their local Ollama).
2. When the model asks for a tool, the browser posts `{ name, arguments }` to `POST /api/consigliere/tools` with the member's session cookie.
3. The route checks the session (members only: `user`, `editor`, `admin`), rate-limits to 40 calls per minute per member, validates the arguments with zod, runs the tool and returns compact JSON.
4. The browser hands the result back to the local model, repeating for up to 8 tool rounds, then shows the answer and an expandable trace of each lookup.

Questions and answers never pass through the SGC server; only tool calls do.

## Browser permission and Ollama origins

Two gates must open before an HTTPS page can reach Ollama on the laptop:

- **Browser:** requests use `fetch(..., { targetAddressSpace: 'loopback' })`, which makes Chrome/Edge show the Local Network Access prompt. If a member clicks Block, they re-enable it from Site settings. The page diagnoses this (`permission-denied`).
- **Ollama:** Ollama only answers origins in `OLLAMA_ORIGINS` (localhost origins are allowed by default, so local development needs no setup). Without it, Ollama returns 403 and the page shows `origin-blocked`.

The setup panel on the page gives each OS its command:

| OS | Command |
| --- | --- |
| macOS | `curl -fsSL https://www.stgeorgecapital.ca/consigliere/setup-mac.sh \| bash -s -- https://www.stgeorgecapital.ca` |
| Windows | `setx OLLAMA_ORIGINS "https://www.stgeorgecapital.ca"`, then restart Ollama |
| Linux | systemd drop-in setting `Environment="OLLAMA_ORIGINS=..."`, then restart the service |

`public/consigliere/setup-mac.sh` appends the origin to any existing `OLLAMA_ORIGINS`, installs a login item (`~/Library/LaunchAgents/ca.stgeorgecapital.ollama-origins.plist`) so the setting survives reboots, restarts the Ollama app, checks that Ollama now accepts the origin, and pulls the model recommended for the Mac's memory. If the site moves to another domain, members rerun it with the new origin.

## Choosing a model per laptop

Consigliere only uses models that are free and run on the laptop. Ollama cloud models (names ending in `:cloud` or `-cloud`) are billed per token and run on Ollama's servers, so the page hides them and refuses to download them.

`lib/consigliere/models.ts` holds `MODEL_REGISTRY`, the models the page recommends, with download size, minimum memory and context length. The member sets their memory in the "This laptop" card; `recommendedModel()` picks the largest Qwen model whose `minRamGB` fits. The Model dropdown lists:

- **Recommended for Consigliere:** every registry model, marked installed, recommended, its download size, or the memory it needs. Picking one that isn't installed shows a Download button, which pulls it through Ollama (`/api/pull`) with a progress bar and Cancel.
- **Also installed:** other installed models that Ollama reports with the `tools` capability.
- **Another Ollama model…:** a `name:tag` field for any model from [ollama.com/search?c=tools](https://ollama.com/search?c=tools). The page checks the name, rejects cloud models, downloads it, and selects it only if Ollama reports tool calling. Otherwise it explains how to remove it with `ollama rm`.

Choices are saved per browser in `localStorage` (`sgc-consigliere-laptop-v1`).

DeepSeek is deliberately absent. Its laptop-sized models (`deepseek-r1` 1.5b–32b) have no tool-calling template in Ollama, and the tool-capable DeepSeek models are cloud-only. To change the recommended models, edit `MODEL_REGISTRY` (only tool-calling models that run locally) and keep the RAM thresholds in `public/consigliere/setup-mac.sh` in step.

## Keeping answers sourced

Small models sometimes answer from memory. Three safeguards push them back to the tools:

- The system prompt (`lib/consigliere/prompt.ts`) requires a tool call before any current figure (prices, yields, rates, economic data, fund holdings, SGC records).
- If a draft answer contains numbers but no tool was called, `lib/consigliere/agent.ts` asks the model once to look the figures up or answer without them.
- If an answer still contains numbers with no lookups, the chat shows a warning that the figures come from the model's memory and may be out of date.

## Tools and data access

`lib/consigliere/tools/registry.ts` registers 33 tools in five groups that members can switch off to shorten the prompt for small models. Where a site tool exists, Consigliere calls the same library code as that tool's page rather than a copy, and results include an `open_tool` link back to the page.

- **SGC database** (`lib/consigliere/tools/database.ts`): the fund portfolio plus read-only `list/query/summarize` access to the `SGC_TABLES` allowlist. Users, contact/job/resume submissions, newsletter subscribers, settings, votes, saved DCF models, and user ids and emails are excluded. Published-only filters apply to articles, research reports, courses and approved interview questions. To expose another table, add a `TableSpec` with explicit fields; never add personal data.
- **Markets** (`lib/consigliere/tools/markets.ts`, `research.ts`): Alpha Vantage quote, company overview, earnings, symbol search, price history, and news sentiment scored with the Sentiment Tool's method (`lib/sentiment`).
- **Valuation & stock research** (`lib/consigliere/tools/valuation.ts`, `research.ts`):
  - `run_dcf` uses the DCF Valuation Tool's model (`lib/dcf/model.ts`, shared with `/dashboard/tools/dcf`). It auto-fills from Alpha Vantage statements and FRED `DGS10`, accepts overrides for any assumption, and returns bear/base/bull, a WACC × terminal-growth grid and the source of every assumption.
  - `list_my_dcf_models` and saved-model reruns only see the signed-in member's own models (admins can rerun any).
  - `get_comps` compares Alpha Vantage multiples with peer medians.
  - `get_research_reports` returns published reports plus the member's own and shared drafts.
  - `draft_research_report` prepares a DCF model and draft report for the member to save, and `edit_research_report` prepares changes to one of their drafts (see below).
  - Equity Positioning (`lib/equity-positioning`): earnings reactions and options positioning.
  - Supplementary Tools (`lib/supplementary-data`): estimates, call transcripts, insiders and institutional holdings. Options and institutional holdings need an Alpha Vantage premium entitlement; without it the tool says so.
- **Macro** (`lib/consigliere/tools/dashboards.ts`): FRED series and search; the Macro Allocation Engine's regime, signals, persistence outlook, stock picks and backtest; the G10 Rates Monitor (cached 15 minutes); and Trade Shift Radar signal summaries. Panjiva shipments and counterparties are never returned.
- **Portfolio math** (`lib/consigliere/portfolio/`): a TypeScript port of portfolio-copilot's analysis, optimization (min variance, mean-variance, risk parity, HRP, Black-Litterman with constraints) and walk-forward backtests, plus the latest saved CVaR Portfolio Optimizer run. Prices come from `OhlcvDaily` when fresh, otherwise Alpha Vantage adjusted closes.

Tools receive a `ToolContext` (`{ userId, role }`) from the session, so member-scoped data never depends on what the model sends. Alpha Vantage calls inside a tool are spaced out, and a "burst pattern" rejection is retried once. If a tool's table does not exist in the database (for example, Trade Radar before its migration is applied), the model is told the data is not set up instead of getting a generic error.

## Starting a research report

A member can write "Start a report on VRT, overweight, target 160, peers ETN and GEV" and paste their notes. Building the DCF is a conversation:

- **Step 1, the questions.** The first `draft_research_report` call (no `assumptions_confirmed`, no `saved_model_id`) drafts nothing. `proposeDcfAssumptions` returns each auto-filled DCF assumption with its source and a question, a preview value using those assumptions, and up to five of the member's saved DCF models for the ticker, each with its value, upside to the live price and an open link. The model lists these and stops for the member's answer.
- **Step 2, their answer.** When the member confirms or changes assumptions, the model calls again with `assumptions_confirmed: true` and only the changed values. If they say "use my saved DCF", it passes `saved_model_id` instead. A saved model that is not linked to a report and has no changes is linked as it is and never modified. If it already backs another report, or the member changes assumptions, a copy is saved instead and the card says so. The card shows the assumptions actually used, so the member can check them before saving.

The auto-fill is cached for 15 minutes, so the second call does not repeat the Alpha Vantage requests. The draft call then works like this:

1. `lib/consigliere/report-draft.ts` runs the same code as the site tools: DCF auto-fill with bull/bear scenarios, EPS history, a year of prices with performance against SPY, news sentiment and comps (the peers given, or FMP peers). It builds the DCF model and every data field of the report editor, including the valuation markdown from `lib/research/dcf-report.ts`, which the report editor pages also use.
2. The model writes the qualitative sections (thesis, business model, industry, moat, catalysts, risks, bull/bear narrative, conclusion) only from the pasted notes. Each of those sections starts with a "Drafted by Consigliere" review note. Sections the notes do not cover stay empty.
3. Nothing is written yet. The tool result carries a `save_proposal`, which `agent.ts` strips before the model sees it. The chat shows it as a card (`components/consigliere/save-proposal-card.tsx`) listing the values, what came from tools, what came from the notes, what is empty and any warnings (for example a rating that conflicts with the target price, or a peer with no data).
4. **Save to SGC** posts the draft to `/api/consigliere/save` (members only, 10 saves a minute). `lib/consigliere/report-save.ts` validates it with zod, keeps only known DCF input keys, recomputes the DCF outputs on the server, and in one transaction creates the member's `SavedDCFModel` and a linked `EquityResearchReport` with `status: 'draft'` and `published: false`. The card then shows **Open saved report** (the editor), **Preview report** and **Open saved DCF model** (`/dashboard/tools/dcf?model=<id>`). The saved ids and links are also added to the chat history, so the model can link them or edit that report next. Saved edits show the same links.

If the member gives no rating, it is set from the upside to the target price (their target, or the DCF value): buy above +10%, sell below -10%, otherwise hold. The card says the rating was set this way. If an edit changes the target so the rating no longer fits that rule, the card warns but leaves the rating alone.

For banks, insurers and other financial companies the card warns that a free-cash-flow DCF is only a rough guide. If the member already has a draft for the ticker, the card says so, so they can edit that draft instead of creating a second one.

### Editing a draft

"Add a risk to my JPM report" or "change the target to 400" calls `edit_research_report` (`lib/consigliere/report-edit.ts`). It finds the draft by `report_id`, or by ticker among the member's own and shared drafts. The card lists each change, showing the old text for replacements, and nothing changes until the member clicks **Save changes**. The safeguards, all enforced on the server in `applyReportEdit`:

- No delete tool exists, and the save route accepts only `research_report` and `report_edit`.
- Only unpublished drafts can be edited, and only by the author, a collaborator or an admin. Admins must name another member's draft by id.
- Only the sections named in the edit change. Thesis points, catalysts and risks are appended, never removed. Text is added below the existing section unless the member explicitly asked to replace it. Valuation commentary always goes below the DCF tables. Empty values are rejected, so a section cannot be blanked.
- The edit is refused with a 409 if the report changed after the preview (for example, someone edited it in the report editor). The update also re-checks the timestamp, so concurrent saves cannot overwrite each other.
- Before every edit the current report is snapshotted as a `ReportVersion` and the report version is bumped, so anything replaced can be recovered.

Drafts are private. `lib/research/access.ts` limits draft reports, and their versions, comments, preview and PDF export, to the author, the listed collaborators and admins. Only those people can edit a report. Published reports remain readable by every member. Report `PATCH` accepts only report columns, minus the server-managed fields (`id`, `createdBy`, `version`, timestamps). Only the author or an admin can change collaborators, and members can only link their own DCF models.

## Checks

```bash
npm run consigliere:smoke                 # every server tool against the real DB, Alpha Vantage and FRED
npm run consigliere:smoke -- get_fred_series
npm run consigliere:agent-smoke           # local Ollama (default qwen3.5:4b) answering sample questions with the real tools
npm run consigliere:agent-smoke -- qwen3.5:9b "What is the latest 10-year Treasury yield?"
npm run consigliere:agent-smoke -- qwen3.5:4b --chat "start a report on JPM" "keep them but terminal growth 2.5%"
```

`--chat` runs the questions as one conversation, the way the chat panel does, and prints any save proposal.

`consigliere:agent-smoke` needs Ollama running locally with the model pulled. Both scripts read `.env`, run member-scoped tools as the first admin user, and print results only, never keys.

`npx tsx --env-file=.env scripts/consigliere/draft-smoke.ts GEV` checks that the first call only asks questions, builds a report draft, saves it through the same function as the Save button, checks both records, tests the edit safeguards (another member, a stale edit, a published report), checks saved-model handling (an unlinked model is linked unchanged and ignores browser edits; a linked one is copied; one model cannot back two reports), then deletes only the records it created (add `--keep` to leave them for a look in the editor).
