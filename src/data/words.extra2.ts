import type { Deck, Word } from './types'

/* 第二批扩充：把每个学段补到至少 3 本，并为日语/西语各加一本进阶书 */

type RowEn = [string, string, string, string, string, string]
type RowJa = [string, string, string, string, string, string]
type RowEs = [string, string, string, string, string]

function buildEn(rows: RowEn[], deck: Deck): Word[] {
  return rows.map((r, i) => ({
    id: `${deck.id}-${i}`,
    lang: 'en' as const,
    deckId: deck.id,
    lemma: r[0],
    phonetic: r[1],
    pos: r[2],
    zh: r[3],
    example: r[4],
    exampleZh: r[5],
    freq: i,
  }))
}

function buildJa(rows: RowJa[], deck: Deck): Word[] {
  return rows.map((r, i) => ({
    id: `${deck.id}-${i}`,
    lang: 'ja' as const,
    deckId: deck.id,
    lemma: r[0],
    reading: r[1],
    pos: r[2],
    zh: r[3],
    example: r[4],
    exampleZh: r[5],
    freq: i,
  }))
}

function buildEs(rows: RowEs[], deck: Deck): Word[] {
  return rows.map((r, i) => ({
    id: `${deck.id}-${i}`,
    lang: 'es' as const,
    deckId: deck.id,
    lemma: r[0],
    pos: r[1],
    zh: r[2],
    example: r[3],
    exampleZh: r[4],
    freq: i,
  }))
}

/* ================= 小学：高频词 ================= */

export const deckPrimarySight: Deck = {
  id: 'en-primary-sight',
  lang: 'en',
  title: { zh: '小学高频词', en: 'Sight Words' },
  level: 'A1',
  examTag: 'SIGHT',
  desc: { zh: '不讲规则、见词就读的 20 个高频词', en: 'Twenty must-know sight words for early readers' },
  accent: 'cyan',
  stage: 'primary',
  series: '高频词',
  cover: { from: '#BFEAF5', to: '#7EC9E6', ink: '#12495C', label: 'SIGHT', big: '高频' },
}

const SIGHT: RowEn[] = [
  ['the', '/ðə/', 'art.', '这；那（定冠词）', 'The dog is running fast.', '那只狗跑得很快。'],
  ['you', '/juː/', 'pron.', '你；你们', 'You are my best friend.', '你是我最好的朋友。'],
  ['and', '/ænd/', 'conj.', '和；并且', 'I like tea and milk.', '我喜欢茶和牛奶。'],
  ['they', '/ðeɪ/', 'pron.', '他们；它们', 'They play football after school.', '他们放学后踢足球。'],
  ['have', '/hæv/', 'v.', '有', 'I have two pencils.', '我有两支铅笔。'],
  ['with', '/wɪð/', 'prep.', '和…一起', 'Come with me, please.', '请跟我来。'],
  ['what', '/wɒt/', 'pron.', '什么', 'What is your name?', '你叫什么名字？'],
  ['been', '/biːn/', 'v.', '是（be 的过去分词）', 'I have been to Beijing twice.', '我去过北京两次。'],
  ['from', '/frɒm/', 'prep.', '从；来自', 'I am from China.', '我来自中国。'],
  ['said', '/sed/', 'v.', '说（say 的过去式）', 'He said hello to me.', '他跟我打了招呼。'],
  ['there', '/ðeə(r)/', 'adv.', '那里', 'Put the book over there.', '把书放到那边。'],
  ['their', '/ðeə(r)/', 'pron.', '他们的', 'Their house is very big.', '他们的房子很大。'],
  ['would', '/wʊd/', 'modal v.', '会；愿意', 'I would like some water.', '我想要点水。'],
  ['could', '/kʊd/', 'modal v.', '能；可以（can 的过去式）', 'Could you help me?', '你能帮我一下吗？'],
  ['because', '/bɪˈkɒz/', 'conj.', '因为', 'I stay at home because it rains.', '因为下雨我待在家里。'],
  ['before', '/bɪˈfɔː(r)/', 'prep.', '在…之前', 'Wash your hands before dinner.', '饭前要洗手。'],
  ['write', '/raɪt/', 'v.', '写', 'Write your name here.', '在这里写下你的名字。'],
  ['right', '/raɪt/', 'adj.', '正确的；右边的', 'Your answer is right.', '你的答案是对的。'],
  ['many', '/ˈmeni/', 'adj.', '许多', 'Many children like sweets.', '许多孩子喜欢糖果。'],
  ['very', '/ˈveri/', 'adv.', '很；非常', 'She is very kind to us.', '她对我们非常友善。'],
]

