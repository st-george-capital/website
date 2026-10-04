#!/usr/bin/env bash
# Consigliere setup for macOS.
# Lets the SGC website talk to Ollama on this Mac and downloads a model sized for its memory.
#   curl -fsSL https://www.stgeorgecapital.ca/consigliere/setup-mac.sh | bash -s -- https://www.stgeorgecapital.ca [model]
# Sites behind a login (e.g. Vercel previews) return a login page to curl; download this file in the browser and run
#   bash ~/Downloads/consigliere-setup-mac.sh https://<preview-host>
set -euo pipefail

ORIGIN="${1:-https://www.stgeorgecapital.ca}"
MODEL="${2:-}"
HOST="http://127.0.0.1:11434"
AGENT_LABEL="ca.stgeorgecapital.ollama-origins"
AGENT_PLIST="$HOME/Library/LaunchAgents/$AGENT_LABEL.plist"

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
fail() { printf '\n\033[31mError:\033[0m %s\n' "$1" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This script is for macOS. See the Windows/Linux steps on the Consigliere page."
[[ "$ORIGIN" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || fail "'$ORIGIN' is not a website origin like https://www.stgeorgecapital.ca"

step "1/4  Checking Ollama"
if ! command -v ollama >/dev/null 2>&1 && [[ ! -d /Applications/Ollama.app ]]; then
  fail "Ollama is not installed. Download it from https://ollama.com/download, open it once, then run this again."
fi
echo "Ollama found."

step "2/4  Allowing $ORIGIN"
existing="$(launchctl getenv OLLAMA_ORIGINS || true)"
if [[ ",$existing," == *",$ORIGIN,"* ]]; then
  origins="$existing"
  echo "Already allowed."
else
  origins="${existing:+$existing,}$ORIGIN"
fi
launchctl setenv OLLAMA_ORIGINS "$origins"
# launchctl setenv is forgotten on reboot; this login item sets it again before Ollama starts.
mkdir -p "$HOME/Library/LaunchAgents"
cat >"$AGENT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$AGENT_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/launchctl</string><string>setenv</string><string>OLLAMA_ORIGINS</string><string>$origins</string>
  </array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
PLIST
echo "OLLAMA_ORIGINS=$origins (kept after restarts via $AGENT_PLIST)"

step "3/4  Restarting Ollama"
if [[ -d /Applications/Ollama.app ]]; then
  osascript -e 'quit app "Ollama"' >/dev/null 2>&1 || true
  # The quit request can be ignored (e.g. when the app runs hidden), and a running server keeps its old origins.
  for _ in $(seq 1 10); do
    pgrep -f '/Applications/Ollama.app/Contents/' >/dev/null || break
    sleep 1
  done
  if pgrep -f '/Applications/Ollama.app/Contents/' >/dev/null; then
    pkill -TERM -f '/Applications/Ollama.app/Contents/' || true
    sleep 2
  fi
  open -a Ollama
else
  echo "Ollama was installed without the app. Restart 'ollama serve' (or 'brew services restart ollama') in another terminal."
fi
for _ in $(seq 1 30); do
  curl -fsS "$HOST/api/version" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "$HOST/api/version" >/dev/null 2>&1 || fail "Ollama did not start. Open the Ollama app and run this script again."
status="$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: $ORIGIN" "$HOST/api/version")"
[[ "$status" == "200" ]] || fail "Ollama still refuses $ORIGIN (HTTP $status). Quit Ollama from the menu bar, open it again, and retry."
echo "Ollama accepts requests from $ORIGIN."

step "4/4  Model"
ram_gb=$(( $(sysctl -n hw.memsize) / 1073741824 ))
if [[ -z "$MODEL" ]]; then
  # Same rule as recommendedModel() in lib/consigliere/models.ts.
  if (( ram_gb >= 48 )); then MODEL="qwen3.5:27b"
  elif (( ram_gb >= 24 )); then MODEL="qwen3.5:9b"
  elif (( ram_gb >= 16 )); then MODEL="qwen3.5:4b"
  else MODEL="qwen3.5:2b"
  fi
fi
echo "This Mac has ${ram_gb} GB of memory -> $MODEL"
if ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx -e "$MODEL" -e "$MODEL:latest"; then
  echo "Already downloaded."
else
  ollama pull "$MODEL"
fi

printf '\n\033[32mDone.\033[0m Go back to the Consigliere page, click "Connect to Ollama" and choose Allow.\n'
