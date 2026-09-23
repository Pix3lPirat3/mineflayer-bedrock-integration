#!/usr/bin/env node
// Bootstrap the mineflayer-bedrock-integration umbrella into a runnable state.
// DRAFT (2026-09-23): mirrors the local worktree+junction wiring we use in prismarine-workspace, made cross-platform via
// directory symlinks (junctions on Windows). Run after `git clone --recurse-submodules`. Not yet exercised end-to-end from
// a fresh clone - treat the link/regenerate steps as the pieces to verify first when the real repo exists.
import { execSync } from 'node:child_process'
import { existsSync, rmSync, symlinkSync, statSync, lstatSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEPS = join(ROOT, 'deps')
const run = (cmd, cwd) => { console.log(`$ ${cmd}  (in ${relative(ROOT, cwd) || '.'})`); execSync(cmd, { cwd, stdio: 'inherit' }) }
const isWin = process.platform === 'win32'

// Replace `linkPath` with a directory link to `target` (junction on Windows, dir symlink elsewhere). Idempotent.
function linkDir (target, linkPath) {
  if (!existsSync(target)) throw new Error(`link target missing: ${target}`)
  try { if (existsSync(linkPath) || lstatSyncSafe(linkPath)) rmSync(linkPath, { recursive: true, force: true }) } catch {}
  symlinkSync(target, linkPath, isWin ? 'junction' : 'dir')
  console.log(`  linked ${relative(ROOT, linkPath)} -> ${relative(ROOT, target)}`)
}
function lstatSyncSafe (p) { try { return lstatSync(p) } catch { return null } }

// 1) submodules
run('git submodule update --init --recursive', ROOT)

// 2) install each submodule's own deps (skip scripts we run explicitly; --no-audit for speed)
for (const m of ['bedrock-protocol', 'prismarine-chunk', 'prismarine-physics', 'prismarine-registry', 'node-minecraft-data', 'mineflayer']) {
  const dir = join(DEPS, m)
  if (existsSync(join(dir, 'package.json'))) run('npm install --no-audit --no-fund', dir)
}

// 3) data: point the node-minecraft-data wrapper's data at zuri's #1327 submodule, then REGENERATE the index.
//    (A plain file swap is not enough - data.js bakes in the previous dataPaths layout.)
linkDir(join(DEPS, 'minecraft-data'), join(DEPS, 'node-minecraft-data', 'minecraft-data'))
run('npm run generate:data', join(DEPS, 'node-minecraft-data'))

// 4) link the adapter's dependencies to the sibling submodules so require() resolves the bedrock forks, not npm releases.
const MF_NM = join(DEPS, 'mineflayer', 'node_modules')
const links = {
  'prismarine-chunk': join(DEPS, 'prismarine-chunk'),
  'minecraft-data': join(DEPS, 'node-minecraft-data'), // the wrapper (already linked to zuri's data + regenerated)
  'bedrock-protocol': join(DEPS, 'bedrock-protocol'),
  'prismarine-physics': join(DEPS, 'prismarine-physics'),
  'prismarine-registry': join(DEPS, 'prismarine-registry')
}
for (const [name, target] of Object.entries(links)) linkDir(target, join(MF_NM, name))

console.log('\nBootstrap complete. Sanity check:')
console.log("  node -e \"const mf=require('./deps/mineflayer'); console.log('mineflayer bedrock adapter loaded')\"")
