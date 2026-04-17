# @forge/sdk-ts

Run `pnpm --filter @forge/sdk-ts generate` to (re)generate the client from
`spec/openapi.yaml`. The generated code lands in `./generated/` and is
re-exported from this package's main entry.

The spec is the single source of truth (U8); do not hand-edit generated
files.
