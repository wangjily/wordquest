import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const out = path.resolve('.tmp-data.mjs')
await build({
  entryPoints: ['src/data/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: out,
  logLevel: 'error',
})
const { DECKS, ALL_WORDS, STAGES } = await import('file://' + out.replace(/\\/g, '/'))
fs.unlinkSync(out)

const byDeck = new Map()
for (const w of ALL_WORDS) byDeck.set(w.deckId, (byDeck.get(w.deckId) ?? 0) + 1)

// 1) 重复 word id
const seen = new Map()
const dup = []
for (const w of ALL_WORDS) {
  if (seen.has(w.id)) dup.push(w.id)
  else seen.set(w.id, 1)
}

// 2) 重复 term（同语言内同一拼写）
const termSeen = new Map()
const dupTerm = []
for (const w of ALL_WORDS) {
  const k = `${w.lang}|${w.lemma.toLowerCase()}`
  if (termSeen.has(k)) dupTerm.push(`${w.lemma}(${w.deckId})`)
  else termSeen.set(k, 1)
}

console.log('词书总数 :', DECKS.length)
console.log('词条总数 :', ALL_WORDS.length)
console.log('重复 id  :', dup.length, dup.slice(0, 8).join(','))
console.log('重复词   :', dupTerm.length, dupTerm.slice(0, 8).join(','))
console.log('')
for (const s of STAGES) {
  const ds = DECKS.filter((d) => d.stage === s.code)
  const n = ds.reduce((a, d) => a + (byDeck.get(d.id) ?? 0), 0)
  console.log(`${s.label.zh.padEnd(5, '　')} ${String(ds.length).padStart(2)} 本 / ${String(n).padStart(4)} 词`)
  for (const d of ds) {
    const c = byDeck.get(d.id) ?? 0
    const flag = c === 0 ? '  ⚠ 空' : c < 10 ? '  ⚠ 少' : ''
    console.log(`    · ${d.title.zh.padEnd(14, '　')} ${String(c).padStart(3)}${flag}`)
  }
}
