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

Before the first tagged release, consume it straight from git — the `prepare`
script builds `dist/` at install time, so no registry is involved:

```sh
pnpm add github:GokulMV/second-cursor-shared#main
```

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

## License

All rights reserved. See [LICENSE](./LICENSE).