/* ================= 初中：短语搭配 ================= */

export const deckJuniorPhrase: Deck = {
  id: 'en-junior-phrase',
  lang: 'en',
  title: { zh: '初中短语搭配', en: 'Junior Phrases' },
  level: 'A2',
  examTag: 'PHRASE',
  desc: { zh: '中考最爱考的 18 个动词短语', en: 'Eighteen verb phrases that show up in exams' },
  accent: 'violet',
  stage: 'junior',
  series: '短语',
  cover: { from: '#D9D2FF', to: '#A79BFF', ink: '#2E2361', label: 'PHRASE', big: '短语' },
}

const JUNIOR_PHRASE: RowEn[] = [
  ['look after', '/lʊk ˈɑːftə(r)/', 'phr.', '照顾', 'She looks after her little brother.', '她照顾弟弟。'],
  ['give up', '/ɡɪv ʌp/', 'phr.', '放弃', "Don't give up so early.", '别这么早放弃。'],
  ['take part in', '/teɪk pɑːt ɪn/', 'phr.', '参加', 'I took part in the school race.', '我参加了校运会比赛。'],
  ['come true', '/kʌm truː/', 'phr.', '实现', 'Her dream finally came true.', '她的梦想终于实现了。'],
  ['look forward to', '/lʊk ˈfɔːwəd tuː/', 'phr.', '期待', 'I look forward to your reply.', '我期待你的回复。'],
  ['get on well with', '/ɡet ɒn wel wɪð/', 'phr.', '与…相处融洽', 'I get on well with my classmates.', '我和同学们相处得很好。'],
  ['as soon as', '/əz suːn əz/', 'phr.', '一…就…', 'Call me as soon as you arrive.', '你一到就给我打电话。'],
  ['instead of', '/ɪnˈsted əv/', 'phr.', '代替；而不是', "Let's walk instead of driving.", '我们走路去吧，别开车了。'],
  ['be used to', '/biː juːst tuː/', 'phr.', '习惯于', 'He is used to getting up early.', '他习惯早起。'],
  ['pay attention to', '/peɪ əˈtenʃn tuː/', 'phr.', '注意；关注', 'Pay attention to the teacher, please.', '请注意听老师讲。'],
  ['in order to', '/ɪn ˈɔːdə(r) tuː/', 'phr.', '为了', 'She got up early in order to catch the bus.', '为了赶上公交，她起得很早。'],
  ['deal with', '/diːl wɪð/', 'phr.', '处理；应付', 'We must deal with this problem today.', '我们今天必须处理这个问题。'],
  ['depend on', '/dɪˈpend ɒn/', 'phr.', '依靠；取决于', 'It depends on the weather.', '这取决于天气。'],
  ['make friends with', '/meɪk frendz wɪð/', 'phr.', '与…交朋友', 'She made friends with a new student.', '她和一个新同学交上了朋友。'],
  ['be proud of', '/biː praʊd əv/', 'phr.', '为…感到自豪', 'My parents are proud of me.', '我父母为我感到自豪。'],
  ['take care of', '/teɪk keə(r) əv/', 'phr.', '照料；负责', 'Please take care of the plants.', '请照看一下这些植物。'],
  ['find out', '/faɪnd aʊt/', 'phr.', '查明；弄清楚', 'I want to find out the truth.', '我想查明真相。'],
  ['put off', '/pʊt ɒf/', 'phr.', '推迟', 'They put off the meeting till Friday.', '他们把会议推迟到周五。'],
]

