// End-to-end smoke of the assembled umbrella: connect the umbrella's adapter to a fresh BDS, check world + inventory + move.
const V = process.env.SMOKEV || '1.19.80'
const mineflayer = require('mineflayer') // resolves the umbrella's assembled bedrock adapter
const bot = mineflayer.createBot({ edition: 'bedrock', host: '127.0.0.1', port: 19161, offline: true, username: 'UmbrellaSmoke', version: 'bedrock_' + V, hideErrors: false })
const sleep = ms => new Promise(r => setTimeout(r, ms))
bot.on('kicked', r => { console.log('KICKED', JSON.stringify(r).slice(0,100)) })
bot.on('error', e => { console.log('ERROR', e.message) })
bot.once('spawn', async () => {
  console.log('SPAWN ok, version', bot.version)
  await sleep(3500)
  const p = bot.entity.position.floored(); let solids = []
  for (let y = p.y + 2; y >= p.y - 10; y--) { const b = bot.blockAt(p.offset(0, y - p.y, 0)); if (b && b.name && b.name !== 'air') solids.push(b.name) }
  console.log('WORLD: pos y=' + p.y + ' solids below=' + solids.length + ' [' + solids.slice(0,4).join(',') + ']')
  bot.chat('/gamemode creative @s'); await sleep(600); bot.chat('/give @s diamond_pickaxe 1'); await sleep(1000)
  const pick = bot.inventory.items().find(i => i.name === 'diamond_pickaxe')
  console.log('INVENTORY: diamond_pickaxe received=' + !!pick + ' maxDurability=' + (pick ? pick.maxDurability : '?'))
  const s = bot.entity.position.clone(); if (bot.setControlState) { bot.setControlState('forward', true); await sleep(1000); bot.setControlState('forward', false); await sleep(300); console.log('MOVE: moved=' + (bot.entity.position.distanceTo(s) > 0.3)) }
  console.log('SMOKE-RESULT: world=' + (solids.length > 0) + ' inv=' + !!pick + ' (version ' + V + ')')
  try { bot.quit() } catch {}; setTimeout(() => process.exit(0), 500)
})
setTimeout(() => { console.log('SMOKE TIMEOUT'); process.exit(3) }, 45000)
