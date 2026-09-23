#!/usr/bin/env node
// Bootstrap the mineflayer-bedrock-integration umbrella into a runnable state.
//
// Design (mirrors the junction setup that works in prismarine-workspace, made portable): one root `npm install` pulls
// mineflayer (file: submodule) + its whole dependency tree, HOISTED into the umbrella's root node_modules. We then replace
// the released copies of the bedrock packages in root node_modules with directory links to the submodule forks. Because
// Node resolves node_modules by walking UP, every consumer - the adapter AND transitive users like
// prismarine-registry -> minecraft-data - resolves the fork from root node_modules. (npm `overrides` with file: targets
// would be cleaner but currently crashes npm on the prismarine-biome/recipe peer deps.)
//
// The one thing links can't express is node-minecraft-data's DATA (a git submodule of the wrapper, not an npm dep): link
// zuri's #1327 data in and re-run generate:data (a plain file swap leaves the wrapper's generated index on the old layout).
// Run after `git clone --recurse-submodules`.
import { execSync } from 'node:child_process'
import { existsSync, rmSync, symlinkSync, lstatSync, mkdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEPS = join(ROOT, 'deps')
const run = (cmd, cwd) => { console.log(`$ ${cmd}  (in ${relative(ROOT, cwd) || '.'})`); execSync(cmd, { cwd, stdio: 'inherit' }) }
const isWin = process.platform === 'win32'
const lstatSafe = (p) => { try { return lstatSync(p) } catch { return null } }

function linkDir (target, linkPath) {
  if (!existsSync(target)) throw new Error(`link target missing: ${target}`)
  if (lstatSafe(linkPath)) rmSync(linkPath, { recursive: true, force: true })
  symlinkSync(target, linkPath, isWin ? 'junction' : 'dir')
  console.log(`  linked ${relative(ROOT, linkPath)} -> ${relative(ROOT, target)}`)
}

// package name (in root node_modules) -> submodule providing the fork
const FORKS = {
  'prismarine-chunk': 'prismarine-chunk',
  'minecraft-data': 'node-minecraft-data', // the wrapper (its data is linked to zuri's #1327 below)
  'bedrock-protocol': 'bedrock-protocol',
  'prismarine-physics': 'prismarine-physics',
  'prismarine-registry': 'prismarine-registry'
}

// 1) submodules (NON-recursive: node-minecraft-data's nested minecraft-data submodule points at UPSTREAM data; step 2 links
//    zuri's #1327 in instead).
run('git submodule update --init', ROOT)

// 2) link zuri's #1327 data into the node-minecraft-data wrapper BEFORE any generate:data runs.
linkDir(join(DEPS, 'minecraft-data'), join(DEPS, 'node-minecraft-data', 'minecraft-data'))

// 3) drop any stale per-submodule node_modules so the root install is the single source of truth.
for (const m of [...new Set(Object.values(FORKS)), 'mineflayer']) {
  const nm = join(DEPS, m, 'node_modules'); if (existsSync(nm)) { rmSync(nm, { recursive: true, force: true }); console.log(`  cleaned ${relative(ROOT, nm)}`) }
}

// 4) one root install: mineflayer (file:) + its whole tree, released versions, hoisted into root node_modules.
//    --ignore-scripts so node-minecraft-data's prepare (generate:data) does not run before we regenerate it below.
run('npm install --no-audit --no-fund --ignore-scripts', ROOT)

// 5) replace the released bedrock packages in root node_modules with links to the forks (resolved tree-wide by walk-up).
const NM = join(ROOT, 'node_modules')
if (!existsSync(NM)) mkdirSync(NM)
for (const [name, sub] of Object.entries(FORKS)) linkDir(join(DEPS, sub), join(NM, name))

// 6) regenerate the wrapper index against zuri's data (root node_modules/minecraft-data now links the fork wrapper).
run('npm run generate:data', join(NM, 'minecraft-data'))

console.log('\nBootstrap complete. Sanity check:')
console.log("  node -e \"const mf=require('mineflayer'); console.log('adapter loaded:', typeof mf.createBot==='function')\"")
