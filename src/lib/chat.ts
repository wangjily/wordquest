/**
 * 助手的「人味」素材库。
 *
 * 全部本地，不联网。三件事：
 *   1. 讲笑话 —— 优先选英文双关，笑点本身就是一次词汇课；也有纯中文的。
 *   2. 接情绪 —— 学不动、烦、焦虑的时候，先共情再给一个三分钟能做完的动作。
 *   3. 闲聊   —— 问候、自我介绍、无聊时抛一个语言学冷知识。
 *
 * 内容取向：不尬吹、不打鸡血。用户已经很累了，别再说「加油你可以的」。
 */

/* ------------------------------------------------------------------ */
/* 抽取：洗牌袋 + 记忆，避免连着重复                                     */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const bags = new Map<string, number[]>()
const lastIdx = new Map<string, number>()

/** 抽完一轮再重洗，保证一个周期内不重复 */
function draw(bucket: string, len: number): number {
  if (len <= 1) return 0
  let bag = bags.get(bucket)
  if (!bag || !bag.length) {
    bag = shuffle(Array.from({ length: len }, (_, i) => i))
    // 和上一轮的结尾错开，避免跨轮粘在同一项
    const last = lastIdx.get(bucket)
    if (last !== undefined && bag[bag.length - 1] === last) {
      bag.unshift(bag.pop() as number)
    }
    bags.set(bucket, bag)
  }
  const i = bag.pop() as number
  lastIdx.set(bucket, i)
  return i
}

/* ------------------------------------------------------------------ */
/* 笑话                                                                */
/* ------------------------------------------------------------------ */

export interface Joke {
  /** 英文原文（纯中文笑话没有） */
  en?: string
  /** 中文版 / 中文笑话正文 */
  zh: string
  /** 笑点在哪 */
  why: { zh: string; en: string }
  /** 顺手记一个词 */
  word?: { lemma: string; zh: string }
}

