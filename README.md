# @second-cursor/shared

The wire contract between the Second Cursor **brain** and every **adapter**.

The brain is one process; adapters are many. Both ends must agree on what a
message looks like, so neither end owns the definition — it lives here, in one
package both install.

If a change to this package does not break a consumer, it was additive. If it
does, the break is the point: the compiler is telling you a wire format moved
and the other side has not been taught about it yet.

## What is in it

Message envelopes and their schemas, the UI-snapshot shape an adapter sends up,
the step shape the brain sends down, and the small helpers both sides share.

Schemas are [zod](https://zod.dev) and every exported type is inferred from its
schema, so the runtime validator and the compile-time type cannot drift apart.
`PROTOCOL_VERSION` is exported from the root and bumps when the wire format
changes incompatibly.

## Requirements

| | |
|---|---|
| Node | 22+ |
| pnpm | 11.21.0 — `corepack enable` picks it up |

## Install

Consumers install it as a git dependency pinned to a **commit**, never a branch,
so an install is reproducible:

```jsonc
"dependencies": {
  "@second-cursor/shared": "github:levitasOrg/second-cursor-shared#<commit>"
}
```

This package's `prepare` script builds it on install, and pnpm requires the
**consumer** to opt into a git dependency's build. The key must be the full
resolved id, commit included:

```yaml
# consumer's pnpm-workspace.yaml
allowBuilds:
  "@second-cursor/shared@git+https://github.com/levitasOrg/second-cursor-shared.git#<commit>": true
```

A short form such as `"@second-cursor/shared"` does not match a git-hosted
package and fails only against a cold store — on CI, or the next machine.

## Use

```ts
import { makeEnvelope, parseEnvelope, PROTOCOL_VERSION } from "@second-cursor/shared";
```

## Develop

```sh
pnpm install
pnpm verify     # lint → typecheck → test
pnpm build
```

## CI

GitHub Actions runs lint, a secret scan, typecheck, unit tests and build on
every push and pull request to `main`.

## Publishing

Publishing to GitHub Packages is tag-driven and **not yet enabled** — the npm
scope has to match the account that owns the repository, and `@second-cursor`
does not match `levitasOrg`. The git install above needs no registry and is
unaffected.

## License

All rights reserved. See [LICENSE](./LICENSE).