/* ================= 高中：熟词僻义 ================= */

export const deckSeniorDeep: Deck = {
  id: 'en-senior-deep',
  lang: 'en',
  title: { zh: '高中熟词僻义', en: 'Familiar Words, New Senses' },
  level: 'B2',
  examTag: 'SENIOR',
  desc: { zh: '认识却会译错的 18 个词', en: 'Eighteen words whose second sense trips you up' },
  accent: 'amber',
  stage: 'senior',
  series: '熟词僻义',
  cover: { from: '#FFE0AF', to: '#F0A95C', ink: '#6F3E08', label: 'SENIOR', big: '僻义' },
}

const SENIOR_DEEP: RowEn[] = [
  ['address', '/əˈdres/', 'v.', '处理；应对（不是「地址」）', 'We must address the issue now.', '我们现在必须应对这个问题。'],
  ['book', '/bʊk/', 'v.', '预订（不是「书」）', 'I booked a table for two.', '我订了一张双人桌。'],
  ['figure', '/ˈfɪɡə(r)/', 'n.', '人物；数字（不是「身材」）', 'She is a key figure in this field.', '她是这个领域的关键人物。'],
  ['last', '/lɑːst/', 'v.', '持续（不是「最后的」）', 'The film lasts about two hours.', '这部电影大约持续两小时。'],
  ['mean', '/miːn/', 'adj.', '吝啬的；刻薄的', "Don't be mean to your classmates.", '别对同学刻薄。'],
  ['observe', '/əbˈzɜːv/', 'v.', '遵守；庆祝', 'We observe the Spring Festival every year.', '我们每年都过春节。'],
  ['present', '/prɪˈzent/', 'v.', '呈现；提交', 'He presented a new plan to the class.', '他向全班提交了一份新方案。'],
  ['save', '/seɪv/', 'prep.', '除…之外', 'Everyone came save Tom.', '除了汤姆，所有人都来了。'],
  ['sound', '/saʊnd/', 'adj.', '合理的；健全的', 'That is a sound argument.', '那是一个合理的论点。'],
  ['strike', '/straɪk/', 'v.', '突然想到', 'A good idea struck me on the bus.', '我在公交车上突然想到一个好主意。'],
  ['subject', '/səbˈdʒekt/', 'v.', '使遭受', 'The plan was subjected to close review.', '这个计划接受了严格审查。'],
  ['treat', '/triːt/', 'v.', '请客；招待', "I'll treat you to dinner tonight.", '今晚我请你吃饭。'],
  ['practice', '/ˈpræktɪs/', 'n.', '惯例；做法', 'This is a common practice in Japan.', '这在日本是常见的做法。'],
  ['fire', '/ˈfaɪə(r)/', 'v.', '解雇（不是「火」）', 'The company fired him last week.', '公司上周解雇了他。'],
  ['head', '/hed/', 'v.', '前往；领导', 'She heads the research team.', '她领导这个研究团队。'],
  ['land', '/lænd/', 'v.', '获得；着陆', 'He landed a good job in Shanghai.', '他在上海找到了一份好工作。'],
  ['plant', '/plɑːnt/', 'n.', '工厂（不是「植物」）', 'He works at a car plant.', '他在一家汽车厂工作。'],
  ['run', '/rʌn/', 'v.', '经营（不是「跑」）', 'She runs a small bookshop.', '她经营一家小书店。'],
]

/* ================= 留学：GRE ================= */

