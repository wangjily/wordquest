/**
 * 从公开大纲词表生成「完整版」词书数据。
 *
 * 数据来源：Kaiyiwing/qwerty-learner 仓库的 public/dicts（CET4_T / CET6_T / KaoYan_3_T），
 * 已下载到 .dicts/ 目录。生成物：src/data/dicts/cet4.json / cet6.json / postgrad.json
 * 格式（尽量短，减小包体）：
 *   [lemma, phonetic, zh]                 —— 只有释义
 *   [lemma, phonetic, zh, example, exZh]  —— 带例句（来自我们自己的精选词条）
 *
 * 用法：node scripts/gen-big.mjs
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DICT_DIR = path.join(ROOT, '.dicts')
const OUT_DIR = path.join(ROOT, 'src/data/dicts')

/* ---------- 1. 收集现有精选词条的例句 ---------- */
const tmp = path.join(ROOT, '.tmp-curated.mjs')
await build({
  entryPoints: ['src/data/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: tmp,
  logLevel: 'error',
})
const { ALL_WORDS } = await import('file://' + tmp.replace(/\\/g, '/'))
fs.unlinkSync(tmp)

/** lemma → 例句 */
const curated = new Map()
for (const w of ALL_WORDS) {
  if (w.deckId.endsWith('-full')) continue
  if (!w.example) continue
  const k = w.lemma.trim().toLowerCase()
  if (!curated.has(k)) curated.set(k, [w.example, w.exampleZh])
}
console.log('可用例句的精选词条：', curated.size)

/* ---------- 2. 解析大纲词表 ---------- */
const SIMPLE = /^[a-zA-Z][a-zA-Z'’-]*$/

function normPhonetic(raw) {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''
  s = s.split(/[;；]/)[0].trim()
  s = s.replace(/^'/, 'ˈ').replace(/'/g, 'ˈ')
  return `/${s}/`
}

function normZh(trans) {
  if (!Array.isArray(trans) || !trans.length) return ''
  return trans
    .slice(0, 3)
    .map((t) => String(t).replace(/\s+/g, ' ').replace(/，\s*/g, '，').replace(/；\s*/g, '；').trim())
    .filter(Boolean)
    .join('；')
}

function loadDict(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(DICT_DIR, file), 'utf8'))
  const seen = new Set()
  const rows = []
  for (const item of raw) {
    const lemma = String(item.name || '').trim()
    const key = lemma.toLowerCase()
    if (!SIMPLE.test(lemma) || seen.has(key)) continue
    const zh = normZh(item.trans)
    if (!zh) continue
    seen.add(key)
    rows.push({ lemma, phonetic: normPhonetic(item.usphone || item.ukphone), zh })
  }
  return rows
}

function emit(file, rows) {
  const out = []
  let withEx = 0
  for (const r of rows) {
    const ex = curated.get(r.lemma.toLowerCase())
    if (ex) {
      withEx++
      out.push([r.lemma, r.phonetic, r.zh, ex[0], ex[1]])
    } else {
      out.push([r.lemma, r.phonetic, r.zh])
    }
  }
  // 带例句的排到最前，其余保持词表原顺序
  out.sort((a, b) => (b.length >= 5 ? 1 : 0) - (a.length >= 5 ? 1 : 0))
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const p = path.join(OUT_DIR, file)
  fs.writeFileSync(p, JSON.stringify(out))
  console.log(
    `${file}: ${out.length} 词（含例句 ${withEx}），${(fs.statSync(p).size / 1024).toFixed(0)}KB`,
  )
}

emit(
  'cet4.json',
  loadDict('CET4_T.json'),
)
emit(
  'cet6.json',
  loadDict('CET6_T.json'),
)
emit(
  'postgrad.json',
  loadDict('KaoYan_3_T.json'),
)
