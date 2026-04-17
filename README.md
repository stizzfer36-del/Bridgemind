# Forge

One monorepo shipping parity with every BridgeMind surface area — ADE, MCP
server, voice-to-text, multi-provider coding CLI, benchmark platform, and
a multi-agent swarm — plus an open-core distribution and ten upgrades.

## Layout

```
forge/
├─ apps/
│  ├─ desktop/       # Forge ADE (Tauri v2 + React 19)
│  ├─ cli/           # forge-code (Bun single-binary)
│  ├─ voice/         # forge-voice (tray + whisper.cpp sidecar)
│  ├─ bench/         # forge-bench (Python + Docker sandboxes)
│  └─ web/           # forge.sh (Next.js marketing + dashboard)
├─ services/
│  ├─ api/           # Fastify + Prisma (AGPL)
│  └─ mcp/           # @modelcontextprotocol/sdk (MIT)
├─ packages/
│  ├─ sdk-ts/        # generated from spec/openapi.yaml
│  ├─ sdk-rust/      # generated from spec/openapi.yaml
│  ├─ theme-kit/     # theme schema + validator
│  ├─ plugin-host/   # wasmtime skills sandbox (U7)
│  └─ replay-player/ # deterministic replay (U5)
├─ spec/openapi.yaml # single source of truth (U8)
├─ infra/            # docker-compose, Dockerfiles, migrations
└─ .github/workflows # CI + release matrix (macOS/Windows/Linux)
```

## Upgrades over BridgeMind

| id | Upgrade                                                          |
|----|------------------------------------------------------------------|
| U1 | Open-core: MIT on apps/* + services/mcp, AGPL on services/api    |
| U2 | Single hostname — everything under forge.sh                      |
| U3 | Real free tier — local-only, zero-account mode                   |
| U4 | Reverse MCP — agents drive the IDE (open_file, split_pane, …)    |
| U5 | Deterministic replay — JSONL trace, replay.sh reproducer         |
| U6 | Binary PTY protocol — length-prefixed protobuf, 3-5× throughput  |
| U7 | WASM plugin runtime — wasmtime-sandboxed skills                  |
| U8 | Schema-first — OpenAPI 3.1 drives SDK + MCP + backend            |
| U9 | Local models first-class — Ollama/vLLM in agent picker           |
| U10| Auditable swarm mailbox — HMAC-signed messages, UI tab           |

## Quick start

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d   # postgres, redis, api, mcp
pnpm --filter @forge/api prisma:generate
pnpm desktop:dev
```

## Build matrix

Release workflow at `.github/workflows/release.yml` runs tauri-action on
macos-14, windows-2022, ubuntu-22.04 → DMG/MSI/DEB/RPM/AppImage → GitHub
Release + `latest.json` for the updater.

## Keyboard shortcuts

| Chord           | Action          |
|-----------------|-----------------|
| ⌘T / ⌘W         | New / close tab |
| ⌘P / ⌘F         | Quick open / search |
| ⌘D              | Split pane      |
| ⌘K              | Cycle theme     |
| ⌘R              | Run focused card |
| ⌘1–5            | Sidebar tab     |
| ⌘6–9            | Tab by index    |
| ⌘⇧M             | Mailbox         |
| ⌘⇧A             | Agents          |

## CLI shim

Install `forge` via `brew install forge` / `scoop install forge` /
`apt-get install forge`. `forge .` opens the ADE to the current working
directory.

## Licensing

See `LICENSE`. TL;DR: apps and client-side tooling are MIT; the hosted
backend is AGPL — buy a commercial license if you don't want copyleft to
apply to your network service.
