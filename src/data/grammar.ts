/**
 * 语法练习题库。
 *
 * 只覆盖中国学生最常错的十个点，每题四个选项、一个正确答案、一句中文解释。
 * 题干里的 `___` 会被渲染成下划线空位。
 */

export interface GrammarQuestion {
  /** 题干，用 ___ 表示空位 */
  q: string
  /** 四个选项 */
  opts: string[]
  /** 正确选项下标 */
  a: number
  /** 一句话解释 */
  why: string
}

export interface GrammarTopic {
  id: string
  title: { zh: string; en: string }
  /** CEFR 难度 */
  level: 'A2' | 'B1' | 'B2' | 'C1'
  brief: { zh: string; en: string }
  questions: GrammarQuestion[]
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'present',
    title: { zh: '一般现在时 vs 现在进行时', en: 'Present Simple vs Continuous' },
    level: 'A2',
    brief: { zh: '习惯和事实用一般现在时，此刻正在发生用进行时', en: 'Habits vs actions happening now' },
    questions: [
      { q: 'She ___ to work by bus every day.', opts: ['go', 'goes', 'is going', 'gone'], a: 1, why: 'every day 表示习惯，主语第三人称单数，用 goes。' },
      { q: 'Look! The baby ___.', opts: ['sleeps', 'is sleeping', 'slept', 'has slept'], a: 1, why: 'Look! 提示此刻正在发生，用现在进行时。' },
      { q: 'Water ___ at 100°C.', opts: ['boil', 'boils', 'is boiling', 'boiled'], a: 1, why: '客观事实与真理用一般现在时。' },
      { q: 'They ___ football at the moment.', opts: ['play', 'are playing', 'played', 'have played'], a: 1, why: 'at the moment 是进行时的标志词。' },
      { q: 'He usually ___ up at six.', opts: ['get', 'gets', 'is getting', 'got'], a: 1, why: 'usually 表频率，用一般现在时，三单加 s。' },
      { q: 'Listen! Someone ___ the piano.', opts: ['plays', 'is playing', 'played', 'has played'], a: 1, why: 'Listen! 和 Look! 一样，提示正在进行。' },
      { q: 'My sister ___ coffee at all.', opts: ["don't like", "doesn't like", "isn't liking", 'not likes'], a: 1, why: '否定一般现在时用 doesn\'t + 动词原形。' },
      { q: '___ you often go to the gym?', opts: ['Do', 'Does', 'Are', 'Have'], a: 0, why: '主语是 you，助动词用 Do。' },
    ],
  },
  {
    id: 'past',
    title: { zh: '一般过去时 vs 现在完成时', en: 'Past Simple vs Present Perfect' },
    level: 'B1',
    brief: { zh: '有明确过去时间就用过去时，强调对现在的影响用完成时', en: 'Finished past vs past with present relevance' },
    questions: [
      { q: 'I ___ my keys yesterday.', opts: ['lose', 'lost', 'have lost', 'was losing'], a: 1, why: 'yesterday 是明确的过去时间点，用一般过去时。' },
      { q: 'She ___ in Shanghai since 2019.', opts: ['lives', 'lived', 'has lived', 'is living'], a: 2, why: 'since 表示从过去持续到现在，用现在完成时。' },
      { q: 'We ___ the film last night.', opts: ['watch', 'watched', 'have watched', 'were watching'], a: 1, why: 'last night 是过去时间，不能用完成时。' },
      { q: '___ you ever ___ sushi?', opts: ['Did, try', 'Have, tried', 'Do, try', 'Are, trying'], a: 1, why: 'ever 常与现在完成时连用，问「到现在为止的经历」。' },
      { q: 'He ___ his homework already.', opts: ['finishes', 'finished', 'has finished', 'is finishing'], a: 2, why: 'already 强调「已经完成」，用现在完成时。' },
      { q: 'They ___ married in 2015.', opts: ['get', 'got', 'have got', 'were getting'], a: 1, why: 'in 2015 是具体的过去年份。' },
      { q: 'I ___ just ___ my lunch.', opts: ['have, finished', 'did, finish', 'am, finishing', 'had, finish'], a: 0, why: 'just 与现在完成时连用，表示刚刚发生。' },
      { q: 'When ___ you ___ this book?', opts: ['have, bought', 'did, buy', 'do, buy', 'were, buying'], a: 1, why: 'When 问的是具体过去时刻，用一般过去时。' },
    ],
  },
  {
    id: 'passive',
    title: { zh: '被动语态', en: 'The Passive Voice' },
    level: 'B1',
    brief: { zh: 'be + 过去分词，重点是动作承受者而不是执行者', en: 'be + past participle' },
    questions: [
      { q: 'The book ___ by Mark Twain.', opts: ['wrote', 'was written', 'is writing', 'has wrote'], a: 1, why: '书是被写的，用 was + 过去分词。' },
      { q: 'English ___ all over the world.', opts: ['speaks', 'is spoken', 'is speaking', 'spoke'], a: 1, why: '语言是被说的，一般现在时被动用 is spoken。' },
      { q: 'The bridge ___ next year.', opts: ['will build', 'will be built', 'is building', 'builds'], a: 1, why: '桥是被建的，将来时被动为 will be + 过去分词。' },
      { q: 'The room ___ at the moment.', opts: ['cleans', 'is cleaning', 'is being cleaned', 'has cleaned'], a: 2, why: '进行时的被动语态：is being + 过去分词。' },
      { q: 'My car ___ last week.', opts: ['stole', 'was stolen', 'has stolen', 'is stealing'], a: 1, why: '车是被偷的，过去时被动用 was stolen。' },
      { q: 'This song ___ many times.', opts: ['played', 'has been played', 'is playing', 'plays'], a: 1, why: '现在完成时的被动：has been + 过去分词。' },
      { q: 'The problem must ___ soon.', opts: ['solve', 'be solved', 'solving', 'to solve'], a: 1, why: '情态动词后的被动是 must be + 过去分词。' },
      { q: 'The letters ___ yesterday.', opts: ['sent', 'were sent', 'are sending', 'have sent'], a: 1, why: '信是被寄出的，过去时复数用 were sent。' },
    ],
  },
  {
    id: 'relative',
    title: { zh: '定语从句', en: 'Relative Clauses' },
    level: 'B2',
    brief: { zh: '先看先行词是人还是物，再看在从句里作什么成分', en: 'who / which / that / whose / when / where' },
    questions: [
      { q: 'The man ___ helped me was very kind.', opts: ['which', 'who', 'whose', 'when'], a: 1, why: '先行词是人，且在从句中作主语，用 who。' },
      { q: 'This is the book ___ I told you about.', opts: ['who', 'which', 'whose', 'when'], a: 1, why: '先行词是物，用 which（或 that）。' },
      { q: 'The house ___ windows are broken is empty.', opts: ['which', 'that', 'whose', 'who'], a: 2, why: 'whose 表示所属关系，指「房子的窗户」。' },
      { q: 'I still remember the day ___ we first met.', opts: ['which', 'that', 'when', 'where'], a: 2, why: '先行词是时间，从句不缺成分，用关系副词 when。' },
      { q: 'This is the school ___ my father taught.', opts: ['which', 'that', 'where', 'when'], a: 2, why: '先行词是地点，从句成分完整，用 where。' },
      { q: 'Anything ___ you say will be recorded.', opts: ['which', 'that', 'what', 'who'], a: 1, why: '先行词是不定代词 anything 时只能用 that。' },
      { q: 'The reason ___ he was late is unclear.', opts: ['which', 'that', 'why', 'when'], a: 2, why: '先行词是 reason，用关系副词 why。' },
      { q: 'She has two brothers, ___ are doctors.', opts: ['both of them', 'both of whom', 'both of which', 'both'], a: 1, why: '介词后接关系代词，指人用 whom。' },
    ],
  },
  {
    id: 'nonfinite',
    title: { zh: '非谓语动词', en: 'Non-finite Verbs' },
    level: 'B2',
    brief: { zh: '记住动词后面接 to do 还是 doing，是最省力的突破口', en: 'to do vs doing' },
    questions: [
      { q: 'I enjoy ___ to music.', opts: ['listen', 'to listen', 'listening', 'listened'], a: 2, why: 'enjoy 后面固定接动名词。' },
      { q: 'She decided ___ the job.', opts: ['taking', 'to take', 'take', 'took'], a: 1, why: 'decide 后接不定式 to do。' },
      { q: '___ from the top, the city looks beautiful.', opts: ['Seeing', 'Seen', 'To see', 'See'], a: 1, why: '城市是「被看」，用过去分词表示被动。' },
      { q: 'The teacher asked us ___ quiet.', opts: ['keep', 'to keep', 'keeping', 'kept'], a: 1, why: 'ask sb to do sth 是固定结构。' },
      { q: 'Remember ___ the light before you leave.', opts: ['turning off', 'to turn off', 'turn off', 'turned off'], a: 1, why: 'remember to do 指「记得去做（还没做）」。' },
      { q: 'He kept ___ the same question.', opts: ['ask', 'to ask', 'asking', 'asked'], a: 2, why: 'keep doing 表示反复做某事。' },
      { q: '___ the news, she burst into tears.', opts: ['Hear', 'Heard', 'Hearing', 'To hear'], a: 2, why: '主语 she 主动听到，用现在分词作状语。' },
      { q: "It's no use ___ about it.", opts: ['worry', 'to worry', 'worrying', 'worried'], a: 2, why: 'It\'s no use doing sth 是固定搭配。' },
    ],
  },
  {
    id: 'subjunctive',
    title: { zh: '虚拟语气', en: 'The Subjunctive' },
    level: 'C1',
    brief: { zh: '与事实相反：现在用过去式，过去用 had done', en: 'Unreal conditions' },
    questions: [
      { q: 'If I ___ you, I would apologize.', opts: ['am', 'was', 'were', 'be'], a: 2, why: '与现在事实相反，be 动词统一用 were。' },
      { q: 'If I had known, I ___ you.', opts: ['would tell', 'would have told', 'told', 'have told'], a: 1, why: '与过去事实相反：if + had done, 主句 would have done。' },
      { q: 'I wish I ___ taller.', opts: ['am', 'was being', 'were', 'be'], a: 2, why: 'wish 后与现在事实相反，用过去式（be 用 were）。' },
      { q: 'He suggested that we ___ early.', opts: ['leave', 'left', 'leaving', 'to leave'], a: 0, why: 'suggest that 从句用 (should) + 动词原形。' },
      { q: 'If only I ___ harder at school.', opts: ['study', 'studied', 'had studied', 'have studied'], a: 2, why: '对过去的遗憾用 had done。' },
      { q: "It's time we ___.", opts: ['leave', 'left', 'will leave', 'leaving'], a: 1, why: "It's time (that) 从句用过去式，表示「早该做了」。" },
      { q: '___ it not been for your help, I would have failed.', opts: ['If', 'Had', 'Were', 'Should'], a: 1, why: '省略 if 时把 had 提前：Had it not been for...。' },
      { q: 'She talks as if she ___ everything.', opts: ['knows', 'knew', 'has known', 'know'], a: 1, why: 'as if 引导与现在事实相反的虚拟，用过去式。' },
    ],
  },
  {
    id: 'article',
    title: { zh: '冠词', en: 'Articles' },
    level: 'A2',
    brief: { zh: 'a/an 看读音，the 表特指，固定搭配要单独记', en: 'a / an / the / zero article' },
    questions: [
      { q: 'He is ___ honest boy.', opts: ['a', 'an', 'the', '—'], a: 1, why: 'honest 的 h 不发音，读音以元音开头，用 an。' },
      { q: 'I play ___ piano.', opts: ['a', 'an', 'the', '—'], a: 2, why: '演奏乐器前加 the。' },
      { q: 'We went to ___ school by bus.', opts: ['a', 'the', '—', 'an'], a: 2, why: 'go to school 表示「去上学」，不加冠词。' },
      { q: '___ sun rises in the east.', opts: ['A', 'The', 'An', '—'], a: 1, why: '世界上独一无二的事物前用 the。' },
      { q: 'She is ___ engineer.', opts: ['a', 'an', 'the', '—'], a: 1, why: 'engineer 以元音音素开头，用 an。' },
      { q: 'I have ___ headache.', opts: ['a', 'an', 'the', '—'], a: 0, why: 'have a headache 是固定搭配。' },
      { q: 'He went to ___ bed early.', opts: ['a', 'the', '—', 'an'], a: 2, why: 'go to bed 表示「去睡觉」，不加冠词。' },
      { q: '___ Pacific is the largest ocean.', opts: ['A', 'An', 'The', '—'], a: 2, why: '海洋、河流、山脉等专有名词前用 the。' },
    ],
  },
  {
    id: 'prep',
    title: { zh: '介词搭配', en: 'Prepositions' },
    level: 'B1',
    brief: { zh: '形容词和动词的固定搭配，必须整块记', en: 'Fixed collocations' },
    questions: [
      { q: "I'm good ___ math.", opts: ['in', 'at', 'on', 'for'], a: 1, why: 'be good at 是固定搭配。' },
      { q: "She's interested ___ art.", opts: ['on', 'in', 'at', 'for'], a: 1, why: 'be interested in 表示对……感兴趣。' },
      { q: 'He arrived ___ the airport at six.', opts: ['in', 'at', 'on', 'to'], a: 1, why: 'arrive at 接小地点，arrive in 接大地点。' },
      { q: "We'll meet ___ Monday.", opts: ['in', 'on', 'at', 'by'], a: 1, why: '具体某一天用 on。' },
      { q: "I've been waiting ___ two hours.", opts: ['since', 'for', 'during', 'in'], a: 1, why: 'for 接时间段，since 接时间点。' },
      { q: "Don't worry ___ it.", opts: ['of', 'about', 'for', 'at'], a: 1, why: 'worry about 表示担心某事。' },
      { q: "She's afraid ___ spiders.", opts: ['from', 'of', 'with', 'to'], a: 1, why: 'be afraid of 是固定搭配。' },
      { q: 'He insisted ___ paying.', opts: ['to', 'on', 'for', 'in'], a: 1, why: 'insist on doing sth，on 后接动名词。' },
    ],
  },
  {
    id: 'agreement',
    title: { zh: '主谓一致', en: 'Subject-Verb Agreement' },
    level: 'B2',
    brief: { zh: '看真正的主语是谁，别被后面的词带偏', en: 'Finding the real subject' },
    questions: [
      { q: 'Each of the students ___ a book.', opts: ['have', 'has', 'are having', 'were'], a: 1, why: 'each of + 复数，谓语仍用单数。' },
      { q: 'Neither of them ___ ready.', opts: ['are', 'is', 'were', 'have'], a: 1, why: 'neither of 作主语时谓语用单数。' },
      { q: 'The news ___ surprising.', opts: ['are', 'is', 'were', 'have'], a: 1, why: 'news 是不可数名词，谓语用单数。' },
      { q: 'Ten years ___ a long time.', opts: ['are', 'is', 'were', 'have'], a: 1, why: '时间、距离、金额作整体时用单数。' },
      { q: 'The number of students ___ increasing.', opts: ['are', 'is', 'were', 'have'], a: 1, why: 'the number of 的中心词是 number，用单数。' },
      { q: 'A number of students ___ absent.', opts: ['is', 'are', 'was', 'has'], a: 1, why: 'a number of 意为「许多」，谓语用复数。' },
      { q: 'Bread and butter ___ my favorite breakfast.', opts: ['are', 'is', 'were', 'have'], a: 1, why: '指同一样东西（黄油面包）时用单数。' },
      { q: 'Everyone ___ here now.', opts: ['are', 'is', 'were', 'have'], a: 1, why: 'everyone 是不定代词，谓语用单数。' },
    ],
  },
  {
    id: 'comparative',
    title: { zh: '比较级与最高级', en: 'Comparatives & Superlatives' },
    level: 'A2',
    brief: { zh: '两者比较用 than，三者以上用 the + 最高级', en: '-er / more / the -est' },
    questions: [
      { q: 'This book is ___ than that one.', opts: ['interesting', 'more interesting', 'most interesting', 'the most interesting'], a: 1, why: '多音节形容词的比较级用 more + 原级。' },
      { q: 'She is the ___ student in her class.', opts: ['tall', 'taller', 'tallest', 'most tall'], a: 2, why: '三者以上比较用最高级，前面加 the。' },
      { q: 'Today is ___ than yesterday.', opts: ['hot', 'hotter', 'hottest', 'more hot'], a: 1, why: '单音节形容词双写末尾辅音加 er。' },
      { q: 'He runs ___ than I do.', opts: ['fast', 'faster', 'fastest', 'more fast'], a: 1, why: '副词的比较级同样加 er。' },
      { q: "This is ___ film I've ever seen.", opts: ['good', 'better', 'the best', 'best'], a: 2, why: '「我看过的最好的」，用最高级且加 the。' },
      { q: 'My car is ___ as yours.', opts: ['so expensive', 'as expensive', 'more expensive', 'expensive'], a: 1, why: 'as + 原级 + as 表示「和……一样」。' },
      { q: 'The ___ you study, the ___ you learn.', opts: ['more, more', 'much, much', 'most, most', 'many, many'], a: 0, why: 'the + 比较级, the + 比较级，表示「越……越……」。' },
      { q: "It's getting ___ and ___.", opts: ['cold, cold', 'colder, colder', 'coldest, coldest', 'more cold, more cold'], a: 1, why: '比较级 and 比较级表示「越来越……」。' },
    ],
  },
]

export function grammarTopic(id: string): GrammarTopic | undefined {
  return GRAMMAR_TOPICS.find((t) => t.id === id)
}

export const GRAMMAR_TOTAL = GRAMMAR_TOPICS.reduce((n, t) => n + t.questions.length, 0)
