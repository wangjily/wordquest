import { ALL_WORDS, DECKS, WORD_MAP, getDeck } from '@/data'
import type { Deck, Word } from '@/data'
import { searchWords } from './search'
import { buildQueue, dueItems, summarize, useGame, weakWords } from './store'
import type { CardState, ReviewLog, Settings } from '@/data'
import { intervalLabel } from './srs'

/**
 * 闲聊素材（笑话 / 安慰 / 冷知识）单独打成懒加载 chunk。
 * 它只在用户真的想聊的时候才用得上，没必要占首屏那几十 KB —— 首屏要留给词书。
 */
type ChatKit = typeof import('./chat')
let kitPromise: Promise<ChatKit> | null = null
function chatKit(): Promise<ChatKit> {
  // 失败就把 promise 清掉，下次还能重试（换包后旧页面里 chunk 404 的情况）
  kitPromise ??= import('./chat').catch((e: unknown) => {
    kitPromise = null
    throw e
  })
  return kitPromise
}

/**
 * 词跃助手的本地引擎。
 *
 * 设计取向：不联网也要能用。把「能算的」全部用本地数据算掉——
 * 学习计划、薄弱词、词典查询、记忆提示、随堂测——只有开放式对话才需要大模型。
 * 所以没配 API Key 时它会明确说自己处在「本地模式」。
 */

export interface AssistantCard {
  word: Word
  deck?: Deck
}

export interface AssistantQuiz {
  word: Word
  prompt: string
  options: string[]
  answer: number
}

export interface AssistantReply {
  text: string
  cards?: AssistantCard[]
  actions?: { label: string; to: string }[]
  quiz?: AssistantQuiz
  /** 助手直接执行的动作，由组件落到 store */
  apply?: { dailyGoal?: number }
}

export interface AssistantContext {
  locale: 'zh' | 'en'
  cards: Record<string, CardState>
  logs: ReviewLog[]
  settings: Settings
  /** 正在进行中的测验答案（上一条助手消息给出的题） */
  pendingQuiz?: AssistantQuiz | null
}

const zh = (c: AssistantContext) => c.locale === 'zh'

/* ------------------------------------------------------------------ */
/* 词根词缀表（用于记忆提示）                                            */
/* ------------------------------------------------------------------ */

const PREFIXES: [string, string][] = [
  ['un', '否定 / 相反'], ['re', '再 / 回'], ['pre', '在前 / 预先'], ['pro', '向前 / 支持'],
  ['de', '向下 / 去除'], ['dis', '分开 / 否定'], ['in', '进入 / 否定'], ['im', '进入 / 否定'],
  ['en', '使…成为'], ['em', '使…进入'], ['ex', '向外 / 出'], ['sub', '在下面'],
  ['super', '在上 / 超过'], ['inter', '之间'], ['trans', '穿过'], ['con', '共同 / 一起'],
  ['com', '共同 / 一起'], ['per', '贯穿 / 彻底'], ['ad', '朝向'], ['ab', '离开'],
  ['anti', '反对'], ['auto', '自己'], ['bi', '两个'], ['co', '共同'], ['mis', '错误'],
  ['non', '非'], ['over', '过度 / 在上'], ['under', '在下 / 不足'], ['post', '之后'],
  ['semi', '一半'], ['mono', '单一'], ['multi', '多'], ['micro', '微小'], ['macro', '宏大'],
]

const SUFFIXES: [string, string][] = [
  ['tion', '名词：动作 / 状态'], ['sion', '名词：动作 / 状态'], ['ment', '名词：结果 / 状态'],
  ['ness', '名词：性质'], ['ity', '名词：性质'], ['ance', '名词：状态'], ['ence', '名词：状态'],
  ['ism', '名词：主义 / 体系'], ['ist', '名词：人'], ['er', '名词：人 / 物'], ['or', '名词：人 / 物'],
  ['able', '形容词：能被…的'], ['ible', '形容词：能被…的'], ['ous', '形容词：充满…的'],
  ['ive', '形容词：有…性质的'], ['ful', '形容词：充满…的'], ['less', '形容词：没有…的'],
  ['al', '形容词：…的'], ['ic', '形容词：…的'], ['ish', '形容词：略…的'],
  ['ize', '动词：使…化'], ['ify', '动词：使…'], ['ise', '动词：使…化'],
  ['ly', '副词：以…方式'], ['ward', '方向'], ['ship', '名词：身份 / 关系'],
]