export const deckGre: Deck = {
  id: 'en-gre',
  lang: 'en',
  title: { zh: 'GRE 核心词', en: 'GRE Core' },
  level: 'C1',
  examTag: 'GRE',
  desc: { zh: '填空与阅读里的 18 个高频难词', en: 'Eighteen high-frequency GRE words for verbal' },
  accent: 'violet',
  stage: 'abroad',
  series: 'GRE',
  cover: { from: '#CFC7FF', to: '#8F7EF0', ink: '#2A1F63', label: 'GRE', big: 'GRE' },
}

const GRE: RowEn[] = [
  ['aberration', '/ˌæbəˈreɪʃn/', 'n.', '反常现象；偏差', 'The cold summer was an aberration.', '这个凉爽的夏天属于反常现象。'],
  ['acquiesce', '/ˌækwiˈes/', 'v.', '默许；勉强同意', 'She acquiesced in the new rule.', '她默许了这条新规定。'],
  ['barren', '/ˈbærən/', 'adj.', '贫瘠的；无成果的', 'Nothing grows on this barren land.', '这片贫瘠的土地上什么都不长。'],
  ['cacophony', '/kəˈkɒfəni/', 'n.', '刺耳的杂音', 'A cacophony of horns filled the street.', '街上充斥着刺耳的喇叭声。'],
  ['capricious', '/kəˈprɪʃəs/', 'adj.', '反复无常的', 'The weather here is capricious.', '这里的天气变化无常。'],
  ['dearth', '/dɜːθ/', 'n.', '缺乏；不足', 'There is a dearth of skilled workers.', '熟练工人十分缺乏。'],
  ['ephemeral', '/ɪˈfemərəl/', 'adj.', '短暂的', 'Fame in social media is often ephemeral.', '社交媒体上的名气往往很短暂。'],
  ['equivocal', '/ɪˈkwɪvəkl/', 'adj.', '模糊的；含糊的', 'His answer was equivocal.', '他的回答含糊其辞。'],
  ['gauche', '/ɡəʊʃ/', 'adj.', '笨拙的；不圆滑的', 'It was a gauche remark at the party.', '那在聚会上是句不得体的话。'],
  ['iconoclast', '/aɪˈkɒnəklæst/', 'n.', '反传统者', 'He was an iconoclast in the design world.', '他是设计界的反传统者。'],
  ['laconic', '/ləˈkɒnɪk/', 'adj.', '简洁的；话少的', 'Her laconic reply ended the debate.', '她简短的回答终结了争论。'],
  ['mendacious', '/menˈdeɪʃəs/', 'adj.', '撒谎的；虚假的', 'The report was mendacious.', '这份报告是虚假的。'],
  ['obdurate', '/ˈɒbdjərət/', 'adj.', '固执的；顽固的', 'He remained obdurate despite the evidence.', '尽管有证据，他仍然固执己见。'],
  ['parsimonious', '/ˌpɑːsɪˈməʊniəs/', 'adj.', '吝啬的；过分节俭的', 'The budget was parsimonious.', '这份预算过于节俭。'],
  ['quiescent', '/kwiˈesnt/', 'adj.', '静止的；沉寂的', 'The volcano has been quiescent for years.', '这座火山已沉寂多年。'],
  ['reticent', '/ˈretɪsnt/', 'adj.', '沉默寡言的', 'He is reticent about his past.', '他对自己的过去闭口不谈。'],
  ['soporific', '/ˌsɒpəˈrɪfɪk/', 'adj.', '令人昏昏欲睡的', 'The lecture was rather soporific.', '那场讲座让人昏昏欲睡。'],
  ['ubiquitous', '/juːˈbɪkwɪtəs/', 'adj.', '无处不在的', 'Smartphones are ubiquitous today.', '如今智能手机无处不在。'],
]

/* ================= 英专：专八真题 ================= */