export const JOKES: Joke[] = [
  {
    en: 'Why don\'t scientists trust atoms?\nBecause they make up everything.',
    zh: '为什么科学家不信任原子？因为它们「编」出了一切。',
    why: {
      zh: 'make up 既可以是「组成」，也可以是「编造、瞎编」。原子构成万物 —— 同时又被说成在撒谎。',
      en: '"make up" means both "to compose" and "to invent a lie". Atoms compose everything — and allegedly lie about it.',
    },
    word: { lemma: 'make up', zh: '组成；编造；和好；化妆' },
  },
  {
    en: 'I used to be a banker, but I lost interest.',
    zh: '我以前是银行职员，后来我失去了兴趣。',
    why: {
      zh: 'interest 是「兴趣」，也是「利息」。lost interest 听起来像「对工作没热情了」，其实是「把利息赔光了」。',
      en: '"interest" = curiosity AND the money a bank pays you. He lost the money kind.',
    },
    word: { lemma: 'interest', zh: '兴趣；利息；利益' },
  },
  {
    en: 'Why did the scarecrow win an award?\nBecause he was outstanding in his field.',
    zh: '稻草人为什么得奖？因为他在自己的领域里非常出众。',
    why: {
      zh: 'outstanding = 杰出的，字面又是「站出去的」；field = 领域，也是「田地」。一个稻草人站在田里，两句话同时成立。',
      en: '"outstanding" = excellent, literally "standing out". "field" = area of expertise, also a literal field.',
    },
    word: { lemma: 'outstanding', zh: '杰出的；未支付的；突出的' },
  },
  {
    en: "I'm reading a book about anti-gravity.\nIt's impossible to put down.",
    zh: '我在读一本讲反重力的书。根本放不下。',
    why: {
      zh: 'put down 有两个意思：「把书放下」和「觉得书太好看舍不得放下」。反重力的书当然掉不下来 —— 所以是真的放不下。',
      en: '"put down" = to place something down, or to stop reading because you love it too much.',
    },
    word: { lemma: 'put down', zh: '放下；记下；贬低' },
  },
  {
    en: 'Why was the math book sad?\nBecause it had too many problems.',
    zh: '数学书为什么难过？因为它的题目太多了。',
    why: {
      zh: 'problem 是「数学题」，也是「麻烦、难题」。一本数学书当然 problem 多到爆。',
      en: '"problem" = a math exercise AND a personal difficulty.',
    },
    word: { lemma: 'problem', zh: '问题；习题；难题' },
  },
  {
    en: "A bicycle can't stand on its own because it's two-tired.",
    zh: '自行车没法自己站住，因为它「两个轮胎」了。',
    why: {
      zh: 'two-tired 念出来和 too tired（太累了）一模一样。这是个纯语音梗 —— 英语里这类双关多得离谱。',
      en: '"two-tired" sounds exactly like "too tired". Pure sound play.',
    },
    word: { lemma: 'tired', zh: '疲倦的；厌倦的' },
  },
  {
    en: 'Why do programmers prefer dark mode?\nBecause light attracts bugs.',
    zh: '程序员为什么喜欢深色模式？因为光会招虫子。',
    why: {
      zh: 'bug 是「虫子」，也是「程序错误」。开灯招虫 —— 写代码招 bug。',
      en: '"bug" = an insect AND a software defect.',
    },
    word: { lemma: 'bug', zh: '虫子；程序错误；窃听器' },
  },
  {
    en: "Never trust stairs.\nThey're always up to something.",
    zh: '别信楼梯。它们总在搞事情。',
    why: {
      zh: 'be up to something = 偷偷搞事情；字面上，楼梯确实一直「通往上面」。',
      en: '"be up to something" = to be doing something suspicious. A staircase literally goes up.',
    },
    word: { lemma: 'be up to', zh: '从事；取决于；由…决定' },
  },
  {
    en: 'I wondered why the ball kept getting bigger.\nThen it hit me.',
    zh: '我在想这球怎么越来越大。然后它砸到我了。',
    why: {
      zh: 'it hit me = 我突然想明白了；字面就是「它打中了我」。所以这个「想明白」的代价是一个包。',
      en: '"it hit me" = I suddenly realised. Also: a literal ball hitting your head.',
    },
    word: { lemma: 'hit', zh: '撞击；突然想到；打击' },
  },
  {
    en: "I'm on a seafood diet.\nI see food and I eat it.",
    zh: '我在执行海鲜饮食法：看见食物就吃。',
    why: {
      zh: 'seafood（海鲜）和 see food（看见食物）只差一个空格。',
      en: '"seafood" and "see food" differ by one space.',
    },
  },
  {
    en: "Why did the student eat his homework?\nThe teacher said it was a piece of cake.",
    zh: '学生为什么把作业吃了？老师说这份作业是小菜一碟。',
    why: {
      zh: 'a piece of cake = 小菜一碟、太简单了；字面是「一块蛋糕」。',
      en: '"a piece of cake" = very easy. Literally, a slice of cake.',
    },
    word: { lemma: 'a piece of cake', zh: '小菜一碟；轻而易举' },
  },
  {
    en: 'My doctor told me to get more exercise,\nso I started running out of money.',
    zh: '医生让我多运动，于是我开始了 —— 花光钱。',
    why: {
      zh: 'run out of = 用完、耗尽。run 是「跑」，可 run out of money 跟跑步一点关系没有。',
      en: '"run out of" = to exhaust a supply. No running involved.',
    },
    word: { lemma: 'run out of', zh: '用完；耗尽' },
  },
  {
    en: "What's the best thing about Switzerland?\nI don't know, but the flag is a big plus.",
    zh: '瑞士最好的地方是什么？不知道，但国旗上有个大大的加号。',
    why: {
      zh: 'plus 是「优点」，也是数学里的「加号」。瑞士国旗正是一个白色大十字 —— 也就是加号。',
      en: '"plus" = an advantage, and the + symbol. The Swiss flag is literally a big white cross.',
    },
    word: { lemma: 'plus', zh: '加号；优点；而且' },
  },
  {
    en: "Why don't eggs tell jokes?\nThey'd crack each other up.",
    zh: '鸡蛋为什么不讲笑话？它们会把彼此笑裂。',
    why: {
      zh: 'crack up = 笑到不行；crack 本身是「裂开」。鸡蛋一笑就裂 —— 真·笑裂。',
      en: '"crack up" = to laugh hard. Eggs literally crack.',
    },
    word: { lemma: 'crack up', zh: '笑破肚皮；精神崩溃' },
  },
  {
    en: "I only know 25 letters of the alphabet.\nI don't know y.",
    zh: '字母表我只认识 25 个。我不知道 y。',
    why: {
      zh: 'y 的读音就是 why（为什么）。「不知道 y」= 「不知道为什么」。',
      en: '"y" is pronounced "why". So he doesn\'t know why.',
    },
  },
  {
    en: 'Why did the coffee file a police report?\nIt got mugged.',
    zh: '咖啡为什么报警？因为它被抢了。',
    why: {
      zh: 'mug 是「马克杯」，mugged 是「被抢劫」。一杯咖啡被抢 —— 顺便连杯子都没了。',
      en: '"mug" = a cup; "to mug someone" = to rob them.',
    },
    word: { lemma: 'mug', zh: '马克杯；行凶抢劫' },
  },
  {
    en: 'A book fell on my head.\nI only have my shelf to blame.',
    zh: '一本书砸我头上了。我只能怪我的书架。',
    why: {
      zh: 'shelf（书架）和 self（自己）只差一个字母。原本该说「只能怪我自己」。',
      en: '"shelf" vs "self" — one letter apart. The phrase should be "only myself to blame".',
    },
  },
  {
    en: "It's hard to explain puns to kleptomaniacs.\nThey always take things literally.",
    zh: '跟有偷窃癖的人解释双关很难。他们总把话当真。',
    why: {
      zh: 'take things literally = 按字面理解；对一个偷东西的人来说，他是真的把东西「拿走」了。',
      en: '"take things literally" = interpret word for word. A kleptomaniac takes things, literally.',
    },
    word: { lemma: 'literally', zh: '字面上地；确实地' },
  },
  {
    en: 'Time flies like an arrow.\nFruit flies like a banana.',
    zh: '时光如箭般飞逝。果蝇喜欢香蕉。',
    why: {
      zh: '这是语言学里最有名的一句歧义句：flies 可以是动词「飞」，也可以是名词「苍蝇」；like 可以是「像」，也可以是「喜欢」。',
      en: 'The classic ambiguity: "flies" = verb or noun, "like" = preposition or verb. Both readings are grammatical.',
    },
  },
  {
    en: 'The past, present and future walked into a bar.\nIt was tense.',
    zh: '过去、现在和未来走进一家酒吧。气氛很紧张。',
    why: {
      zh: 'tense 是「紧张的」，也是语法里的「时态」。三个时态凑一块儿，能不 tense 吗。',
      en: '"tense" = nervous, and also a verb tense. Three tenses in one bar.',
    },
    word: { lemma: 'tense', zh: '紧张的；时态' },
  },

  /* 纯中文的，节奏不一样，换换口味 */
  {
    zh: '我决定从今天开始认真背单词。\n朋友说：你昨天也这么说的。\n我说：所以你看到了，我这人特别有恒心 —— 决定的事每天都在重新决定。',
    why: { zh: '', en: '' },
  },
  {
    zh: '背单词最痛苦的不是记不住。\n是好不容易记住了，翻开词典发现它还有第五个意思。',
    why: { zh: '', en: '' },
  },
  {
    zh: '我把单词书放在枕头底下，希望知识能渗透进去。\n第二天醒来，枕头湿了，书一点没变。',
    why: { zh: '', en: '' },
  },
  {
    zh: '我问一个过了专八的朋友：背单词最快的方法是什么？\n他说：多复习。\n我又问：怎么才能多复习？\n他说：少睡觉。\n我现在怀疑他当年是运气好。',
    why: { zh: '', en: '' },
  },
  {
    zh: '有人背了三年单词，第四年终于放弃了。\n因为他发现，他一直在背第一页。',
    why: { zh: '', en: '' },
  },
]

