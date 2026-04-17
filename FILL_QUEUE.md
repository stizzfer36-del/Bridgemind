# Forge Fill Queue

Strike each line when the file is committed.

## Tier 1 — contract (blocks everything downstream)
~~1.  spec/openapi.yaml~~
~~2.  services/api/prisma/schema.prisma~~
3.  packages/sdk-ts/src/index.ts
4.  packages/sdk-rust/src/lib.rs

## Tier 2 — backend + MCP (unblocks desktop, cli, bench)
~~5.  services/api/src/index.ts~~
~~6.  services/api/src/auth.ts~~
~~7.  services/api/src/routes/projects.ts~~
~~8.  services/api/src/routes/tasks.ts~~
~~9.  services/api/src/routes/agents.ts~~
~~10. services/api/src/routes/swarms.ts~~
~~11. services/api/src/routes/runs.ts~~
~~12. services/mcp/src/server.ts~~
~~13. services/mcp/src/tools.ts~~
~~14. services/mcp/src/ui_tools.ts~~
15. services/mcp/src/auth.ts

## Tier 3 — desktop core (Rust)
~~16. apps/desktop/src-tauri/Cargo.toml~~
~~17. apps/desktop/src-tauri/proto/ipc.proto~~
~~18. apps/desktop/src-tauri/src/pty.rs~~
~~19. apps/desktop/src-tauri/src/osc133.rs~~
~~20. apps/desktop/src-tauri/src/shell_detect.rs~~
~~21. apps/desktop/src-tauri/src/deeplink.rs~~
~~22. apps/desktop/src-tauri/src/updater.rs~~
~~23. apps/desktop/src-tauri/src/main.rs~~

## Tier 4 — desktop UI (React/TS)
~~24. apps/desktop/src/state/workspace.ts~~
~~25. apps/desktop/src/state/kanban.ts~~
~~26. apps/desktop/src/state/agents.ts~~
~~27. apps/desktop/src/state/swarms.ts~~
~~28. apps/desktop/src/state/theme.ts~~
29. apps/desktop/src/state/auth.ts
~~30. apps/desktop/src/lib/api.ts~~
~~31. apps/desktop/src/lib/ipc.ts~~
~~32. apps/desktop/src/lib/auth.ts~~
~~33. apps/desktop/src/lib/agentLaunch.ts~~
~~34. apps/desktop/src/lib/replay.ts~~
~~35. apps/desktop/src/components/TerminalPane.tsx~~
~~36. apps/desktop/src/components/CommandBlock.tsx~~
~~37. apps/desktop/src/components/EditorPane.tsx~~
~~38. apps/desktop/src/components/Grid.tsx~~
~~39. apps/desktop/src/components/Kanban.tsx~~
40. apps/desktop/src/components/Agents.tsx
~~41. apps/desktop/src/components/PromptLibrary.tsx~~
~~42. apps/desktop/src/components/Mailbox.tsx~~
~~43. apps/desktop/src/components/FileTree.tsx~~
~~44. apps/desktop/src/components/QuickOpen.tsx~~
~~45. apps/desktop/src/components/ThemePicker.tsx~~
~~46. apps/desktop/src/components/TitleBar.tsx~~
~~47. apps/desktop/src/components/Sidebar.tsx~~
~~48. apps/desktop/src/App.tsx~~
~~49. apps/desktop/src/main.tsx~~
50. apps/desktop/src/themes/_schema.json
~~51. apps/desktop/src/themes/void.json~~
~~52. apps/desktop/src/themes/forge.json~~
~~53. apps/desktop/src/themes/neon-tokyo.json~~
~~54. apps/desktop/src/themes/dracula.json~~
~~55. apps/desktop/src/themes/synthwave.json~~
~~56. apps/desktop/src/themes/abyss.json~~
~~57. apps/desktop/src/themes/arctic.json~~
~~58. apps/desktop/src/themes/carbon.json~~
~~59. apps/desktop/src/themes/chalk.json~~
~~60. apps/desktop/src/themes/cybernetics.json~~
~~61. apps/desktop/src/themes/ghost.json~~
~~62. apps/desktop/src/themes/hex.json~~
~~63. apps/desktop/src/themes/hologram.json~~
~~64. apps/desktop/src/themes/infrared.json~~
~~65. apps/desktop/src/themes/ivory.json~~
~~66. apps/desktop/src/themes/mecha.json~~
~~67. apps/desktop/src/themes/nebula.json~~
~~68. apps/desktop/src/themes/nova.json~~
~~69. apps/desktop/src/themes/obsidian.json~~
~~70. apps/desktop/src/themes/paper.json~~
~~71. apps/desktop/src/themes/plasma.json~~
~~72. apps/desktop/src/themes/quantum.json~~
~~73. apps/desktop/src/themes/solar.json~~
~~74. apps/desktop/src/themes/stealth.json~~
~~75. apps/desktop/src/themes/storm.json~~

## Tier 5 — CLI, voice, bench
~~76. apps/cli/src/index.ts~~
~~77. apps/cli/src/plan.ts~~
~~78. apps/cli/src/exec.ts~~
~~79. apps/cli/src/diff.ts~~
~~80. apps/cli/src/providers/anthropic.ts~~
~~81. apps/cli/src/providers/openai.ts~~
~~82. apps/cli/src/providers/google.ts~~
~~83. apps/cli/src/providers/xai.ts~~
~~84. apps/cli/src/providers/ollama.ts~~
~~85. apps/cli/src/providers/vllm.ts~~
~~86. apps/voice/src-tauri/src/whisper_sidecar.rs~~
~~87. apps/voice/src-tauri/src/inject.rs~~
88. apps/voice/src-tauri/src/main.rs
~~89. apps/voice/src/App.tsx~~
~~90. apps/bench/runner/harness.py~~
~~91. apps/bench/runner/categories/algo.py~~
~~92. apps/bench/runner/categories/debug.py~~
~~93. apps/bench/runner/categories/refactor.py~~
~~94. apps/bench/runner/categories/reason.py~~
~~95. apps/bench/runner/categories/sec.py~~
~~96. apps/bench/runner/categories/ui.py~~
97. apps/bench/runner/docker/sandbox.Dockerfile

## Tier 6 — packages + infra
98. packages/theme-kit/src/validate.ts
~~99. packages/plugin-host/src/lib.rs~~
~~100. packages/replay-player/src/index.ts~~
~~101. infra/docker-compose.yml~~
102. infra/migrations/001_init.sql
~~103. .github/workflows/release.yml~~
~~104. .github/workflows/ci.yml~~
~~105. apps/bench/web/leaderboard.tsx~~