export const deckTem8Past: Deck = {
  id: 'en-tem8-past',
  lang: 'en',
  title: { zh: '专八真题高频', en: 'TEM-8 Past Words' },
  level: 'C1',
  examTag: 'TEM-8',
  desc: { zh: '十六个反复出现的专八阅读词', en: 'Sixteen words that keep appearing in TEM-8 reading' },
  accent: 'rose',
  stage: 'major',
  series: '专八',
  cover: { from: '#FFD2DC', to: '#F49BAE', ink: '#7C2338', label: 'TEM-8', big: '专八' },
}

const TEM8_PAST: RowEn[] = [
  ['abhor', '/əbˈhɔː(r)/', 'v.', '憎恶；厌恶', 'She abhors any form of cruelty.', '她憎恶任何形式的残忍。'],
  ['cogent', '/ˈkəʊdʒənt/', 'adj.', '有说服力的；令人信服的', 'She gave a cogent explanation.', '她给出了一个有说服力的解释。'],
  ['wary', '/ˈweəri/', 'adj.', '警惕的；小心的', 'Be wary of offers that sound too good.', '对听起来太好的提议要保持警惕。'],
  ['construe', '/kənˈstruː/', 'v.', '理解为；解释为', 'His silence was construed as consent.', '他的沉默被理解为同意。'],
  ['delineate', '/dɪˈlɪnieɪt/', 'v.', '勾画；阐明', 'The report delineates three clear options.', '报告明确阐述了三种选择。'],
  ['exacerbate', '/ɪɡˈzæsəbeɪt/', 'v.', '加剧；使恶化', 'Delay would only exacerbate the problem.', '拖延只会让问题更糟。'],
  ['resilient', '/rɪˈzɪliənt/', 'adj.', '有韧性的；恢复力强的', 'Children are remarkably resilient.', '孩子的恢复力非常强。'],
  ['grapple', '/ˈɡræpl/', 'v.', '努力应对；扭打', 'The city is grappling with traffic jams.', '这座城市正努力应对交通拥堵。'],
  ['hamper', '/ˈhæmpə(r)/', 'v.', '阻碍；妨碍', 'Heavy rain hampered the rescue.', '大雨阻碍了救援。'],
  ['tenuous', '/ˈtenjuəs/', 'adj.', '薄弱的；牵强的', 'They kept a tenuous hold on power.', '他们对权力的掌控十分薄弱。'],
  ['jeopardize', '/ˈdʒepədaɪz/', 'v.', '危及；损害', 'That mistake could jeopardize the deal.', '那个失误可能危及这笔交易。'],
  ['lucrative', '/ˈluːkrətɪv/', 'adj.', '赚钱的；利润丰厚的', 'Translation proved a lucrative career.', '翻译被证明是一份赚钱的职业。'],
  ['nuance', '/ˈnjuːɑːns/', 'n.', '细微差别', 'She caught every nuance of his tone.', '她捕捉到了他语气里的每处细微差别。'],
  ['novelty', '/ˈnɒvlti/', 'n.', '新奇；新鲜感', 'The novelty of the job soon wore off.', '这份工作的新鲜感很快就消失了。'],
  ['prudent', '/ˈpruːdnt/', 'adj.', '谨慎的；精明的', 'It is prudent to save some money.', '存点钱是谨慎的做法。'],
  ['substantiate', '/səbˈstænʃieɪt/', 'v.', '证实；证明', 'He could not substantiate his claim.', '他无法证实自己的说法。'],
]

/* ================= 其他：日语 N4 ================= */

export const deckJaN4: Deck = {
  id: 'ja-n4',
  lang: 'ja',
  title: { zh: 'JLPT N4 进阶', en: 'JLPT N4 Builder' },
  level: 'N4',
  examTag: 'JLPT',
  desc: { zh: 'N4 常用的抽象名词与动词，带假名', en: 'Thirty N4 nouns and verbs with kana readings' },
  accent: 'rose',
  stage: 'other',
  series: 'JLPT',
  cover: { from: '#FFD9DF', to: '#F08FA2', ink: '#8C2340', label: 'JLPT N4', big: 'N4' },
}