const ROOTS: [string, string][] = [
  ['spect', '看'], ['spic', '看'], ['port', '搬 / 运'], ['dict', '说'], ['duc', '引导'],
  ['duct', '引导'], ['fac', '做'], ['fact', '做'], ['fect', '做'], ['fer', '带来'],
  ['ject', '扔'], ['mit', '送'], ['miss', '送'], ['scrib', '写'], ['script', '写'],
  ['struct', '建造'], ['tract', '拉'], ['vert', '转'], ['vers', '转'], ['vid', '看'],
  ['vis', '看'], ['voc', '声音 / 叫'], ['vok', '声音 / 叫'], ['chron', '时间'], ['geo', '地球'],
  ['graph', '写 / 画'], ['log', '说 / 学科'], ['meter', '测量'], ['phon', '声音'],
  ['photo', '光'], ['psych', '心灵'], ['scope', '看'], ['tele', '远'], ['therm', '热'],
  ['bio', '生命'], ['aqua', '水'], ['audi', '听'], ['cred', '相信'], ['fid', '信任'],
  ['luc', '光'], ['man', '手'], ['ped', '脚'], ['pos', '放'], ['prim', '第一'],
  ['sent', '感觉'], ['sol', '太阳 / 单独'], ['temp', '时间'], ['terr', '土地'],
  ['val', '价值 / 强'], ['viv', '活'], ['form', '形状'], ['mov', '移动'], ['mot', '移动'],
  ['cap', '拿 / 抓'], ['cept', '拿 / 抓'], ['grad', '步 / 级'], ['gress', '走'], ['path', '感情 / 病'],
]

function explainMorphology(word: string, locale: 'zh' | 'en'): string[] {
  const w = word.toLowerCase()
  const notes: string[] = []

  for (const [p, meaning] of PREFIXES) {
    if (w.length > p.length + 2 && w.startsWith(p)) {
      notes.push(locale === 'zh' ? `前缀 ${p}- ≈ ${meaning}` : `prefix ${p}- ≈ ${meaning}`)
      break
    }
  }
  for (const [s, meaning] of SUFFIXES) {
    if (w.length > s.length + 2 && w.endsWith(s)) {
      notes.push(locale === 'zh' ? `后缀 -${s} ≈ ${meaning}` : `suffix -${s} ≈ ${meaning}`)
      break
    }
  }
  for (const [r, meaning] of ROOTS) {
    if (w.includes(r) && r.length >= 3) {
      notes.push(locale === 'zh' ? `词根 ${r}- ≈ ${meaning}` : `root ${r}- ≈ ${meaning}`)
      break
    }
  }
  return notes
}

/* ------------------------------------------------------------------ */
/* 意图识别                                                            */
/* ------------------------------------------------------------------ */

type Intent =
  | 'plan' | 'weak' | 'quiz' | 'stats' | 'decks' | 'goal'
  | 'define' | 'memorize' | 'help' | 'joke' | 'comfort' | 'chat'

const has = (s: string, words: string[]) => words.some((w) => s.includes(w))

/**
 * 顺序有讲究，不是随便排的：
 * - joke 必须在 help 前面，否则「帮我讲个笑话」会被「帮我」吃掉
 * - comfort 必须在 plan / weak 前面，否则「今天好累」「我记不住」会被当成查询
 */
