/**
 * 生成全量语料 public/corpus.json
 *
 * 数据来源：qwerty-learner 公开词表（.dicts/ 目录），覆盖小学 PEP 教材、中考/高考、
 * 四六级、考研、雅思、托福、GRE、专四专八、JLPT N5–N1。
 *
 * 输出格式（尽量紧凑，靠 gzip 压缩）：
 *   {
 *     v: 1,
 *     decks: [ { id, lang, title, level, examTag, desc, accent, stage, series, cover, count } ],
 *     words: { [deckId]: [ [lemma, phonetic, zh, example?, exampleZh?, pos?, reading?] ] }
 *   }
 *
 * 现有精选词条的例句会被注入到对应词条，并把带例句的词排到书的最前面。
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DICT = path.join(ROOT, '.dicts')
const OUTDIR = path.join(ROOT, 'public', 'corpus')

/* ------------------------------------------------------------------ */
/* 词书定义                                                            */
/* ------------------------------------------------------------------ */

/** 拼读书的词源：小学到考研全量，按拼写规则筛真实单词 */
const PHONICS_SRC = [
  'PEPXiaoXue3_1_T', 'PEPXiaoXue3_2_T', 'PEPXiaoXue4_1_T', 'PEPXiaoXue4_2_T',
  'PEPXiaoXue5_1_T', 'PEPXiaoXue5_2_T', 'PEPXiaoXue6_1_T', 'PEPXiaoXue6_2_T',
  'ChuZhongluan_2_T', 'ZhongKaoHeXin', 'GaoKao_3500', 'CET4_T', 'CET6_T',
  'IELTS_3_T', 'TOEFL_3_T',
]

/** cover 简写：[from, to, ink, label, big] */
const C = (from, to, ink, label, big) => ({ from, to, ink, label, big })