/** 只保留有英文原文的那些，给英文界面用 */
const EN_ONLY = JOKES.map((j, i) => (j.en ? i : -1)).filter((i) => i >= 0)

export function nextJoke(locale: 'zh' | 'en' = 'zh'): Joke {
  if (locale === 'en') return JOKES[EN_ONLY[draw('joke-en', EN_ONLY.length)]]
  return JOKES[draw('joke', JOKES.length)]
}

/* ------------------------------------------------------------------ */
/* 情绪                                                                */
/* ------------------------------------------------------------------ */

interface MoodBucket {
  keys: string[]
  zh: string[]
  en: string[]
}

const MOODS: MoodBucket[] = [
  {
    keys: ['累', '困', '疲惫', '撑不住', '熬夜', 'tired', 'exhausted', 'sleepy', 'burnt out', 'burned out'],
    zh: [
      '累就先别硬撑。今天只做 5 个词，做完就关掉 —— 5 个词 3 分钟，比 0 个词强太多，而且不会让明天的你更讨厌这件事。',
      '困的时候记忆力是真的会掉，这不是你懒。去睡，明早起来复习 10 个旧词，效果比现在硬背 30 个新词好。',
      '说个实话：连续 40 天每天 10 个词，效果好过猛学 4 天每天 100 个然后放弃。你现在想休息，是在保护这个连续性。',
    ],
    en: [
      'Being tired is not a character flaw — memory genuinely degrades when you are. Do five words and close the app.',
      'Sleep beats cramming. Ten old words tomorrow morning will stick better than thirty new ones right now.',
      'Forty days of ten beats four days of a hundred. Resting protects that streak.',
    ],
  },
  {
    keys: ['焦虑', '来不及', '紧张', '赶不上', '慌', '压力', 'anxious', 'nervous', 'stressed', 'deadline', 'panic'],
    zh: [
      '焦虑通常不是因为学得少，是因为不知道还剩多少。去看一眼今天的到期数量 —— 数字摆出来，往往比你想的少。',
      '别算「还有多少没背」，那个数永远吓人。只算「今天要过几个」，这个数是可控的。',
      '考试前最没用的动作是反复刷新计划表，最有用的是把错题过一遍。要不要我先把最薄弱的词拉出来？',
    ],
    en: [
      'Anxiety usually comes from not knowing the size of the pile. Check today\'s due count — it is smaller than the feeling.',
      'Stop counting what is left. Count what is due today. Only one of those numbers is actionable.',
      'Before an exam, reviewing errors beats rewriting the plan. Want me to pull your weakest words?',
    ],
  },
  {
    keys: ['不想学', '没动力', '放弃', '坚持不下去', '学不下去', '没意思', 'give up', 'no motivation', "can't focus", 'quit'],
    zh: [
      '不想学很正常，不用为此内疚。最低成本方案：只打开 App，做一道题，然后允许自己关掉。多数时候你会顺手多做几道。',
      '动力不是等来的，是做起来之后才出现的。先做 3 分钟，3 分钟后还是不想做，那就真的去休息，不欠这一会儿。',
      '换个花样吧。背得烦了就去打一局 Boss 战或者拼写工坊 —— 同样是过词，换个壳子脑子就没那么抗拒。',
    ],
    en: [
      'Open the app, answer one question, then you are allowed to quit. Usually you won\'t.',
      'Motivation shows up after you start, not before. Give it three minutes — if you still hate it, rest without guilt.',
      'Change the wrapper. A round of Boss Fight covers the same words but your brain resists it less.',
    ],
  },
  {
    keys: ['烦', '难过', '沮丧', '不开心', 'emo', '崩', '郁闷', '委屈', 'sad', 'upset', 'frustrated', 'annoyed'],
    zh: [
      '行，那先不聊单词。想说说是什么事吗？我这儿没别的本事，听你说完还是可以的。',
      '烦的时候学不进去是正常的，脑子在忙着处理别的事。要不我讲个冷笑话？笑不出来也没关系，至少能换口气。',
      '这种时候别给自己加任务了。今天就算什么都没学，也不影响你之前学过的任何一个词 —— 它们都还在。',
    ],
    en: [
      'Then let\'s not talk about words. Want to tell me what happened? Listening is about all I can do, but I can do it.',
      'Not being able to focus when you\'re upset is normal — your head is busy elsewhere. Want a bad joke?',
      'Don\'t add tasks today. Skipping one day doesn\'t erase a single word you already learned.',
    ],
  },
  {
    keys: ['太难', '学不会', '记不住', '笨', '没用', '白学', '记了又忘', 'too hard', 'stupid', "can't remember", 'hopeless'],
    zh: [
      '记不住不是你笨，是你还没到第四次。间隔重复本来就是靠「忘一点、再想起来」起作用的 —— 忘掉是流程的一部分，不是失败。',
      '觉得难，往往是因为一次见太多。把今天的量砍一半，明天你会发现那半份变简单了。',
      '「记了又忘」这件事所有人都在经历，只是别人不发出来。你的正确率我这边有记录，可以直接看数据说话。',
    ],
    en: [
      'Forgetting is not failure — it is the mechanism. Spaced repetition depends on forgetting a little, then retrieving.',
      'If it feels too hard, you are probably meeting too many at once. Halve today\'s load and it will feel lighter tomorrow.',
      'Everyone forgets. The ones who look effortless just kept the reviews small and frequent.',
    ],
  },
]

