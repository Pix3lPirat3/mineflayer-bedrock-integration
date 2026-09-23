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
| `deps/node-minecraft-data` | Pix3lPirat3/node-minecraft-data | pin `d449f39` | data wrapper (consumes the data repo) |
| `deps/minecraft-data` | mc-zuri/minecraft-data | `bedrock-block-states-collision` | per-version bedrock data (#1327) |
| `deps/bedrock-protocol` | Pix3lPirat3/bedrock-protocol | `fix/nethernet-connectiontype` | protocol + transports |
| `deps/prismarine-physics` | Pix3lPirat3/prismarine-physics | `feat/bedrock-edition` | bedrock physics |
| `deps/prismarine-registry` | PR #57 (pin `ae29e1c`) | see note | registry build fix |

Two entries need a decision before creation (flagged in `.gitmodules`): **node-minecraft-data** is at a detached commit
(push it to a named bedrock branch, or pin the commit), and **prismarine-registry** is a PR-#57 head (point at a fetchable
fork/branch). Everything else tracks a clean branch.

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

## Validation reference

The pinned combination was exercised on this machine via the bedrock harness (`prismarine-workspace/tools/bedrock-harness`):
version matrix `world=Y` across 1.17.10 -> 1.26.45 (hashed span included), and the functional suite passing on the RakNet
1.26.45 path and the 1.26.51 NetherNet path. See `reviews/BEDROCK-PR-VALIDATION-ROADMAP-2026-09-23.md` and
`reviews/parity-suite-failure-triage-2026-09-23.md` in the workspace.