const DECKS = [
  /* 自然拼读：从小学与初中词表里按拼写规则筛真实单词 */
  {
    id: 'en-phonics-cvc', lang: 'en', stage: 'phonics', series: '拼读规则',
    src: PHONICS_SRC,
    rule: 'cvc',
    title: { zh: '短元音拼读', en: 'Short Vowels (CVC)' }, level: 'A0', examTag: 'Phonics',
    desc: { zh: '三字母 CVC 词，练 a e i o u 的短音', en: 'Three-letter CVC words for short a e i o u' },
    accent: 'amber', cover: C('#FFE9C7', '#F4C078', '#6B3C06', 'PHONICS', '拼读'),
  },
  {
    id: 'en-phonics-magic', lang: 'en', stage: 'phonics', series: '拼读规则',
    src: PHONICS_SRC,
    rule: 'magic',
    title: { zh: 'Magic E 长音', en: 'Magic E' }, level: 'A0', examTag: 'Phonics',
    desc: { zh: '词尾加 e，前面的元音读字母本音', en: 'Silent final e makes the vowel long' },
    accent: 'cyan', cover: C('#D4EEFB', '#86C9EC', '#0F4459', 'MAGIC E', '长音'),
  },
  {
    id: 'en-phonics-blend', lang: 'en', stage: 'phonics', series: '拼读规则',
    src: PHONICS_SRC,
    rule: 'blend',
    title: { zh: '辅音组合', en: 'Consonant Blends' }, level: 'A0', examTag: 'Phonics',
    desc: { zh: 'sh / ch / th / bl / st / tr 等组合音', en: 'sh, ch, th, bl, st, tr and friends' },
    accent: 'violet', cover: C('#E2DBFF', '#A996F5', '#2E1D6B', 'BLENDS', '组合'),
  },

  /* 小学：人教版教材分册 */
  {
    id: 'en-primary-core', lang: 'en', stage: 'primary', series: '人教版',
    src: ['PEPXiaoXue3_1_T', 'PEPXiaoXue3_2_T', 'PEPXiaoXue4_1_T', 'PEPXiaoXue4_2_T'],
    title: { zh: '小学三·四年级', en: 'Primary Grade 3–4' }, level: 'A1', examTag: 'PEP',
    desc: { zh: '人教版三年级上～四年级下，四册词汇全集', en: 'PEP Grade 3–4, all four volumes' },
    accent: 'amber', cover: C('#FFF0D6', '#F7C982', '#6B3C06', 'PEP 3–4', '小学'),
  },
  {
    id: 'en-primary-sight', lang: 'en', stage: 'primary', series: '人教版',
    src: ['PEPXiaoXue5_1_T', 'PEPXiaoXue5_2_T'],
    title: { zh: '小学五年级', en: 'Primary Grade 5' }, level: 'A1', examTag: 'PEP',
    desc: { zh: '人教版五年级上下册词汇全集', en: 'PEP Grade 5, both volumes' },
    accent: 'cyan', cover: C('#DCF1FA', '#8FD0E9', '#0F4459', 'PEP 5', '小学'),
  },
  {
    id: 'en-primary-scene', lang: 'en', stage: 'primary', series: '人教版',
    src: ['PEPXiaoXue6_1_T', 'PEPXiaoXue6_2_T'],
    title: { zh: '小学六年级', en: 'Primary Grade 6' }, level: 'A1–A2', examTag: 'PEP',
    desc: { zh: '人教版六年级上下册词汇全集', en: 'PEP Grade 6, both volumes' },
    accent: 'rose', cover: C('#FFE1E8', '#F498AC', '#7A2137', 'PEP 6', '小学'),
  },

  /* 初中 */
  {
    id: 'en-junior', lang: 'en', stage: 'junior', series: '核心词',
    src: ['ChuZhongluan_2_T'],
    title: { zh: '初中核心词汇', en: 'Junior High Core' }, level: 'A2–B1', examTag: '中考',
    desc: { zh: '初中三年完整词表，中考全覆盖', en: 'Full junior-high word list' },
    accent: 'violet', cover: C('#E6DFFF', '#AE9BF7', '#2E1D6B', 'JUNIOR', '初中'),
  },
  {
    id: 'en-junior-past', lang: 'en', stage: 'junior', series: '高频词',
    src: ['ZhongKaoHeXin'],
    title: { zh: '中考高频词', en: 'Zhongkao High-frequency' }, level: 'A2–B1', examTag: '中考',
    desc: { zh: '中考真题语料里的高频词，带词性标注', en: 'High-frequency words from real Zhongkao papers' },
    accent: 'amber', cover: C('#FFEDD0', '#F3BE72', '#6B3C06', 'ZHONGKAO', '中考'),
  },

  /* 高中 */
  {
    id: 'en-senior', lang: 'en', stage: 'senior', series: '核心词',
    src: ['GaoKao_3500'],
    title: { zh: '高考 3500 词', en: 'Gaokao 3500' }, level: 'B1–B2', examTag: '高考',
    desc: { zh: '高考英语 3500 全量词表', en: 'The full 3,500-word Gaokao list' },
    accent: 'cyan', cover: C('#D8EFFB', '#7FC4E8', '#0F4459', 'GAOKAO', '高中'),
  },

  /* 四级 */
  {
    id: 'en-cet4', lang: 'en', stage: 'cet4', series: '核心词',
    src: ['CET4_T'],
    title: { zh: 'CET-4 大纲词', en: 'CET-4 Syllabus' }, level: 'B1–B2', examTag: 'CET-4',
    desc: { zh: '四级大纲全量，2500+ 词不留死角', en: 'The complete CET-4 syllabus' },
    accent: 'cyan', cover: C('#D3EEFA', '#7CC4E8', '#0F4459', 'CET-4', '四级'),
  },

  /* 六级 */
  {
    id: 'en-cet6', lang: 'en', stage: 'cet6', series: '核心词',
    src: ['CET6_T'],
    title: { zh: 'CET-6 大纲词', en: 'CET-6 Syllabus' }, level: 'B2–C1', examTag: 'CET-6',
    desc: { zh: '六级大纲全量，2300+ 词', en: 'The complete CET-6 syllabus' },
    accent: 'rose', cover: C('#FFD9E2', '#F290A6', '#7A2137', 'CET-6', '六级'),
  },

  /* 考研 */
  {
    id: 'en-postgrad', lang: 'en', stage: 'postgrad', series: '核心词',
    src: ['KaoYan_3_T'],
    title: { zh: '考研英语大纲', en: 'Postgraduate Syllabus' }, level: 'C1', examTag: '考研',
    desc: { zh: '考研英语大纲全量，3700+ 词', en: 'The complete postgraduate English syllabus' },
    accent: 'amber', cover: C('#FFE7C7', '#EFB265', '#6E3D09', 'KAOYAN', '考研'),
  },

  /* 留学 */
  {
    id: 'en-ielts', lang: 'en', stage: 'abroad', series: '雅思',
    src: ['IELTS_3_T'],
    title: { zh: '雅思核心词', en: 'IELTS' }, level: 'B2–C1', examTag: 'IELTS',
    desc: { zh: '雅思听说读写全场景词表', en: 'Full IELTS vocabulary' },
    accent: 'cyan', cover: C('#D9F4EF', '#7FD5C6', '#0C4A42', 'IELTS', '雅思'),
  },
  {
    id: 'en-toefl', lang: 'en', stage: 'abroad', series: '托福',
    src: ['TOEFL_3_T'],
    title: { zh: '托福核心词', en: 'TOEFL' }, level: 'B2–C1', examTag: 'TOEFL',
    desc: { zh: '托福学科词汇，覆盖听力与阅读', en: 'Full TOEFL vocabulary' },
    accent: 'violet', cover: C('#E4DDFF', '#A894F8', '#2E1D6B', 'TOEFL', '托福'),
  },
  {
    id: 'en-gre', lang: 'en', stage: 'abroad', series: 'GRE',
    src: ['GRE_3_T'],
    title: { zh: 'GRE 核心词', en: 'GRE' }, level: 'C1–C2', examTag: 'GRE',
    desc: { zh: 'GRE 填空与阅读高频难词', en: 'Full GRE vocabulary' },
    accent: 'rose', cover: C('#FFDFE4', '#EF93A5', '#7A2137', 'GRE', 'GRE'),
  },

  /* 英专 */
  {
    id: 'en-tem4', lang: 'en', stage: 'major', series: '专四',
    src: ['Level4luan_2_T'],
    title: { zh: '专四核心词', en: 'TEM-4' }, level: 'B2–C1', examTag: 'TEM-4',
    desc: { zh: '英语专业四级完整词表', en: 'Full TEM-4 vocabulary' },
    accent: 'amber', cover: C('#FFEBCD', '#F0BE79', '#6B3C06', 'TEM-4', '专四'),
  },
  {
    id: 'en-tem8', lang: 'en', stage: 'major', series: '专八',
    src: ['Level8luan_2_T'],
    title: { zh: '专八核心词', en: 'TEM-8' }, level: 'C1–C2', examTag: 'TEM-8',
    desc: { zh: '英语专业八级完整词表，一万二千词', en: 'Full TEM-8 vocabulary' },
    accent: 'violet', cover: C('#E7E0FF', '#AC99F6', '#2E1D6B', 'TEM-8', '专八'),
  },

  /* 日语 */
  {
    id: 'ja-n5', lang: 'ja', stage: 'japanese', series: 'JLPT',
    src: ['JapVocabList.N5_zh'],
    title: { zh: 'JLPT N5', en: 'JLPT N5' }, level: 'N5', examTag: 'JLPT',
    desc: { zh: '入门级全量词表，带假名读音', en: 'Complete N5 list with kana' },
    accent: 'rose', cover: C('#FFE0E7', '#F59CB0', '#7A2137', 'JLPT N5', 'N5'),
  },
  {
    id: 'ja-n4', lang: 'ja', stage: 'japanese', series: 'JLPT',
    src: ['JapVocabList.N4_zh'],
    title: { zh: 'JLPT N4', en: 'JLPT N4' }, level: 'N4', examTag: 'JLPT',
    desc: { zh: '初级全量词表，带假名读音', en: 'Complete N4 list with kana' },
    accent: 'amber', cover: C('#FFEAD0', '#F3BE77', '#6B3C06', 'JLPT N4', 'N4'),
  },
  {
    id: 'ja-n3', lang: 'ja', stage: 'japanese', series: 'JLPT',
    src: ['JapVocabList.N3_zh'],
    title: { zh: 'JLPT N3', en: 'JLPT N3' }, level: 'N3', examTag: 'JLPT',
    desc: { zh: '中级全量词表，带假名读音', en: 'Complete N3 list with kana' },
    accent: 'cyan', cover: C('#D8F0FB', '#84C9E9', '#0F4459', 'JLPT N3', 'N3'),
  },
  {
    id: 'ja-n2', lang: 'ja', stage: 'japanese', series: 'JLPT',
    src: ['JapVocabList.N2_zh'],
    title: { zh: 'JLPT N2', en: 'JLPT N2' }, level: 'N2', examTag: 'JLPT',
    desc: { zh: '中高级全量词表，带假名读音', en: 'Complete N2 list with kana' },
    accent: 'violet', cover: C('#E5DEFF', '#AB98F7', '#2E1D6B', 'JLPT N2', 'N2'),
  },
  {
    id: 'ja-n1', lang: 'ja', stage: 'japanese', series: 'JLPT',
    src: ['JapVocabList.N1_zh'],
    title: { zh: 'JLPT N1', en: 'JLPT N1' }, level: 'N1', examTag: 'JLPT',
    desc: { zh: '高级全量词表，带假名读音', en: 'Complete N1 list with kana' },
    accent: 'rose', cover: C('#FFDBE2', '#EF92A4', '#7A2137', 'JLPT N1', 'N1'),
  },

  /* 西班牙语：没有公开大纲，使用内置 A1/A2 常用词表 */
  {
    id: 'es-a1', lang: 'es', stage: 'spanish', series: 'DELE',
    legacy: 'es-a1',
    title: { zh: '西班牙语 A1', en: 'Spanish A1' }, level: 'A1', examTag: 'DELE',
    desc: { zh: '问候、数字、家庭、日常动作等 A1 必备词', en: 'Everyday A1 vocabulary' },
    accent: 'amber', cover: C('#FFF0D2', '#F5C77E', '#6B3C06', 'DELE A1', '西语'),
  },
  {
    id: 'es-a2', lang: 'es', stage: 'spanish', series: 'DELE',
    legacy: 'es-a2',
    title: { zh: '西班牙语 A2', en: 'Spanish A2' }, level: 'A2', examTag: 'DELE',
    desc: { zh: '连接词、副词与情绪形容词', en: 'Connectors, adverbs and feelings' },
    accent: 'rose', cover: C('#FFE2E9', '#F29BAE', '#7A2137', 'DELE A2', '西语'),
  },
]

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

