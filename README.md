<p align="center">
  <img src="assets/banner.png" alt="Sandyaa CLI banner" width="560">
</p>

<h1 align="center">Sandyaa</h1>

<p align="center">
  <strong>Autonomous security code auditing for real bugs, large repositories, and multi-provider LLM workflows.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#provider-support">Providers</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#validation-status-for-this-fork">Validation</a>
</p>

---

## Overview

Sandyaa is an autonomous source-code audit tool. Point it at a local directory or a Git URL and it runs end-to-end until the audit is done: no pausing, no interactive prompts, no manual chunking.

It builds security context, plans targeted analysis passes, detects vulnerabilities, generates proof-of-concept material for findings, and writes a structured report folder.

This fork extends Sandyaa with broader provider support, Windows-native hardening, and large-repository resilience.

## Provider Support

This fork supports five AI provider modes:

| Provider | Mode | Notes |
|---|---|---|
| **OpenAI / Codex** | Hosted API | Default primary provider in this fork |
| **Grok / xAI** | Hosted API | Uses xAI’s OpenAI-compatible API |
| **Ollama** | Local endpoint | Uses a local OpenAI-compatible endpoint |
| **Claude** | Existing Claude path | Preserved from upstream |
| **Gemini** | Existing Gemini path | Preserved from upstream and default fallback |

The default provider configuration is:

