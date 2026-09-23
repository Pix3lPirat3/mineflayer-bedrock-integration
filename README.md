# mineflayer-bedrock-integration

An **experimentation umbrella** that assembles the in-progress Bedrock Edition work for mineflayer and its dependencies into
one coordinated, runnable checkout. Each moving part is a git **submodule** pinned to its bedrock branch, so the whole stack
stays version-matched. This is a **frankenstein integration environment**, not a PR target: it combines branches from
several forks (ours, mc-zuri's #1327, and others) that are not yet merged upstream.

> Status: DRAFT (2026-09-23). Nothing here is pushed yet. This documents the intended layout for review before the repo is
> created. Branch pins are the tips validated together on this machine as of the date above.

## What's inside (submodules)

| Path | Fork | Branch | Role |
|------|------|--------|------|
| `deps/mineflayer` | Pix3lPirat3/mineflayer | `feat/bedrock-edition-adapter` | the bedrock adapter (bedrock_plugins) |
| `deps/prismarine-chunk` | Pix3lPirat3/prismarine-chunk | `feat/bedrock-1.26-chunks` | bedrock chunk/subchunk decode |
| `deps/node-minecraft-data` | Pix3lPirat3/node-minecraft-data | `feat/bedrock` | data wrapper (consumes the data repo) |
| `deps/minecraft-data` | mc-zuri/minecraft-data | `bedrock-block-states-collision` | per-version bedrock data (#1327) |
| `deps/bedrock-protocol` | Pix3lPirat3/bedrock-protocol | `fix/nethernet-connectiontype` | protocol + transports |
| `deps/prismarine-physics` | Pix3lPirat3/prismarine-physics | `feat/bedrock-edition` | bedrock physics |
| `deps/prismarine-registry` | mc-zuri/prismarine-registry | `bedrock` | bedrock block-state hash support (#57) |

All submodules track a clean branch on a public fork (ours or mc-zuri's), so `git submodule update --remote` bumps each to
its branch tip.

## Setup

```bash
git clone --recurse-submodules <this repo>
cd mineflayer-bedrock-integration
npm run bootstrap
```

`npm run bootstrap` (see `scripts/bootstrap.mjs`):
1. `git submodule update --init --recursive`
2. installs each submodule's own deps
3. links the data: points `deps/node-minecraft-data`'s data at `deps/minecraft-data` (zuri's #1327) and runs
   `generate:data` in the wrapper - **required**; a plain data-file swap leaves the wrapper's generated index on the old
   `dataPaths` layout and most versions fail to load.
4. links the adapter's dependencies (`prismarine-chunk`, `minecraft-data`, `bedrock-protocol`, `prismarine-physics`,
   `prismarine-registry`) to the sibling submodules so `require()` resolves the bedrock forks, not the npm releases.

## Why submodules, not a branch

The work spans 5+ separately-evolving forks. A single branch would have to vendor all their source (loses history, hard to
bump) or use `package.json` git-deps - and git-deps break on `minecraft-data`, whose npm package is the *wrapper* that
consumes the data repo separately and must be regenerated. Submodules hold the heterogeneous set cleanly and make bumping a
one-liner.

## Bumping when an upstream branch moves (e.g. zuri pushes to #1327)

```bash
git submodule update --remote deps/minecraft-data
npm run bootstrap          # re-links + regenerates the data index
# run the smoke/matrix, then:
git commit -am "bump minecraft-data to <short-sha>"
```

## Validation

Validated 2026-09-23 against the branch tips this repo pins:
- **Version matrix 5/5**: connect/spawn/world/inventory/move across 1.17.10, 1.19.80, 1.20.80, 1.21.90, 1.26.45 (with #1327).
- **Functional suite 347 pass / 0 fail / 1 skip** on the RakNet 1.26.45 fresh-world path.
- **Assembled-umbrella smoke** (`smoke.cjs`, this exact bootstrap output) on 1.19.80: world decodes to a solid floor
  (grass/dirt/dirt/bedrock), `diamond_pickaxe.maxDurability=1561` from #1327 data, movement works.

`smoke.cjs` connects the assembled adapter to a local Bedrock server on port 19161 (`SMOKEV=<version> node smoke.cjs`) - a
quick end-to-end check after `npm run bootstrap`. This repo tracks branch tips, so re-run the checks after a `bump`.