const readDict = (name) => {
  const p = path.join(DICT, `${name}.json`)
  if (!fs.existsSync(p)) throw new Error(`缺少词表 ${name}.json`)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const cleanPhonetic = (s) =>
  (s || '')
    .replace(/[；;]/g, ';')
    .split(';')[0]
    .replace(/[[\]]/g, '')
    .trim()

/** 把 trans 数组拼成一句释义，去掉多余空白 */
const cleanZh = (arr) =>
  (arr || [])
    .map((t) => String(t).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('；')
    .replace(/；+/g, '；')
    .trim()

const CVC_RE = /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/
const MAGIC_RE = /^[bcdfghjklmnpqrstvwxyz]{1,2}[aeiou][bcdfghjklmnprstvz]e$/
// 组合音只取短词（≤6 字母），否则会把所有以 st/re- 开头的长词都算进来
const BLEND_RE = /^(sh|ch|th|wh|ph|bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|scr|spr|str|spl|shr|thr)[a-z]{1,4}$/

const RULES = { cvc: CVC_RE, magic: MAGIC_RE, blend: BLEND_RE }

/** 日语 notation 形如「好況(こうきょう)」或「これ」 */
function splitJa(notation, roman) {
  const s = (notation || '').trim()
  const m = s.match(/^(.+?)[(（](.+?)[)）]\s*$/)
  if (m) return { term: m[1].trim(), reading: m[2].trim() }
  if (s) return { term: s, reading: '' }
  return { term: (roman || '').trim(), reading: '' }
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

async function loadHighlights() {
  // 用 esbuild 打包现有数据层，拿到带例句的精选词条
  const tmp = path.join(ROOT, '.tmp-highlights.mjs')
  await build({
    entryPoints: [path.join(ROOT, 'src/data/_legacy.ts')],
    bundle: true, format: 'esm', platform: 'neutral',
    outfile: tmp, logLevel: 'error',
  })
  const mod = await import(`file://${tmp.replace(/\\/g, '/')}`)
  fs.unlinkSync(tmp)
  const map = new Map()
  const byDeck = new Map()
  for (const w of mod.LEGACY_WORDS) {
    if (!byDeck.has(w.deckId)) byDeck.set(w.deckId, [])
    byDeck.get(w.deckId).push(w)
    if (!w.example) continue
    map.set(`${w.lang}|${w.lemma.toLowerCase()}`, w)
  }
  return { byLemma: map, byDeck }
}

function buildDeckWords(deck, dicts, highlights) {
  const rows = []
  const seen = new Set()
  const rule = deck.rule ? RULES[deck.rule] : null

  if (deck.legacy) {
    for (const w of highlights.byDeck.get(deck.legacy) || []) {
      const k = w.lemma.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({
        lemma: w.lemma,
        phon: w.phonetic || '',
        zh: w.zh,
        reading: w.reading || '',
        example: w.example || '',
        exampleZh: w.exampleZh || '',
        pos: w.pos || '',
      })
    }
    return rows
  }

  for (const name of deck.src) {
    const list = dicts[name]
    if (!list) continue
    for (const it of list) {
      let lemma, reading = '', phon = '', zh = ''
      if (deck.lang === 'ja') {
        const j = splitJa(it.notation, it.name)
        lemma = j.term
        reading = j.reading
      } else {
        lemma = String(it.name || '').trim()
        phon = cleanPhonetic(it.usphone || it.ukphone)
      }
      zh = cleanZh(it.trans)
      if (!lemma || !zh) continue
      // 只要纯字母单词（排除词组、带空格或数字的条目）
      if (deck.lang === 'en' && !/^[a-zA-Z][a-zA-Z'’-]*$/.test(lemma)) continue
      if (rule && !rule.test(lemma.toLowerCase())) continue
      const k = lemma.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({ lemma, phon, zh, reading })
    }
  }

  // 注入精选例句，并把带例句的排到最前
  const withEx = []
  const rest = []
  for (const r of rows) {
    const hl = highlights.byLemma.get(`${deck.lang}|${r.lemma.toLowerCase()}`)
    if (hl && hl.example) {
      withEx.push({ ...r, example: hl.example, exampleZh: hl.exampleZh || '', pos: hl.pos || '' })
    } else {
      rest.push(r)
    }
  }
  return [...withEx, ...rest]
}

const main = async () => {
  const highlights = await loadHighlights()

  const dicts = {}
  for (const d of DECKS) {
    for (const s of d.src || []) {
      if (!dicts[s]) dicts[s] = readDict(s)
    }
  }

  const decks = []
  const words = {}
  let total = 0

  for (const d of DECKS) {
    const list = buildDeckWords(d, dicts, highlights)
    if (!list.length) {
      console.warn(`  ! ${d.id} 没有取到词条，跳过`)
      continue
    }
    words[d.id] = list.map((r) => {
      // 固定位置：[lemma, phonetic, zh, reading, example, exampleZh, pos]，尾部空值裁掉
      const row = [r.lemma, r.phon || '', r.zh, r.reading || '', r.example || '', r.exampleZh || '', r.pos || '']
      while (row.length > 3 && row[row.length - 1] === '') row.pop()
      return row
    })
    decks.push({ ...d, src: undefined, rule: undefined, legacy: undefined, count: list.length })
    total += list.length
    console.log(`  ${String(list.length).padStart(6)}  ${d.id}  ${d.title.zh}`)
  }

  // 分片输出：索引很小，词条按词书单独成文件，运行时按需加载
  fs.mkdirSync(OUTDIR, { recursive: true })
  for (const f of fs.readdirSync(OUTDIR)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(OUTDIR, f))
  }

  let bytes = 0
  for (const [id, rows] of Object.entries(words)) {
    const p = path.join(OUTDIR, `${id}.json`)
    fs.writeFileSync(p, JSON.stringify(rows))
    bytes += fs.statSync(p).size
  }

  const index = { v: 1, generatedAt: new Date().toISOString().slice(0, 10), total, decks }
  fs.writeFileSync(path.join(OUTDIR, 'index.json'), JSON.stringify(index))

  console.log(`\n合计 ${decks.length} 本 / ${total} 词`)
  console.log(`分片 ${decks.length} 个，词条合计 ${(bytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(`索引 ${(fs.statSync(path.join(OUTDIR, 'index.json')).size / 1024).toFixed(1)} KB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