```yaml
provider:
  primary: openai
  fallback: gemini
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

## Platform Support

> **Status:** Alpha. Expect rough edges and false positives.

| Platform | Status |
|---|---|
| **macOS** | Original upstream target |
| **Linux** | Expected to work |
| **Windows native** | Smoke-tested in this fork from PowerShell |
| **WSL2** | Expected to work similarly to Linux |

Native Windows support in this fork includes path/glob normalization for local scans.

## What's Different in This Fork

Most LLM-based security scanners shove files at a model and hope. Sandyaa is designed around structured, recursive analysis.

This fork improves the original project in three areas:

1. **Multi-provider routing**  
   Sandyaa can run with OpenAI/Codex, Grok/xAI, Ollama, Claude, or Gemini.

2. **Large-repository hardening**  
   Large scans use safer chunk sizing, compact planning/context prompts, and chunk-level failure recovery.

3. **Windows-native reliability**  
   Windows path and glob handling were hardened so native PowerShell scans can discover files correctly.

## Features

- OpenAI/Codex provider support through `OPENAI_API_KEY`
- Grok/xAI provider support through `XAI_API_KEY`
- Ollama provider support through a local OpenAI-compatible endpoint
- Existing Claude provider support preserved
- Existing Gemini provider support preserved
- Shared OpenAI-compatible executor core for OpenAI, Grok/xAI, and Ollama
- Runtime provider selection with `--provider`, `--model`, and `--fallback`
- Compact OpenAI-compatible planning/context prompts
- Safer chunk sizing for large repositories
- Chunk-level failure recovery so one bad model response does not stop the full scan
- Fail-fast handling for missing OpenAI/Grok API keys so scans do not falsely appear successful
- Windows-safe git prioritization and file scanning
- Recursive Language Model pipeline with Python REPL support
- Eight recursive passes: call-chain tracing, data-flow expansion, self-verification, vulnerability chaining, POC refinement, contradiction detection, assumption validation, and exploitability proof
- Attacker-control analysis to drop findings that are not reachable from untrusted input
- Evidence chain output linking claims to file paths and line numbers
- Dynamic chunk sizing based on code density and token budget
- Automatic checkpointing for interrupted runs
- Ink terminal dashboard for phase, progress, and findings
- Proof-of-concept generation and optional validation
- Autonomous end-to-end operation

Sandyaa is not a standalone static analyzer. It orchestrates prompts, chunking, parsing, provider routing, and report generation on top of LLM providers.

---

## Install

### Requirements

- Node.js 18 or newer
- `git` for remote targets
- For OpenAI/Codex mode: `OPENAI_API_KEY`
- For Grok/xAI mode: `XAI_API_KEY`
- For Ollama mode: local Ollama or another OpenAI-compatible local endpoint
- Optional: Claude Code, if using Claude-backed phases
- Optional: Gemini CLI or `GEMINI_API_KEY`, if using Gemini-backed phases

```bash
git clone https://github.com/securelayer7/sandyaa.git
cd sandyaa
npm install
npm run build
npm link
```

---

## OpenAI / Codex Provider

OpenAI is the default primary provider in this fork.

### Requirements

OpenAI mode requires an API key.

macOS/Linux:

```bash
export OPENAI_API_KEY="sk-..."
```

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

OpenAI mode does **not** require Claude Code or a Claude subscription.

### Run with OpenAI / Codex

Installed CLI:

```bash
sandyaa --provider openai --model codex --fallback none /path/to/project
```

Built repo on Windows PowerShell:

```powershell
node .\dist\index.js --provider openai --model codex --fallback none C:\path\to\project
```

### Supported OpenAI Model Tiers

```text
mini
standard
codex
frontier
```

### OpenAI Model Overrides

```text
SANDYAA_OPENAI_MINI_MODEL      -> gpt-5.4-mini
SANDYAA_OPENAI_STANDARD_MODEL  -> gpt-5.5
SANDYAA_OPENAI_CODEX_MODEL     -> gpt-5-codex
SANDYAA_OPENAI_FRONTIER_MODEL  -> gpt-5.5
OPENAI_BASE_URL                -> https://api.openai.com/v1
```

If `OPENAI_API_KEY` is missing, Sandyaa fails fast instead of continuing and falsely reporting a successful scan.

---

## Grok / xAI Provider

Grok/xAI is supported through the shared OpenAI-compatible executor core.

### Requirements

Grok mode requires an xAI API key.

macOS/Linux:

```bash
export XAI_API_KEY="xai-..."
```

Windows PowerShell:

```powershell
$env:XAI_API_KEY = "xai-..."
```

### Run with Grok

Installed CLI:

```bash
sandyaa --provider grok --model grok --fallback none /path/to/project
```

Built repo on Windows PowerShell:

```powershell
node .\dist\index.js --provider grok --model grok --fallback none C:\path\to\project
```

### Supported Grok Model Tiers

```text
mini
standard
grok
frontier
```

### Grok Model Overrides

```text
SANDYAA_GROK_MINI_MODEL      -> grok-3-mini
SANDYAA_GROK_STANDARD_MODEL  -> grok-3
SANDYAA_GROK_GROK_MODEL      -> grok-4
SANDYAA_GROK_FRONTIER_MODEL  -> grok-4
XAI_BASE_URL                 -> https://api.x.ai/v1
```

If `XAI_API_KEY` is missing, Sandyaa fails fast instead of continuing and falsely reporting a successful scan.

---

## Ollama Provider

Ollama is supported through a local OpenAI-compatible endpoint.

### Default Local Endpoint

```text
http://localhost:11434/v1
```

### Run with Ollama

Installed CLI:

```bash
sandyaa --provider ollama --model local --fallback none /path/to/project
```

Built repo on Windows PowerShell:

```powershell
node .\dist\index.js --provider ollama --model local --fallback none C:\path\to\project
```

### Supported Ollama Model Tiers

```text
local
mini
standard
codex
```

### Ollama Model Overrides

```text
SANDYAA_OLLAMA_LOCAL_MODEL     -> qwen3-coder:480b-cloud
SANDYAA_OLLAMA_MINI_MODEL      -> qwen3-coder:30b
SANDYAA_OLLAMA_STANDARD_MODEL  -> qwen3-coder:480b-cloud
SANDYAA_OLLAMA_CODEX_MODEL     -> qwen3-coder:480b-cloud
OLLAMA_BASE_URL                -> http://localhost:11434/v1
```

`OLLAMA_API_KEY` is optional. The local provider uses a default placeholder key internally for OpenAI-compatible clients that require an API key value.

---

## Claude Provider

Claude remains supported through the existing Claude path.

```bash
sandyaa --provider claude --model sonnet /path/to/project
```

Supported Claude model tiers:

```text
haiku
sonnet
opus
```

Depending on your local setup, Claude mode may require Claude Code to be installed and authenticated.

---

## Gemini Provider

Gemini remains supported.

```bash
sandyaa --provider gemini --model pro /path/to/project
```

Supported Gemini model tiers:

```text
flash
pro
ultra
```

If the `gemini` CLI is on your `PATH` and authenticated, Sandyaa can use it. If using the REST API, export `GEMINI_API_KEY` before running Sandyaa. This is also used to auto-resolve the latest Gemini model tiers at startup. Without it, static defaults are used.

---

## Provider CLI Options

Sandyaa supports runtime provider selection:

```bash
--provider <provider>   AI provider: claude, gemini, openai, grok, ollama, auto
--model <model>         Model tier for selected provider
--fallback <provider>   Fallback provider: claude, gemini, openai, grok, ollama, none
```

Examples:

```bash
# OpenAI/Codex only
sandyaa --provider openai --model codex --fallback none /path/to/project

# OpenAI/Codex with Gemini fallback
sandyaa --provider openai --model codex --fallback gemini /path/to/project

# Grok/xAI only
sandyaa --provider grok --model grok --fallback none /path/to/project

# Ollama local only
sandyaa --provider ollama --model local --fallback none /path/to/project

# Claude explicitly
sandyaa --provider claude --model sonnet /path/to/project

# Gemini explicitly
sandyaa --provider gemini --model pro /path/to/project
```

Use `--fallback none` for deterministic provider testing.

---

## Usage

```bash
# Local directory
sandyaa /path/to/project

# Remote git URL
sandyaa https://github.com/user/repo

# Custom config
sandyaa -c ./my-config.yaml /path/to/project

# Ignore an existing checkpoint and start over
sandyaa --fresh /path/to/project

# OpenAI/Codex mode
sandyaa --provider openai --model codex --fallback none /path/to/project

# Grok/xAI mode
sandyaa --provider grok --model grok --fallback none /path/to/project

