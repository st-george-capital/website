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

`lib/consigliere/tools/registry.ts` registers 17 tools in four groups that members can switch off to shorten the prompt for small models:

- **SGC database** (`lib/consigliere/tools/database.ts`): the fund portfolio plus read-only `list/query/summarize` access to the `SGC_TABLES` allowlist. Users, contact/job/resume submissions, newsletter subscribers, settings, votes, saved DCF models, and user ids and emails are excluded. Published-only filters apply to articles, courses and approved interview questions. To expose another table, add a `TableSpec` with explicit fields; never add personal data.
- **Markets** (`lib/consigliere/tools/markets.ts`): Alpha Vantage quote, company overview, news sentiment, earnings, symbol search and price history.
- **Macro**: FRED series and search, and the Macro Allocation Engine's latest regime, signals and transitions.
- **Portfolio math** (`lib/consigliere/portfolio/`): a TypeScript port of portfolio-copilot's analysis, optimization (min variance, mean-variance, risk parity, HRP, Black-Litterman with constraints) and walk-forward backtests. Prices come from `OhlcvDaily` when fresh, otherwise Alpha Vantage adjusted closes.

## Checks

```bash
npm run consigliere:smoke                 # every server tool against the real DB, Alpha Vantage and FRED
npm run consigliere:smoke -- get_fred_series
npm run consigliere:agent-smoke           # local Ollama (default qwen3.5:4b) answering sample questions with the real tools
npm run consigliere:agent-smoke -- qwen3.5:9b "What is the latest 10-year Treasury yield?"
```

`consigliere:agent-smoke` needs Ollama running locally with the model pulled. Both scripts read `.env` and print results only, never keys.