function detectIntent(raw: string): Intent {
  const s = raw.toLowerCase().trim()

  if (has(s, ['考我', '测我', '出题', '测验', '来几道', 'quiz me', 'test me', 'quiz'])) return 'quiz'
  if (has(s, ['笑话', '逗我', '逗笑', '搞笑', '段子', '乐子', '整活', '笑一个', '再来一个', '换个笑话', 'joke', 'funny', 'another one', 'make me laugh', 'cheer me up'])) return 'joke'
  if (has(s, ['好累', '很累', '太累', '累了', '累死', '心累', '好困', '很困', '困了', '太困', '犯困', '疲惫', '撑不住', '焦虑', '来不及', '紧张', '慌', '压力', '烦', '难过', '沮丧', '不开心', 'emo', '崩', '郁闷', '委屈', '不想学', '没动力', '放弃', '坚持不下去', '学不下去', '没意思', '太难', '学不会', '记不住', '笨', '白学', 'tired', 'exhausted', 'sleepy', 'anxious', 'nervous', 'stressed', 'panic', 'sad', 'upset', 'frustrated', 'annoyed', 'give up', 'quit', "can't focus", 'hopeless'])) return 'comfort'
  if (has(s, ['薄弱', '难记', '最差', 'weak', 'struggling', 'hardest'])) return 'weak'
  if (has(s, ['多少词', '学了多少', '进度', '统计', '数据', 'progress', 'stats', 'how many'])) return 'stats'
  if (has(s, ['推荐', '有什么书', '哪些词书', '哪本', 'which deck', 'recommend', 'decks'])) return 'decks'
  if (has(s, ['每日目标', '每天学', '设成', '改成', 'goal', 'set daily'])) return 'goal'
  if (has(s, ['怎么记', '怎么背', '记忆', '词根', '联想', 'memorize', 'remember', 'mnemonic', 'root'])) return 'memorize'
  if (has(s, ['今天', '该学', '该复习', '计划', '安排', 'today', 'plan', 'review what', 'what should'])) return 'plan'
  if (has(s, ['什么意思', '是什么意思', '解释', '翻译', '查一下', 'mean', 'explain', 'definition', 'translate'])) return 'define'
  if (has(s, ['帮我', '能用', '会什么', '帮助', 'help', 'what can you'])) return 'help'
  return 'chat'
}