const JA_N4: RowJa[] = [
  ['経験', 'けいけん', '名・动', '经验', '海外で働いた経験があります。', '我有在国外工作的经验。'],
  ['準備', 'じゅんび', '名・动', '准备', '旅行の準備をしています。', '我在准备旅行。'],
  ['都合', 'つごう', '名', '方便；情况', '明日の都合はどうですか。', '明天你方便吗？'],
  ['約束', 'やくそく', '名・动', '约定', '友達と約束があります。', '我和朋友有约。'],
  ['連絡', 'れんらく', '名・动', '联络', '後で連絡します。', '我稍后联系你。'],
  ['予約', 'よやく', '名・动', '预约；预订', 'ホテルを予約しました。', '我订好了酒店。'],
  ['説明', 'せつめい', '名・动', '说明', 'もう一度説明してください。', '请再说明一次。'],
  ['相談', 'そうだん', '名・动', '商量', '先生に相談してみます。', '我试着和老师商量一下。'],
  ['案内', 'あんない', '名・动', '引导；导游', '町を案内してあげます。', '我带你逛逛这个城市。'],
  ['招待', 'しょうたい', '名・动', '邀请', '結婚式に招待されました。', '我被邀请参加婚礼。'],
  ['遠慮', 'えんりょ', '名・动', '客气；谦让', '遠慮しないで食べてください。', '别客气，请吃。'],
  ['我慢', 'がまん', '名・动', '忍耐', '痛くても我慢しました。', '虽然疼，但我忍住了。'],
  ['努力', 'どりょく', '名・动', '努力', '努力すれば合格できます。', '只要努力就能合格。'],
  ['興味', 'きょうみ', '名', '兴趣', '日本の文化に興味があります。', '我对日本文化有兴趣。'],
  ['意見', 'いけん', '名', '意见', 'あなたの意見を聞かせてください。', '请让我听听你的意见。'],
  ['関係', 'かんけい', '名', '关系', '二人はいい関係です。', '两人关系很好。'],
  ['冗談', 'じょうだん', '名', '玩笑', 'それは冗談ですよ。', '那是玩笑啦。'],
  ['態度', 'たいど', '名', '态度', '彼の態度は失礼でした。', '他的态度很失礼。'],
  ['印象', 'いんしょう', '名', '印象', '彼の印象はとてもよかったです。', '他给人的印象非常好。'],
  ['環境', 'かんきょう', '名', '环境', 'ここは環境がいいです。', '这里环境很好。'],
  ['文化', 'ぶんか', '名', '文化', '日本の文化を勉強しています。', '我在学习日本文化。'],
  ['習慣', 'しゅうかん', '名', '习惯', '早起きの習慣があります。', '我有早起的习惯。'],
  ['交通', 'こうつう', '名', '交通', 'この町は交通が便利です。', '这个城市交通很方便。'],
  ['空港', 'くうこう', '名', '机场', '空港までバスで行きます。', '坐大巴去机场。'],
  ['旅行', 'りょこう', '名・动', '旅行', '来月、旅行に行きます。', '下个月去旅行。'],
  ['荷物', 'にもつ', '名', '行李', '荷物が重いです。', '行李很重。'],
  ['薬', 'くすり', '名', '药', '薬を飲んで休みました。', '吃了药休息了。'],
  ['熱', 'ねつ', '名', '发烧；热度', '熱があるので休みます。', '因为发烧我要请假。'],
  ['怪我', 'けが', '名・动', '受伤', 'サッカーで怪我をしました。', '踢球时受伤了。'],
  ['遅刻', 'ちこく', '名・动', '迟到', '電車が遅れて遅刻しました。', '电车晚点，我迟到了。'],
]

/* ================= 其他：西班牙语 A2 ================= */

