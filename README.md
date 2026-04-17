# BridgeSpace

Native desktop app that unifies multi-pane terminals, a code editor, a file
browser, a Kanban task board, and AI-agent auto-launch so a builder can
orchestrate 1–16 parallel coding agents against a single codebase from one
window.

## Layout

```
bridgespace/
├─ src-tauri/          # Rust / Tauri v2 shell
├─ src/                # React 19 + TypeScript frontend
├─ server/             # Fastify + Prisma BridgeMind API
├─ mcp/                # @modelcontextprotocol/sdk service
└─ pnpm-workspace.yaml
```

## Prereqs

- Rust 1.78+
- Node 20 LTS
- pnpm 9
- PostgreSQL 16 + Redis 7 (server only)

## Dev

```bash
pnpm install
pnpm tauri:dev          # desktop app + vite
pnpm --filter @bridgespace/server prisma:generate
pnpm --filter @bridgespace/server dev         # :4000
pnpm --filter @bridgespace/mcp dev            # :4100
```

## Build matrix

```bash
pnpm tauri build --target universal-apple-darwin
pnpm tauri build --target x86_64-pc-windows-msvc
pnpm tauri build --target x86_64-unknown-linux-gnu
```

## Environment

See `.env.example` for the full list. Key vars:
- `BRIDGEMIND_API_URL` — default `https://api.bridgemind.ai`
- `BRIDGEMIND_API_KEY` — `bm_live_…`
- `OAUTH_CLIENT_ID`, `OAUTH_REDIRECT_URI` — OAuth PKCE via deep-link
- `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` — server only

## Keyboard shortcuts

| Key             | Action          |
|-----------------|-----------------|
| Cmd/Ctrl+T      | New tab         |
| Cmd/Ctrl+W      | Close tab       |
| Cmd/Ctrl+P      | Quick Open      |
| Cmd/Ctrl+F      | Search in pane  |
| Cmd/Ctrl+D      | Split pane      |
| Cmd/Ctrl+K      | Cycle theme     |
| Cmd/Ctrl+1..9   | Jump to tab     |

## Themes

Ship 25 themes in `src/themes/*.json`:
Void, Ghost, Plasma, Carbon, Hex, Neon Tokyo, Obsidian, Nebula, Storm,
Infrared, Nova, Stealth, Hologram, Dracula, BridgeMind, Synthwave,
Cybernetics, Quantum, Mecha, Abyss, Paper, Chalk, Solar, Arctic, Ivory.

## OSC 133 shell integration

BridgeSpace parses `ESC ] 133 ; {A|B|C|D} ; … ST` sequences to render
collapsible command blocks. Add this to your shell rc to opt in:

```zsh
# zsh
precmd() { print -Pn "\e]133;A\e\\" }
preexec() { print -Pn "\e]133;C\e\\" }
```