/** 从自然语言里抠出要查的词 */
function extractWord(raw: string): string | null {
  const cleaned = raw
    .replace(/[？?。！!,，：:]/g, ' ')
    .replace(/(什么意思|是什么意思|的解释|的意思|怎么记|怎么背|解释一下|解释|翻译|查一下|帮我查|请问|tell me|what does|what is|meaning of|explain|translate|mean|the word|word)/gi, ' ')
    .replace(/[「」“”"'`]/g, ' ')
    .trim()

  const tokens = cleaned.split(/\s+/).filter(Boolean)
  if (!tokens.length) return null

  // 英文优先：取最长的一个字母 token
  const latin = tokens.filter((t) => /^[a-zA-Z][a-zA-Z'’-]{1,}$/.test(t))
  if (latin.length) return latin.sort((a, b) => b.length - a.length)[0]

  // 中文：取最长的中文片段
  const cjk = tokens.filter((t) => /[\u4e00-\u9fa5]/.test(t))
  if (cjk.length) return cjk.sort((a, b) => b.length - a.length)[0]

  return null
}

/* ------------------------------------------------------------------ */
/* 各意图的回答                                                        */
/* ------------------------------------------------------------------ */

function deckNames(ids: string[], locale: 'zh' | 'en'): string {
  return ids.map((id) => getDeck(id)?.title[locale] ?? id).join(locale === 'zh' ? '、' : ', ')
}

function answerPlan(c: AssistantContext): AssistantReply {
  const { cards, settings } = c
  const active = settings.activeDecks
  const now = Date.now()
  const due = dueItems(cards, active, now)
  const queue = buildQueue(cards, active, settings.dailyGoal)
  const newCount = queue.filter((q) => q.kind === 'new').length
  const learnedToday = c.logs.filter((l) => l.at > now - 86_400_000).length

  const lines: string[] = []
  if (zh(c)) {
    lines.push(`当前在学：${deckNames(active, 'zh')}`)
    lines.push(`今日待复习 ${due.length} 个，计划新词 ${newCount} 个（目标 ${settings.dailyGoal} / 天）`)
    if (learnedToday) lines.push(`过去 24 小时你已经过了 ${learnedToday} 次卡`)
    if (due.length > 0) {
      lines.push('建议先清复习，再学新词——复习是间隔重复里收益最高的一段。')
    } else if (newCount > 0) {
      lines.push('复习清空了，直接开新词就行。')
    } else {
      lines.push('今天没有到期的卡，也没剩新词了。可以去「拼写工坊」或「Boss 战」巩固一下。')
    }
  } else {
    lines.push(`Studying: ${deckNames(active, 'en')}`)
    lines.push(`${due.length} cards due, ${newCount} new words planned (goal ${settings.dailyGoal}/day)`)
    if (learnedToday) lines.push(`${learnedToday} cards reviewed in the last 24h`)
    lines.push(due.length ? 'Clear reviews first — spaced repetition pays best there.' : 'Reviews are clear, go ahead with new words.')
  }

  return {
    text: lines.join('\n'),
    actions: [
      { label: zh(c) ? '开始复习' : 'Start reviewing', to: '/learn?mode=due' },
      { label: zh(c) ? '学新词' : 'Learn new', to: '/learn' },
    ],
  }
}

function answerWeak(c: AssistantContext): AssistantReply {
  const weak = weakWords(c.cards, 8)
    .map((cs) => WORD_MAP[cs.wordId])
    .filter((w): w is Word => Boolean(w))
  if (!weak.length) {
    return {
      text: zh(c)
        ? '还没有足够的练习数据。先学十几个词、做几轮游戏，我就能看出你的薄弱点了。'
        : 'Not enough data yet. Study a dozen words and play a round or two, then I can spot your weak spots.',
      actions: [{ label: zh(c) ? '开始学习' : 'Start learning', to: '/learn' }],
    }
  }
  const cards: AssistantCard[] = weak.map((w) => ({ word: w, deck: getDeck(w.deckId) }))

  const names = weak.map((w) => w.lemma).join(', ')
  return {
    text: zh(c)
      ? `这些词你最容易忘：${names}。它们的稳定性最低，下次复习也最先到期。`
      : `These are your shakiest words: ${names}. Lowest stability, due soonest.`,
    cards,
    actions: [{ label: zh(c) ? '去攻克它们' : 'Drill them', to: '/games/forge' }],
  }
}

function answerStats(c: AssistantContext): AssistantReply {
  const s = summarize(c.cards, c.logs)
  const active = c.settings.activeDecks
  const lines = zh(c)
    ? [
        `累计复习 ${c.logs.length} 次，正确率 ${Math.round(s.acc * 100)}%`,
        `已学 ${s.totalCards} 词，掌握 ${s.mastered} 词`,
        `当前连续 ${currentStreak()} 天`,
        `在学 ${active.length} 本词书`,
      ]
    : [
        `${c.logs.length} reviews, ${Math.round(s.acc * 100)}% accuracy`,
        `${s.totalCards} words learned, ${s.mastered} mastered`,
        `${currentStreak()}-day streak`,
        `${active.length} active decks`,
      ]
  return {
    text: lines.join('\n'),
    actions: [{ label: zh(c) ? '看完整数据' : 'Full profile', to: '/profile' }],
  }
}

function currentStreak(): number {
  return useGame.getState().profile.streak
}

function answerDecks(c: AssistantContext): AssistantReply {
  const active = c.settings.activeDecks
  const picks = DECKS.filter((d) => !active.includes(d.id))
    .sort((a, b) => (a.stage === 'cet4' ? -1 : b.stage === 'cet4' ? 1 : 0))
    .slice(0, 4)
    .map((d) => ({ deck: d }))

  const total = ALL_WORDS.length
  return {
    text: zh(c)
      ? `词库里现在有 ${DECKS.length} 本词书、${total.toLocaleString()} 个词条，覆盖自然拼读到 GRE、JLPT N5–N1。\n你还没开始的有：${picks.map((p) => p.deck.title.zh).join('、')}。`
      : `The library has ${DECKS.length} decks and ${total.toLocaleString()} entries, from phonics to GRE and JLPT N5–N1.\nNot started yet: ${picks.map((p) => p.deck.title.en).join(', ')}.`,
    actions: [{ label: zh(c) ? '打开词库' : 'Open library', to: '/library' }],
  }
}

function answerGoal(c: AssistantContext, raw: string): AssistantReply {
  const m = raw.match(/(\d{1,3})/)
  const n = m ? Math.min(100, Math.max(3, parseInt(m[1], 10))) : null
  if (!n) {
    return {
      text: zh(c)
        ? `你现在的每日新词目标是 ${c.settings.dailyGoal} 个。想改的话直接说「每天 20 个」。`
        : `Your daily goal is ${c.settings.dailyGoal} new words. Say "20 per day" to change it.`,
      actions: [{ label: zh(c) ? '去设置' : 'Settings', to: '/settings' }],
    }
  }
  return {
    text: zh(c) ? `好，每日新词目标改成 ${n} 个了。` : `Done — daily goal set to ${n} new words.`,
    actions: [{ label: zh(c) ? '回设置确认' : 'Check settings', to: '/settings' }],
    apply: { dailyGoal: n },
  }
}

function answerDefine(c: AssistantContext, raw: string): AssistantReply {
  const q = extractWord(raw)
  if (!q) {
    return {
      text: zh(c) ? '想查哪个词？直接把单词发给我就行。' : 'Which word? Just send it to me.',
    }
  }

  const hits = searchWords(q, { limit: 3 })
  if (!hits.length) {
    return {
      text: zh(c)
        ? `词库里没有找到「${q}」。可以试试：换成原形、只输前几个字母，或者拼写检查一下。`
        : `Couldn't find "${q}". Try the base form, or just the first few letters.`,
    }
  }

  const top = hits[0].word
  const lines: string[] = []
  const morph = explainMorphology(top.lemma, c.locale)

  if (zh(c)) {
    lines.push(`**${top.lemma}**${top.phonetic ? ` /${top.phonetic}/` : ''}${top.reading ? `（${top.reading}）` : ''}`)
    lines.push(top.zh)
    if (top.example) lines.push(`例句：${top.example}\n${top.exampleZh}`)
    if (morph.length) lines.push(morph.join('；'))
  } else {
    lines.push(`**${top.lemma}**${top.phonetic ? ` /${top.phonetic}/` : ''}`)
    lines.push(top.zh)
    if (top.example) lines.push(`e.g. ${top.example}`)
    if (morph.length) lines.push(morph.join('; '))
  }

  return {
    text: lines.join('\n'),
    cards: hits.map((h) => ({ word: h.word, deck: h.deck })),
    actions: [{ label: zh(c) ? '在词库里看' : 'Open in library', to: '/library' }],
  }
}

function answerMemorize(c: AssistantContext, raw: string): AssistantReply {
  const w = extractWord(raw)
  if (!w) {
    return {
      text: zh(c)
        ? '告诉我要记哪个词，我给你拆一下词根，再编个能连起来的画面。'
        : 'Tell me the word and I will break down its roots and give you a hook.',
    }
  }
  const hit = searchWords(w, { limit: 1 })[0]
  const lemma = hit?.word.lemma ?? w
  const zhText = hit?.word.zh ?? ''
  const morph = explainMorphology(lemma, c.locale)

  const lines: string[] = []
  if (zh(c)) {
    lines.push(`记 **${lemma}**：`)
    if (morph.length) lines.push(`结构上：${morph.join('；')}`)
    lines.push(`发音上：先跟着读 3 遍${hit?.word.phonetic ? `（/${hit.word.phonetic}/）` : ''}，读顺了再记拼写——拼写跟着声音走比死背字母快。`)
    lines.push(`用法上：把它塞进一个和你有关的句子里，比如${hit?.word.example ? `「${hit.word.example}」` : '「我今天真的用到了它」'}，有画面的句子比中文释义牢。`)
    if (zhText) lines.push(`意思：${zhText}`)
  } else {
    lines.push(`Remembering **${lemma}**:`)
    if (morph.length) lines.push(`Structure: ${morph.join('; ')}`)
    lines.push('Say it out loud three times, then let the spelling follow the sound.')
    lines.push('Put it in a sentence about your own life — concrete beats abstract.')
  }

  return {
    text: lines.join('\n'),
    cards: hit ? [{ word: hit.word, deck: hit.deck }] : undefined,
  }
}

function answerQuiz(c: AssistantContext): AssistantReply {
  const pool = ALL_WORDS.filter((w) => c.settings.activeDecks.includes(w.deckId) && w.zh)
  if (pool.length < 6) {
    return {
      text: zh(c) ? '词池太小了，先选一本词书再让我出题。' : 'Pool too small — pick a deck first.',
      actions: [{ label: zh(c) ? '选词书' : 'Pick a deck', to: '/library' }],
    }
  }

  const seed = pool[Math.floor(Math.random() * pool.length)]
  const distractors: string[] = []
  let guard = 0
  while (distractors.length < 3 && guard++ < 200) {
    const cand = pool[Math.floor(Math.random() * pool.length)]
    if (cand.zh === seed.zh || distractors.includes(cand.zh)) continue
    distractors.push(cand.zh)
  }
  const options = [seed.zh, ...distractors].sort(() => Math.random() - 0.5)
  const quiz: AssistantQuiz = {
    word: seed,
    prompt: seed.lemma,
    options,
    answer: options.indexOf(seed.zh),
  }

  return {
    text: zh(c) ? `来一道：**${seed.lemma}** 是什么意思？\n回复选项序号就行。` : `Quick one: what does **${seed.lemma}** mean?\nReply with the option number.`,
    quiz,
  }
}

function answerHelp(c: AssistantContext): AssistantReply {
  return {
    text: zh(c)
      ? '我能做这些事：\n• 查单词：直接发单词，或问「XX 是什么意思」\n• 定计划：问「今天该学什么」\n• 找薄弱点：问「我哪些词最薄弱」\n• 出题：说「考我 5 个词」\n• 拆词：问「怎么记住 schedule」\n• 调目标：说「每天 20 个」\n\n不想学的时候也可以找我 —— 「讲个笑话」「学不动了」「陪我聊两句」都行。'
      : 'I can:\n• Look up words — just send one\n• Plan your day — "what should I study today"\n• Find weak spots — "which words are weakest"\n• Quiz you — "quiz me"\n• Break down a word — "how do I remember schedule"\n• Change goals — "20 a day"\n\nAnd when you don\'t feel like studying: "tell me a joke", "I\'m exhausted", "just chat".',
    actions: [{ label: zh(c) ? '打开词库' : 'Open library', to: '/library' }],
  }
}

/* ------------------------------------------------------------------ */
/* 闲聊层：笑话 / 情绪 / 陪聊                                            */
/* ------------------------------------------------------------------ */

async function answerJoke(c: AssistantContext): Promise<AssistantReply> {
  const { nextJoke } = await chatKit()
  const j = nextJoke(c.locale)
  const lines: string[] = []

  if (zh(c)) {
    if (j.en) {
      const raw = j.en.split('\n')
      raw.forEach((l, i) => lines.push(i === 0 ? `**${l}**` : l))
      lines.push('')
      lines.push(j.zh)
    } else {
      j.zh.split('\n').forEach((l, i) => lines.push(i === 0 ? `**${l}**` : l))
    }
    if (j.why.zh) {
      lines.push('')
      lines.push(`笑点：${j.why.zh}`)
    }
    if (j.word) {
      lines.push(`顺手记：**${j.word.lemma}** ${j.word.zh}`)
    }
    return {
      text: lines.join('\n'),
      actions: [
        { label: '再来一个', to: '__joke__' },
        { label: '陪我聊两句', to: '__chat__' },
        { label: '考我一道', to: '__quiz__' },
      ],
    }
  }

  const body = j.en ?? j.zh
  body.split('\n').forEach((l, i) => lines.push(i === 0 ? `**${l}**` : l))
  if (j.why.en) {
    lines.push('')
    lines.push(`The joke: ${j.why.en}`)
  }
  return {
    text: lines.join('\n'),
    actions: [
      { label: 'One more', to: '__joke__' },
      { label: 'Just chat', to: '__chat__' },
      { label: 'Quiz me', to: '__quiz__' },
    ],
  }
}

async function answerComfort(c: AssistantContext, raw: string): Promise<AssistantReply> {
  const { comfortReply } = await chatKit()
  const r = comfortReply(raw, c.locale)
  return { text: r.text, actions: r.actions }
}

/** 兜底闲聊：问候、感谢、自我介绍、无聊、道别。命中就返回，没命中返回 null 交给上层 */
async function answerChat(c: AssistantContext, raw: string): Promise<AssistantReply | null> {
  const s = raw.toLowerCase().trim()
  const due = dueItems(c.cards, c.settings.activeDecks).length
  const streak = currentStreak()

  if (/^(哈+|呵+|嘿+|haha+|lol|233+)/.test(s)) {
    return {
      text: zh(c) ? '笑出来就好。要不要再来一个？' : 'Glad that landed. Another one?',
      actions: [{ label: zh(c) ? '再来一个' : 'One more', to: '__joke__' }],
    }
  }

  if (has(s, ['你好', '您好', '在吗', '嗨', '早上好', '晚上好', 'hi', 'hello', 'hey'])) {
    const tail = zh(c)
      ? due > 0
        ? `今天还有 ${due} 个词到期，要不要先清一批？`
        : '今天到期的是 0 个 —— 要么学点新词，要么就纯聊天。'
      : due > 0
        ? `${due} cards are due today. Clear a batch?`
        : 'Nothing due today — new words, or just chat.'
    return {
      text: zh(c)
        ? `在。${streak > 0 ? `你已经连着来 ${streak} 天了。` : '欢迎回来。'}\n${tail}`
        : `Here.${streak > 0 ? ` ${streak}-day streak, nice.` : ''}\n${tail}`,
      actions: [
        { label: zh(c) ? '开始学习' : 'Start learning', to: '/learn' },
        { label: zh(c) ? '讲个笑话' : 'Tell me a joke', to: '__joke__' },
      ],
    }
  }

  if (has(s, ['谢谢', '感谢', '谢了', 'thanks', 'thank you', 'thx', 'appreciate'])) {
    const { cheer } = await chatKit()
    return {
      text: zh(c) ? `不客气。${cheer('zh')}` : `Anytime. ${cheer('en')}`,
      actions: [{ label: zh(c) ? '继续学' : 'Keep going', to: '/learn' }],
    }
  }

  if (has(s, ['你是谁', '你叫什么', '你是什么', '你能干什么', '你会什么', '你从哪', 'who are you', 'what are you', 'are you real', 'are you human'])) {
    return {
      text: zh(c)
        ? '我是词跃助手，跑在你浏览器里的一个本地引擎 —— 不联网、不上传你的数据，所以也没有什么「背后的人」。\n\n我会算你的复习计划、找薄弱词、查词典、出题，也会讲冷笑话和听你吐槽。唯一的短板是没法真的跟你聊时事，那个得接大模型。'
        : "I'm the built-in WordQuest assistant — a local engine running in your browser. No server, no upload, no hidden human.\n\nI handle your review schedule, weak words, definitions and quizzes. I also tell bad jokes. For open-ended conversation you'd need to plug in an LLM.",
      actions: [{ label: zh(c) ? '你能做什么' : 'What can you do', to: '__help__' }],
    }
  }

  if (has(s, ['无聊', '聊聊', '聊天', '唠', '陪我', '说点什么', '讲点什么', '随便说', 'bored', 'chat', 'talk to me', 'say something', 'keep me company', 'tell me something', 'chitchat'])) {
    const { triviaBit } = await chatKit()
    const t = triviaBit()
    return {
      text: zh(c)
        ? `那聊点没用的。\n\n${t.zh}\n\n想再听一个，还是给你出两道题提提神？`
        : `Fine, something useless.\n\n${t.en}\n\nAnother one, or a couple of quiz questions to wake you up?`,
      actions: [
        { label: zh(c) ? '再来一条' : 'One more', to: '__chat__' },
        { label: zh(c) ? '讲个笑话' : 'Tell me a joke', to: '__joke__' },
      ],
    }
  }

  if (has(s, ['晚安', '再见', '拜拜', '先走了', 'bye', 'good night', 'goodnight', 'see you'])) {
    return {
      text: zh(c)
        ? `晚安。睡前别背新词了，翻两眼今天的错词就行 —— 睡眠本身就在帮你巩固。`
        : 'Good night. Skip new words before bed — a quick pass over today\'s misses is enough. Sleep does the consolidating.',
    }
  }

  if (has(s, ['厉害', '好棒', '你真', '喜欢你', '不错嘛', 'awesome', 'you are great', 'love you', 'good bot'])) {
    return {
      text: zh(c)
        ? '过奖了，我只是个会数数的脚本。真厉害的是你 —— 今天还愿意打开这个页面。'
        : "I'm a script that counts things. You're the one who showed up today.",
      actions: [{ label: zh(c) ? '讲个笑话' : 'Tell me a joke', to: '__joke__' }],
    }
  }

  // 没命中任何闲聊分支 —— 交给上层判断是不是查词
  return null
}

/** 真的什么都没接住：别冷场，给三条具体的路 */
function chatFallback(c: AssistantContext): AssistantReply {
  return {
    text: zh(c)
      ? '这句我接不太好 —— 我是个本地引擎，聊天面比较窄。\n\n不过这几件事我挺在行：\n• 想放松：说「讲个笑话」\n• 想聊天：说「陪我聊两句」，我给你抛个语言学的冷知识\n• 想干活：说「今天该学什么」，我按你的进度排'
      : "That one's past me — I'm a local engine with a narrow range.\n\nBut these I do well:\n• Relax: \"tell me a joke\"\n• Chat: \"keep me company\" — I'll throw in a linguistics fact\n• Work: \"what should I study today\"",
    actions: [
      { label: zh(c) ? '讲个笑话' : 'Tell me a joke', to: '__joke__' },
      { label: zh(c) ? '陪我聊两句' : 'Just chat', to: '__chat__' },
      { label: zh(c) ? '今天学什么' : 'What to study', to: '/learn' },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

export async function answerLocally(raw: string, ctx: AssistantContext): Promise<AssistantReply> {
  const text = raw.trim()
  if (!text) return { text: '' }

  // 先看是不是在回答上一道题
  if (ctx.pendingQuiz) {
    const idx = /^[1-4]$/.test(text) ? parseInt(text, 10) - 1 : ['a', 'b', 'c', 'd'].indexOf(text.toLowerCase())
    if (idx >= 0 && idx < 4) {
      const ok = idx === ctx.pendingQuiz.answer
      const w = ctx.pendingQuiz.word
      return {
        text: ok
          ? zh(ctx)
            ? `对了。${w.lemma} 就是「${w.zh}」。`
            : `Correct. ${w.lemma} means "${w.zh}".`
          : zh(ctx)
            ? `不对，正确答案是 ${ctx.pendingQuiz.answer + 1}。${w.lemma} = ${w.zh}。`
            : `Not quite — the answer is ${ctx.pendingQuiz.answer + 1}. ${w.lemma} = ${w.zh}.`,
        cards: [{ word: w, deck: getDeck(w.deckId) }],
        actions: [{ label: zh(ctx) ? '再来一道' : 'Another one', to: '__quiz__' }],
      }
    }
  }

  const intent = detectIntent(text)
  switch (intent) {
    case 'quiz': return answerQuiz(ctx)
    case 'weak': return answerWeak(ctx)
    case 'stats': return answerStats(ctx)
    case 'decks': return answerDecks(ctx)
    case 'goal': return answerGoal(ctx, text)
    case 'memorize': return answerMemorize(ctx, text)
    case 'plan': return answerPlan(ctx)
    case 'help': return answerHelp(ctx)
    case 'define': return answerDefine(ctx, text)
    case 'joke': return answerJoke(ctx)
    case 'comfort': return answerComfort(ctx, text)
    default: break
  }

  // 到这里就是闲聊。先让闲聊分支接，接不住才当查词
  const chat = await answerChat(ctx, text)
  if (chat) return chat

  // 英文短词一律当查词（用户就是这么用的）
  const bare = text.replace(/[？?。！!]+$/, '').trim()
  if (/^[a-zA-Z][a-zA-Z'’-]{1,24}$/.test(bare)) return answerDefine(ctx, bare)

  // 中文短语只有词库里真有才当查词，否则「你好」「谢谢」这类会被吞成「没找到」
  if (/^[\u4e00-\u9fa5]{2,8}$/.test(bare) && searchWords(bare, { limit: 1 }).length) {
    return answerDefine(ctx, bare)
  }

  return chatFallback(ctx)
}

/** 把词条渲染成助手里的小卡片数据 */
export function cardOf(wordId: string): AssistantCard | null {
  const w = WORD_MAP[wordId]
  if (!w) return null
  return { word: w, deck: getDeck(w.deckId) }
}

/** 给 LLM 用的系统提示：注入学习状态，让它答得更贴合 */
export function buildSystemPrompt(ctx: AssistantContext): string {
  const due = dueItems(ctx.cards, ctx.settings.activeDecks).length
  const s = summarize(ctx.cards, ctx.logs)
  return [
    'You are the built-in study assistant of WordQuest, a vocabulary app.',
    'Answer briefly (under 120 words), be concrete, and prefer short examples.',
    `The learner studies: ${deckNames(ctx.settings.activeDecks, 'en')}.`,
    `State: ${due} cards due, ${s.totalCards} words learned, ${ctx.logs.length} reviews, ${Math.round(s.acc * 100)}% accuracy, daily goal ${ctx.settings.dailyGoal}.`,
    'If the user asks about a specific word, always give: meaning, one example sentence, and one memory hook.',
    'You are also company, not just a tool: you can tell a short joke (English puns with the wordplay explained are ideal), make small talk, or reassure a discouraged learner. When they are tired or fed up, do not cheerlead — acknowledge it and suggest the smallest possible next step.',
    'Reply in the language the user writes in.',
  ].join(' ')
}

/** 复习间隔描述，助手里用来回答「这个词我什么时候再见到」 */
export function nextReviewText(wordId: string, cards: Record<string, CardState>): string | null {
  const card = cards[wordId]
  if (!card) return null
  return intervalLabel(card, 4, 'zh')
}
