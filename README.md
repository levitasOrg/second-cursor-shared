# @second-cursor/shared

The wire contract between the Second Cursor **brain** and every **adapter**.

The brain is one process; adapters are many (the Chrome extension today, others
later). Both ends must agree, byte for byte, on what a message looks like — so
neither end owns the definition. It lives here, in one package both install.

If a change to this package does not break a consumer, it was additive. If it
does, that break is the point: the compiler is telling you a wire format moved
and the other side has not been taught about it yet.

## What is in it

| Module | What it fixes |
| --- | --- |
| `messages` | The 22 message types and their payload schemas — HELLO, ASK, STEP, STEP_RESULT, EVENT, TIEBREAK, REPORT and the rest. The envelope is the protocol. |
| `snapshot` | The UI snapshot an adapter sends up: element tree, digest, landmarks. |
| `steps` | A step the brain sends down, its target descriptor, and the `expectedAfter` an adapter checks to decide whether the step landed. |
| `recipe` | Multi-step recipes and their validation. |
| `intent` | Intent parsing / classification shared by both ends. |
| `matcher` | Descriptor-to-element matching, with the confidence floor and ambiguity window that decide when to ask the user instead of guessing. |
| `sanitize` | L1 ingress: page-derived strings are hostile until proven boring — invisible characters stripped, structure-forging neutralised. |
| `trace` | Client deltas and trace primitives. |
| `config` | `BRAIN_HOST` / `BRAIN_PORT` / `BRAIN_WS_URL` — the single source of truth for the connection. |

Schemas are [zod](https://zod.dev); every exported type is inferred from its
schema, so the runtime validator and the compile-time type cannot drift apart.
`PROTOCOL_VERSION` is exported from the root and is bumped when the wire format
changes incompatibly.

## Install

Published to **GitHub Packages**, not public npm. Consumers need a `.npmrc`
pointing the `@second-cursor` scope at the GitHub registry:

```
@second-cursor:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
pnpm add @second-cursor/shared
```

### From git, before the first release

Until there is a tagged release, consume it straight from git. The `prepare`
script builds `dist/` at install time, so no registry is involved:

```sh
pnpm add github:levitasOrg/second-cursor-shared#main
```

pnpm 11 will refuse that on its own — a git dependency that runs `prepare` is a
build script, and build scripts are opt-in. **The consumer** must allowlist it
in its own `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  "@second-cursor/shared@0.1.0": true
```

Key it by version, as above. pnpm's own error message suggests a key pinned to
the resolved commit SHA; that works too, but it goes stale the moment `main`
moves. Without the allowlist the install fails outright with
`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` — it does not quietly install an
unbuilt package.

Verified end to end: the installed tree contains `dist/` (20 files), `README.md`,
`LICENSE` and `package.json` — `files` is honoured on a git install exactly as
on a registry one, so `src/` is not there and must never be resolved.

## Use

```ts
import { parseEnvelope, makeEnvelope, PROTOCOL_VERSION, BRAIN_WS_URL } from "@second-cursor/shared";

const env = parseEnvelope(raw);            // throws on anything off-contract
const out = makeEnvelope("ASK", payload, sessionId);
```

ESM only (`"type": "module"`), Node >= 22.

## Develop

```sh
pnpm install     # runs prepare -> builds dist/
pnpm verify      # lint + typecheck + test + build
```

`pnpm lint` is Biome, **lint-only** — the formatter is off on purpose; the
hand-aligned layout in `src/` is deliberate and is not to be mass-reformatted.

## Releasing

Publishing is tag-driven. Bump `version` in `package.json`, commit, then push a
matching `v*` tag; `.github/workflows/publish.yml` builds and publishes to
GitHub Packages with the workflow's own `GITHUB_TOKEN`. Nothing publishes on a
plain push to `main`.

> **Blocked until the scope has an owner.** GitHub Packages only accepts a
> package whose npm scope matches the account that owns the repository. This
> package is `@second-cursor/*` and the repository is owned by `GokulMV`, so
> the first `pnpm publish` will be rejected. Two ways out: create a GitHub
> organisation named `second-cursor` (the name is currently unclaimed) and move
> the repo into it, which keeps every import path unchanged — or rename the
> package to `@gokulmv/second-cursor-shared`, which changes the import
> specifier in all three consumers. The git install above needs neither and is
> unaffected.

## License

All rights reserved. See [LICENSE](./LICENSE).
