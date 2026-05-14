<p align="center">
  <img src="assets/banner.png" alt="Sandyaa CLI banner" width="560">
</p>

# Sandyaa

Autonomous source code audit. Point it at a local directory or a git URL and Sandyaa runs end-to-end until the audit is done — no pausing, no interactive prompts. It builds context, detects vulnerabilities, writes proof-of-concept material for findings, and emits a folder of reports.

This fork supports five AI provider modes:

- **OpenAI / Codex** through the OpenAI API
- **Grok / xAI** through the xAI OpenAI-compatible API
- **Ollama** through a local OpenAI-compatible endpoint
- **Claude** through the existing Claude Code path
- **Gemini** through the existing Gemini path

The fork default is **OpenAI/Codex primary with Gemini fallback**, while Claude and Gemini remain available.

> **Platforms:**
> - **macOS** — original upstream target.
> - **Linux** — expected to work.
> - **Windows native** — this fork includes Windows path/glob normalization for local scans and has been smoke-tested from native PowerShell.
> - **WSL2** — should work similarly to Linux.

> Status: alpha. Expect rough edges and false positives.

## What's different

Most LLM-based security scanners shove files at a model and hope. Sandyaa doesn't. Two things set it apart:

1. **Provider routing.** Sandyaa can run with OpenAI/Codex, Grok/xAI, Ollama, Claude, or Gemini. This fork defaults to OpenAI/Codex so you do not need to pay for Claude Code just to run the audit flow.
2. **Recursive Language Models (RLM) for large codebases.** Instead of one giant context window, the model drives a Python REPL — it writes regex filters, chunks files, spawns sub-LLM queries, and aggregates results in code. Based on [arxiv.org/html/2512.24601v1](https://arxiv.org/html/2512.24601v1).

## Features

- OpenAI/Codex provider support via `OPENAI_API_KEY`
- Existing Claude provider support remains available
- Existing Gemini provider support remains available
- Runtime CLI provider selection with `--provider`, `--model`, and `--fallback`
- RLM pipeline with Python REPL, sub-LLM queries, and programmatic aggregation
- Eight recursive passes: call-chain tracing, data-flow expansion, self-verification, vulnerability chaining, POC refinement, contradiction detection, assumption validation, exploitability proof (`src/recursive/recursive-strategy.ts`)
- Attacker-control analysis to drop findings that aren't reachable from untrusted input (`src/detector/attacker-control-analyzer.ts`)
- Evidence chain (`evidence.json`) linking every claim to file + line
- Dynamic chunk sizing based on code density and token budget
- Automatic checkpointing — resume interrupted runs
- Optional Gemini routing
- Ink terminal dashboard for phase / progress / findings
- POC generation and optional execution to validate findings
- Autonomous end-to-end: start it, walk away, come back to a `findings/` folder
- Native Windows scan path normalization for `glob` file discovery

Sandyaa is not a standalone static analyzer — it orchestrates prompts, chunking, and parsing on top of LLM providers.

## Install

Requirements:

- Node.js 18 or newer
- `git` for remote targets
- For OpenAI/Codex mode: `OPENAI_API_KEY`
- Optional: Claude Code, if you want Claude-backed phases
- Optional: Gemini CLI or `GEMINI_API_KEY`, if you want Gemini-backed phases

```bash
git clone https://github.com/securelayer7/sandyaa.git
cd sandyaa
npm install
npm run build
npm link      # installs the `sandyaa` command globally
```

## OpenAI / Codex Provider

This fork supports OpenAI as a first-class provider.

The default provider config is:

```yaml
provider:
  primary: openai
  fallback: gemini
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
```

### Requirements for OpenAI mode

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

Using the installed CLI:

```bash
sandyaa --provider openai --model codex --fallback none /path/to/project
```

From the built repo on Windows PowerShell:

```powershell
node .\dist\index.js --provider openai --model codex --fallback none C:\path\to\project
```

### OpenAI model overrides

OpenAI model IDs are environment-overridable. This is useful if your OpenAI account does not have access to a specific Codex model or if the preferred model changes later.

macOS/Linux:

```bash
export SANDYAA_OPENAI_CODEX_MODEL="gpt-5-codex"
export SANDYAA_OPENAI_STANDARD_MODEL="gpt-5.5"
export SANDYAA_OPENAI_MINI_MODEL="gpt-5.4-mini"
export SANDYAA_OPENAI_FRONTIER_MODEL="gpt-5.5"
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

Windows PowerShell:

```powershell
$env:SANDYAA_OPENAI_CODEX_MODEL = "gpt-5.5"
$env:OPENAI_API_KEY = "sk-..."
node .\dist\index.js --provider openai --model codex --fallback none C:\path\to\project
```

Supported OpenAI model tiers:

```text
mini
standard
codex
frontier
```

Default model resolution:

```text
SANDYAA_OPENAI_MINI_MODEL      -> gpt-5.4-mini
SANDYAA_OPENAI_STANDARD_MODEL  -> gpt-5.5
SANDYAA_OPENAI_CODEX_MODEL     -> gpt-5-codex
SANDYAA_OPENAI_FRONTIER_MODEL  -> gpt-5.5
```

## Claude Provider

Claude remains supported.

```bash
sandyaa --provider claude --model sonnet /path/to/project
```

Supported Claude model tiers:

```text
haiku
sonnet
opus
```

Claude mode uses the existing Claude path. Depending on your local setup, this may require Claude Code to be installed and authenticated.

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

If the `gemini` CLI is on your `PATH` and authenticated, Sandyaa can use it. If you prefer the REST API, export `GEMINI_API_KEY` before running Sandyaa. This is also used to auto-resolve the latest Gemini model tiers at startup. Without it, static defaults are used.

## Provider CLI Options

Sandyaa now supports runtime provider selection:

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

# Claude explicitly
sandyaa --provider claude --model sonnet /path/to/project

# Gemini explicitly
sandyaa --provider gemini --model pro /path/to/project
```

Use `--fallback none` for deterministic provider testing.

## Usage

```bash
# Local directory
sandyaa /path/to/project

# Remote git URL (cloned into a temp directory)
sandyaa https://github.com/user/repo

# Custom config
sandyaa -c ./my-config.yaml /path/to/project

# Ignore an existing checkpoint and start over
sandyaa --fresh /path/to/project

# OpenAI/Codex mode
sandyaa --provider openai --model codex --fallback none /path/to/project
```

Findings are written under `findings/`.

## Configuration

Sandyaa reads `.sandyaa/config.yaml` from the current working directory. A minimal example:

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

Provider examples:

```yaml
# OpenAI primary, no fallback
provider:
  primary: openai
  fallback: none
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
```

```yaml
# Claude primary, OpenAI fallback
provider:
  primary: claude
  fallback: openai
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
```

```yaml
# Gemini primary
provider:
  primary: gemini
  fallback: openai
  autoSwitch: true
  models:
    openai: codex
    claude: sonnet
    gemini: pro
```

## Windows Notes

Native Windows support in this fork includes path normalization for file scanning. Windows backslash glob patterns are normalized before scanning so paths like this are discovered correctly:

```powershell
node .\dist\index.js --provider openai --model codex --fallback none C:\tmp\sandyaa-smoke
```

If you are testing locally on Windows, prefer running from PowerShell after building:

```powershell
npm run build
node .\dist\index.js --provider openai --model codex --fallback none C:\path\to\project
```

## Output layout

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

## What it looks for

* Memory safety: use-after-free, buffer overflow, type confusion, double-free
* Logic bugs: auth bypass, TOCTOU, state machine errors
* Injection: SQL, command, XSS, SSRF, path traversal
* Crypto misuse: weak algorithms, ECB, hardcoded keys, bad randomness
* Concurrency: races, atomicity violations
* Integer issues: overflow, underflow, truncation, signedness
* Unsafe APIs: deserialization, XXE, prototype pollution

Which of these run on a given chunk depends on the planner's view of the code.

## Validation Status for This Fork

This fork has been locally validated with:

```powershell
npm run build
node .\dist\index.js --help
node .\dist\index.js --provider openai --model codex --fallback none --fresh C:\tmp\sandyaa-smoke
```

Validated behavior:

* TypeScript build passes.
* CLI exposes `--provider`, `--model`, and `--fallback`.
* OpenAI mode routes to `OPENAI (codex)`.
* Claude is not required for OpenAI mode.
* Windows scanning discovers source files after glob path normalization.
* A zero-finding scan completes and writes `SUMMARY.md`.

## Share your CVEs

If Sandyaa helped you find a bug that was assigned a CVE, we'd like to know. Open a PR adding an entry to `CVES.md` (or a GitHub issue if you prefer) with:

* CVE ID
* Affected project and version
* One-line description
* Link to the public advisory or writeup
* Which Sandyaa phase surfaced it (context building, detection, recursive pass, etc.) — optional, but useful feedback for the tool

Only include CVEs that are already publicly disclosed. Do not submit embargoed findings.

## Contributing

Maintained by [SecureLayer7](https://securelayer7.net), who have used Sandyaa to surface a number of zero-days during their research. You don't have to wait for Mythos or the next Claude model — Sandyaa already finds real bugs on current frontier coding models. Run it against code you own or are authorized to test and see what it turns up.

Bug reports, patches, and PRs are welcome. If you find something real, add it under a `case-studies/` folder — include the target repo and commit hash, the `analysis.md`, and `evidence.json`. Redact anything sensitive before submitting.

## License

MIT. See [LICENSE](./LICENSE).