export const deckEsA2: Deck = {
  id: 'es-a2',
  lang: 'es',
  title: { zh: '西班牙语 A2', en: 'Spanish A2' },
  level: 'A2',
  examTag: 'DELE',
  desc: { zh: '连接词、副词与情绪形容词', en: 'Connectors, adverbs and feeling words' },
  accent: 'amber',
  stage: 'other',
  series: 'DELE',
  cover: { from: '#FFE7BF', to: '#F0B267', ink: '#7A4410', label: 'DELE A2', big: 'A2' },
}

const ES_A2: RowEs[] = [
  ['aunque', '连', '虽然；即使', 'Aunque llueve, salimos.', '虽然下雨，我们还是出门。'],
  ['mientras', '连', '当…的时候', 'Leo mientras desayuno.', '我边吃早饭边看书。'],
  ['quizá', '副', '也许', 'Quizá llegue tarde.', '也许我会迟到。'],
  ['entonces', '副', '那么；当时', 'Entonces, ¿qué hacemos?', '那么我们怎么办？'],
  ['casi', '副', '几乎', 'Casi he terminado el trabajo.', '我工作几乎做完了。'],
  ['además', '副', '此外；而且', 'Además, es más barato.', '此外，它还更便宜。'],
  ['todavía', '副', '还；仍然', 'Todavía no ha llegado.', '他还没到。'],
  ['temprano', '副', '早', 'Me levanto temprano cada día.', '我每天起得很早。'],
  ['tarde', '副', '晚', 'Llegó muy tarde a casa.', '他很晚才到家。'],
  ['lejos', '副', '远', 'El museo está lejos de aquí.', '博物馆离这儿很远。'],
  ['cerca', '副', '近', 'Hay una farmacia cerca.', '附近有一家药店。'],
  ['barato', '形', '便宜的', 'Este piso es bastante barato.', '这套房子挺便宜的。'],
  ['caro', '形', '贵的', 'Ese reloj es muy caro.', '那块手表很贵。'],
  ['agradable', '形', '愉快的；宜人的', 'Fue una tarde muy agradable.', '那是一个很愉快的下午。'],
  ['enfadado', '形', '生气的', 'Mi padre está enfadado conmigo.', '我爸爸在生我的气。'],
  ['alegre', '形', '高兴的；开朗的', 'Es una niña muy alegre.', '她是个非常开朗的女孩。'],
  ['tranquilo', '形', '安静的；平静的', 'El barrio es muy tranquilo.', '这个街区很安静。'],
  ['oscuro', '形', '暗的；深色的', 'La habitación está un poco oscura.', '房间有点暗。'],
  ['ruido', '名', '噪音', 'Hay mucho ruido en la calle.', '街上很吵。'],
  ['salud', '名', '健康', 'La salud es lo más importante.', '健康是最重要的。'],
  ['consejo', '名', '建议', 'Gracias por tu consejo.', '谢谢你的建议。'],
  ['mejorar', '动', '改善；提高', 'Quiero mejorar mi español.', '我想提高我的西班牙语。'],
  ['olvidar', '动', '忘记', 'Olvidé las llaves en casa.', '我把钥匙忘在家里了。'],
  ['recordar', '动', '记得；想起', 'No recuerdo su nombre.', '我不记得他的名字。'],
]

export const extraDecks2: Deck[] = [
  deckPrimarySight,
  deckJuniorPhrase,
  deckSeniorDeep,
  deckGre,
  deckTem8Past,
  deckJaN4,
  deckEsA2,
]

export const extraWords2: Word[] = [
  ...buildEn(SIGHT, deckPrimarySight),
  ...buildEn(JUNIOR_PHRASE, deckJuniorPhrase),
  ...buildEn(SENIOR_DEEP, deckSeniorDeep),
  ...buildEn(GRE, deckGre),
  ...buildEn(TEM8_PAST, deckTem8Past),
  ...buildJa(JA_N4, deckJaN4),
  ...buildEs(ES_A2, deckEsA2),
]