# Ollama local mode
sandyaa --provider ollama --model local --fallback none /path/to/project
```

Findings are written under `findings/`.

---

## Configuration

Sandyaa reads `.sandyaa/config.yaml` from the current working directory.

Minimal example:

```yaml
target:
  path: /path/to/codebase
  language: auto

provider:
  primary: openai
  fallback: gemini
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local

analysis:
  chunk_size: 15
  depth: maximum

detection:
  min_severity: high
  exploitability_threshold: 0.7

output:
  findings_dir: ./findings
  generate_pocs: true
  validate_pocs: true
```

### Provider Examples

OpenAI primary, no fallback:

```yaml
provider:
  primary: openai
  fallback: none
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

Grok primary, OpenAI fallback:

```yaml
provider:
  primary: grok
  fallback: openai
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

Ollama primary, no fallback:

```yaml
provider:
  primary: ollama
  fallback: none
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

Claude primary, OpenAI fallback:

```yaml
provider:
  primary: claude
  fallback: openai
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

Gemini primary:

```yaml
provider:
  primary: gemini
  fallback: openai
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
    grok: grok
    ollama: local
```

---

## Windows Notes

Native Windows support in this fork includes path normalization for file scanning. Windows backslash glob patterns are normalized before scanning so paths like this are discovered correctly:

```powershell
node .\dist\index.js --provider openai --model codex --fallback none C:\tmp\sandyaa-smoke
```

When testing locally on Windows, build first:

```powershell
npm run build
node .\dist\index.js --provider openai --model codex --fallback none C:\path\to\project
```

The same pattern works for Grok/xAI and Ollama:

```powershell
node .\dist\index.js --provider grok --model grok --fallback none C:\path\to\project
node .\dist\index.js --provider ollama --model local --fallback none C:\path\to\project
```

---

## Output Layout

```text
findings/
├── bug-001-sql-injection/
│   ├── analysis.md
│   ├── poc.py
│   ├── SETUP.md
│   └── evidence.json
├── bug-002-xss/
│   └── ...
└── SUMMARY.md
```

`evidence.json` links each claim back to specific file paths and line numbers.

When no vulnerabilities are found, Sandyaa still writes a summary report instead of failing on an empty findings directory.

---

## What It Looks For

- Memory safety: use-after-free, buffer overflow, type confusion, double-free
- Logic bugs: auth bypass, TOCTOU, state machine errors
- Injection: SQL, command, XSS, SSRF, path traversal
- Crypto misuse: weak algorithms, ECB, hardcoded keys, bad randomness
- Concurrency: races, atomicity violations
- Integer issues: overflow, underflow, truncation, signedness
- Unsafe APIs: deserialization, XXE, prototype pollution

Which of these run on a given chunk depends on the planner's view of the code.

---

## Validation Status for This Fork

This fork has been locally validated with:

```powershell
npm run build
node .\dist\index.js --help
node .\dist\index.js --provider openai --model codex --fallback none --fresh C:\tmp\sandyaa-smoke
node .\dist\index.js --provider grok --model grok --fallback none --fresh C:\tmp\sandyaa-smoke
node .\dist\index.js --provider ollama --model local --fallback none --fresh C:\tmp\sandyaa-smoke
```

Validated behavior:

- TypeScript build passes.
- CLI exposes `--provider`, `--model`, and `--fallback` for OpenAI, Grok, Ollama, Claude, and Gemini.
- OpenAI mode routes to `OPENAI (codex)`.
- Grok mode routes to `GROK (grok)`.
- Ollama mode routes to `OLLAMA (local)`.
- OpenAI and Grok missing-key behavior fails fast instead of reporting a false successful scan.
- Ollama local mode runs without requiring a cloud API key.
- Claude is not required for OpenAI, Grok, or Ollama modes.
- Windows scanning discovers source files after glob path normalization.
- A zero-finding scan completes and writes `SUMMARY.md`.

---

## Security and Secret Handling

This fork was checked for accidental provider key exposure using working-tree and Git-history scans.

Expected placeholder examples may appear in the README:

```text
OPENAI_API_KEY="sk-..."
XAI_API_KEY="xai-..."
```

Do not commit real API keys. Use environment variables or local shell profile configuration.

---

## Share Your CVEs

If Sandyaa helped you find a bug that was assigned a CVE, the upstream maintainers would like to know. Open a PR adding an entry to `CVES.md`, or open a GitHub issue, with:

- CVE ID
- Affected project and version
- One-line description
- Link to the public advisory or writeup
- Which Sandyaa phase surfaced it, if known

Only include CVEs that are already publicly disclosed. Do not submit embargoed findings.

---

## Contributing

Maintained upstream by [SecureLayer7](https://securelayer7.net), who have used Sandyaa to surface zero-days during their research.

Bug reports, patches, and PRs are welcome. If you find something real, add it under a `case-studies/` folder with the target repo and commit hash, `analysis.md`, and `evidence.json`. Redact anything sensitive before submitting.

---

## License

MIT. See [LICENSE](./LICENSE).