export interface ComfortReply {
  text: string
  /** 建议的动作 */
  actions: { label: string; to: string }[]
}

export function comfortReply(raw: string, locale: 'zh' | 'en'): ComfortReply {
  const s = raw.toLowerCase()
  const hit = MOODS.find((m) => m.keys.some((k) => s.includes(k.toLowerCase())))
  const bucket = hit ?? MOODS[MOODS.length - 1]
  const pool = locale === 'en' ? bucket.en : bucket.zh
  const line = pool[draw(`mood:${bucket.keys[0]}`, pool.length)]

  return {
    text: line,
    actions:
      locale === 'en'
        ? [
            { label: 'Just 5 words', to: '/learn' },
            { label: 'Tell me a joke', to: '__joke__' },
          ]
        : [
            { label: '只学 5 个', to: '/learn' },
            { label: '讲个笑话', to: '__joke__' },
          ],
  }
}

/* ------------------------------------------------------------------ */
/* 冷知识（无聊时的话题）                                                */
/* ------------------------------------------------------------------ */

export interface Trivia {
  zh: string
  en: string
}

const TRIVIA: Trivia[] = [
  {
    zh: '英语里 "set" 有 430 多个义项，是牛津词典里条目最长的一个词。你现在背的每一个「一词多义」都不算冤枉。',
    en: '"set" has over 430 distinct senses — the longest entry in the Oxford English Dictionary.',
  },
  {
    zh: '"queue" 这个词，五个字母里有四个不发音，念起来只有一个 /kjuː/。英语的拼写和发音基本是两个独立系统。',
    en: '"queue" is pronounced /kjuː/ — four of its five letters are silent.',
  },
  {
    zh: '"dreamt" 是英语里唯一一个以 "mt" 结尾的词。所有以 "mt" 结尾的英语单词，只有它。',
    en: '"dreamt" is the only English word ending in "mt".',
  },
  {
    zh: 'buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo 是一句语法完全正确的英语句子，意思是「被布法罗的水牛吓唬的布法罗水牛，反过来吓唬别的布法罗水牛」。',
    en: '"Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo" is a grammatically valid sentence.',
  },
  {
    zh: '"nice" 在 14 世纪的意思是「愚蠢的、无知的」，几百年里一路升格成「友善的」。词义会往上走，也会往下掉，这叫语义升降。',
    en: '"nice" meant "foolish" in the 14th century and climbed to "pleasant" — semantic elevation.',
  },
  {
    zh: '日语的「勉強」是「学习」的意思，不是中文的「勉强」。中日同形异义词有一大批：大丈夫（没问题）、手纸（信件）、汽车（火车）。',
    en: 'Japanese 勉強 means "study", not "reluctant" — a classic false friend between Chinese and Japanese.',
  },
  {
    zh: '英语里最长的单词之一 "floccinaucinihilipilification" 意思其实很朴素：把某件事判定为「毫无价值」。长达 29 个字母。',
    en: '"floccinaucinihilipilification" (29 letters) simply means "estimating something as worthless".',
  },
  {
    zh: '「Grammar」和「glamour」是同一个词分出来的两枝。中世纪的「语法」约等于「高深的学问」，后来又引申成「魅力、魔力」。',
    en: '"grammar" and "glamour" come from the same root — learning was once considered a kind of magic.',
  },
  {
    zh: '汉语的「词」在英语里可能对应 word、term、vocabulary 三个词：word 是字面单词，term 是专业术语，vocabulary 是词汇总量。你背的其实是 words，攒出来的是 vocabulary。',
    en: 'Chinese 词 splits into "word" (a unit), "term" (technical), and "vocabulary" (the whole collection).',
  },
  {
    zh: '英语里表示「一群」的量词（collective nouns）非常野：a murder of crows（一群乌鸦）、a parliament of owls（一群猫头鹰）、a flamboyance of flamingos（一群火烈鸟）。',
    en: 'Collective nouns get weird: a murder of crows, a parliament of owls, a flamboyance of flamingos.',
  },
]

export function triviaBit(): Trivia {
  return TRIVIA[draw('trivia', TRIVIA.length)]
}

/* ------------------------------------------------------------------ */
/* 短句                                                                */
/* ------------------------------------------------------------------ */

const CHEERS_ZH = [
  '今天也不用做到最好，做到「没断」就够了。',
  '你已经过了这么多张卡了，这事儿不是从零开始。',
  '别跟别人比进度，跟你上个月的自己比。',
  '学语言是复利，前三个月最像白干，之后才开始还你。',
  '不用一次记住。你只要比昨天多见过它一次。',
]

const CHEERS_EN = [
  'You don\'t need a perfect day. You need an unbroken one.',
  'Compare yourself to last month, not to someone else\'s streak.',
  'Language learning pays compound interest — the first three months just look like nothing.',
  'You don\'t have to remember it once. You just have to meet it one more time.',
]

export function cheer(locale: 'zh' | 'en'): string {
  return locale === 'en' ? CHEERS_EN[draw('cheer-en', CHEERS_EN.length)] : CHEERS_ZH[draw('cheer-zh', CHEERS_ZH.length)]
}
