import type { Deck, Word } from './types'

type Row = [string, string, string, string, string, string]

function build(rows: Row[], deck: Deck): Word[] {
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

/* ================= 自然拼读 ================= */

export const deckPhonicsCvc: Deck = {
  id: 'en-phonics-cvc',
  lang: 'en',
  title: { zh: '短元音拼读', en: 'Short Vowels' },
  level: 'Pre-A1',
  examTag: 'PHONICS',
  desc: { zh: '三字母 CVC 词，练 a e i o u 的短音', en: 'Three-letter CVC words for short vowel sounds' },
  accent: 'amber',
  stage: 'phonics',
  series: '自然拼读',
  cover: { from: '#FFE0AF', to: '#F5B870', ink: '#7A4410', label: 'PHONICS', big: '拼读' },
}

const CVC: Row[] = [
  ['cat', '/kæt/', 'n.', '猫', 'The cat is on the mat.', '猫在垫子上。'],
  ['bat', '/bæt/', 'n.', '球棒；蝙蝠', 'He hit the ball with a bat.', '他用球棒击球。'],
  ['bed', '/bed/', 'n.', '床', 'My bed is soft.', '我的床很软。'],
  ['pen', '/pen/', 'n.', '笔', 'This pen is blue.', '这支笔是蓝色的。'],
  ['pig', '/pɪɡ/', 'n.', '猪', 'The pig is very fat.', '这头猪很胖。'],
  ['sit', '/sɪt/', 'v.', '坐', 'Please sit down.', '请坐下。'],
  ['dog', '/dɔːɡ/', 'n.', '狗', 'My dog likes to run.', '我的狗喜欢跑。'],
  ['box', '/bɑːks/', 'n.', '盒子', 'Open the box, please.', '请打开盒子。'],
  ['cup', '/kʌp/', 'n.', '杯子', 'A cup of tea, please.', '请来一杯茶。'],
  ['bus', '/bʌs/', 'n.', '公交车', 'I take the bus to school.', '我坐公交车上学。'],
  ['sun', '/sʌn/', 'n.', '太阳', 'The sun is very bright.', '太阳很亮。'],
  ['map', '/mæp/', 'n.', '地图', 'Look at the map.', '看这张地图。'],
  ['hat', '/hæt/', 'n.', '帽子', 'She wears a red hat.', '她戴着一顶红帽子。'],
  ['red', '/red/', 'adj.', '红色的', 'The apple is red.', '这个苹果是红的。'],
  ['big', '/bɪɡ/', 'adj.', '大的', 'That is a big house.', '那是一栋大房子。'],
  ['hot', '/hɑːt/', 'adj.', '热的', 'The soup is hot.', '汤很烫。'],
  ['run', '/rʌn/', 'v.', '跑', 'They run every morning.', '他们每天早上跑步。'],
  ['fun', '/fʌn/', 'adj.', '有趣的', 'The game is fun.', '这个游戏很有趣。'],
]

export const deckPhonicsMagic: Deck = {
  id: 'en-phonics-magic',
  lang: 'en',
  title: { zh: 'Magic E 长音', en: 'Magic E' },
  level: 'Pre-A1',
  examTag: 'PHONICS',
  desc: { zh: '词尾加 e，前面的元音读字母本音', en: 'A silent final e turns the vowel long' },
  accent: 'cyan',
  stage: 'phonics',
  series: '自然拼读',
  cover: { from: '#BFE9FF', to: '#7EC8F0', ink: '#124B6B', label: 'MAGIC E', big: '长音' },
}

const MAGIC: Row[] = [
  ['cake', '/keɪk/', 'n.', '蛋糕', 'We share a birthday cake.', '我们分享一个生日蛋糕。'],
  ['bike', '/baɪk/', 'n.', '自行车', 'He rides a bike to work.', '他骑自行车上班。'],
  ['home', '/hoʊm/', 'n.', '家', 'I go home at six.', '我六点回家。'],
  ['cube', '/kjuːb/', 'n.', '立方体', 'The ice cube is melting.', '冰块正在融化。'],
  ['name', '/neɪm/', 'n.', '名字', 'What is your name?', '你叫什么名字？'],
  ['five', '/faɪv/', 'num.', '五', 'I have five books.', '我有五本书。'],
  ['nose', '/noʊz/', 'n.', '鼻子', 'The dog has a wet nose.', '这只狗的鼻子是湿的。'],
  ['cute', '/kjuːt/', 'adj.', '可爱的', 'The baby is cute.', '宝宝很可爱。'],
  ['game', '/ɡeɪm/', 'n.', '游戏', 'Let us play a game.', '我们来玩个游戏。'],
  ['kite', '/kaɪt/', 'n.', '风筝', 'The kite flies high.', '风筝飞得很高。'],
  ['note', '/noʊt/', 'n.', '便条', 'She left a note on the desk.', '她在桌上留了张便条。'],
  ['tube', '/tuːb/', 'n.', '管子', 'A tube of toothpaste.', '一管牙膏。'],
  ['late', '/leɪt/', 'adj.', '迟的', 'Do not be late again.', '别再迟到了。'],
  ['hide', '/haɪd/', 'v.', '躲藏', 'The cat hides under the bed.', '猫躲在床下。'],
  ['rope', '/roʊp/', 'n.', '绳子', 'They pull the rope together.', '他们一起拉绳子。'],
  ['wide', '/waɪd/', 'adj.', '宽的', 'The road is wide.', '这条路很宽。'],
]

export const deckPhonicsBlend: Deck = {
  id: 'en-phonics-blend',
  lang: 'en',
  title: { zh: '辅音组合', en: 'Consonant Blends' },
  level: 'A1',
  examTag: 'PHONICS',
  desc: { zh: 'sh / ch / th 与 bl / st / tr 等组合音', en: 'Digraphs and blends such as sh, ch, th, bl, st' },
  accent: 'violet',
  stage: 'phonics',
  series: '自然拼读',
  cover: { from: '#C9C2F5', to: '#9C8FE8', ink: '#3B2E8C', label: 'BLENDS', big: '组合' },
}

const BLEND: Row[] = [
  ['ship', '/ʃɪp/', 'n.', '船', 'The ship leaves at noon.', '船中午出发。'],
  ['chat', '/tʃæt/', 'v.', '聊天', 'We chat after class.', '我们课后聊天。'],
  ['thin', '/θɪn/', 'adj.', '薄的；瘦的', 'The ice is thin.', '冰很薄。'],
  ['this', '/ðɪs/', 'pron.', '这个', 'This is my seat.', '这是我的座位。'],
  ['when', '/wen/', 'adv.', '什么时候', 'When do you get up?', '你什么时候起床？'],
  ['stop', '/stɑːp/', 'v.', '停止', 'Stop the car, please.', '请停车。'],
  ['frog', '/frɔːɡ/', 'n.', '青蛙', 'A frog jumps into the pond.', '一只青蛙跳进池塘。'],
  ['blue', '/bluː/', 'adj.', '蓝色的', 'The sky is blue.', '天空是蓝色的。'],
  ['crab', '/kræb/', 'n.', '螃蟹', 'The crab walks sideways.', '螃蟹横着走。'],
  ['drum', '/drʌm/', 'n.', '鼓', 'He plays the drum well.', '他鼓打得很好。'],
  ['flag', '/flæɡ/', 'n.', '旗子', 'The flag is flying.', '旗子在飘。'],
  ['glass', '/ɡlæs/', 'n.', '玻璃杯', 'A glass of milk.', '一杯牛奶。'],
  ['plant', '/plænt/', 'n.', '植物', 'Water the plant daily.', '每天给植物浇水。'],
  ['sleep', '/sliːp/', 'v.', '睡觉', 'Children sleep eight hours.', '孩子们睡八小时。'],
  ['tree', '/triː/', 'n.', '树', 'Birds sing in the tree.', '鸟在树上唱歌。'],
  ['swim', '/swɪm/', 'v.', '游泳', 'I swim twice a week.', '我一周游两次泳。'],
]

/* ================= 小学 ================= */

export const deckPrimaryCore: Deck = {
  id: 'en-primary-core',
  lang: 'en',
  title: { zh: '小学核心词', en: 'Primary Core' },
  level: 'A1',
  examTag: '小学',
  desc: { zh: '吃穿住用与校园生活的必备词', en: 'Must-know words for food, home and school' },
  accent: 'cyan',
  stage: 'primary',
  series: '核心词',
  cover: { from: '#A9E4F2', to: '#6FC7E6', ink: '#0F5A73', label: 'PRIMARY', big: '小学' },
}

const PRIMARY_CORE: Row[] = [
  ['apple', '/ˈæpl/', 'n.', '苹果', 'I eat an apple every day.', '我每天吃一个苹果。'],
  ['banana', '/bəˈnænə/', 'n.', '香蕉', 'The banana is yellow.', '香蕉是黄色的。'],
  ['orange', '/ˈɔːrɪndʒ/', 'n.', '橙子', 'She likes orange juice.', '她喜欢橙汁。'],
  ['water', '/ˈwɔːtər/', 'n.', '水', 'Drink more water.', '多喝水。'],
  ['milk', '/mɪlk/', 'n.', '牛奶', 'I drink milk in the morning.', '我早上喝牛奶。'],
  ['bread', '/bred/', 'n.', '面包', 'The bread is fresh.', '面包很新鲜。'],
  ['rice', '/raɪs/', 'n.', '米饭', 'We have rice for lunch.', '我们午饭吃米饭。'],
  ['egg', '/eɡ/', 'n.', '鸡蛋', 'He eats two eggs.', '他吃两个鸡蛋。'],
  ['meat', '/miːt/', 'n.', '肉', 'The meat is on the plate.', '肉在盘子里。'],
  ['fish', '/fɪʃ/', 'n.', '鱼', 'The fish tastes good.', '这鱼很好吃。'],
  ['table', '/ˈteɪbl/', 'n.', '桌子', 'The book is on the table.', '书在桌上。'],
  ['chair', '/tʃer/', 'n.', '椅子', 'Sit on the chair.', '坐在椅子上。'],
  ['window', '/ˈwɪndoʊ/', 'n.', '窗户', 'Open the window, please.', '请打开窗户。'],
  ['door', '/dɔːr/', 'n.', '门', 'Close the door.', '关上门。'],
  ['school', '/skuːl/', 'n.', '学校', 'Our school is big.', '我们的学校很大。'],
  ['teacher', '/ˈtiːtʃər/', 'n.', '老师', 'My teacher is kind.', '我的老师很和善。'],
  ['student', '/ˈstuːdnt/', 'n.', '学生', 'She is a good student.', '她是个好学生。'],
  ['pencil', '/ˈpensl/', 'n.', '铅笔', 'Use a pencil to write.', '用铅笔写。'],
  ['ruler', '/ˈruːlər/', 'n.', '尺子', 'The ruler is twenty centimeters.', '这把尺子二十厘米。'],
  ['bag', '/bæɡ/', 'n.', '书包', 'My bag is heavy.', '我的书包很重。'],
]

export const deckPrimaryScene: Deck = {
  id: 'en-primary-scene',
  lang: 'en',
  title: { zh: '小学情景词', en: 'Primary Scenes' },
  level: 'A1',
  examTag: '小学',
  desc: { zh: '按场景记：家、学校、出行、公共场所', en: 'Words grouped by scenes: home, school, city' },
  accent: 'amber',
  stage: 'primary',
  series: '情景词',
  cover: { from: '#FFE3A8', to: '#F7C75D', ink: '#7A4E0B', label: 'SCENES', big: '情景' },
}

const PRIMARY_SCENE: Row[] = [
  ['morning', '/ˈmɔːrnɪŋ/', 'n.', '早上', 'Good morning, everyone.', '大家早上好。'],
  ['evening', '/ˈiːvnɪŋ/', 'n.', '傍晚', 'We walk in the evening.', '我们傍晚散步。'],
  ['birthday', '/ˈbɜːrθdeɪ/', 'n.', '生日', 'Happy birthday to you.', '祝你生日快乐。'],
  ['holiday', '/ˈhɑːlədeɪ/', 'n.', '假期', 'The holiday starts tomorrow.', '假期明天开始。'],
  ['weekend', '/ˈwiːkend/', 'n.', '周末', 'What do you do on weekends?', '你周末做什么？'],
  ['garden', '/ˈɡɑːrdn/', 'n.', '花园', 'Flowers grow in the garden.', '花在花园里生长。'],
  ['park', '/pɑːrk/', 'n.', '公园', 'We fly kites in the park.', '我们在公园放风筝。'],
  ['zoo', '/zuː/', 'n.', '动物园', 'The zoo has many animals.', '动物园里有很多动物。'],
  ['farm', '/fɑːrm/', 'n.', '农场', 'My uncle works on a farm.', '我叔叔在农场工作。'],
  ['hospital', '/ˈhɑːspɪtl/', 'n.', '医院', 'The hospital is near here.', '医院就在附近。'],
  ['library', '/ˈlaɪbreri/', 'n.', '图书馆', 'Be quiet in the library.', '在图书馆里要安静。'],
  ['market', '/ˈmɑːrkɪt/', 'n.', '市场', 'She buys fruit at the market.', '她在市场买水果。'],
  ['station', '/ˈsteɪʃn/', 'n.', '车站', 'The station is crowded.', '车站很拥挤。'],
  ['airport', '/ˈerpɔːrt/', 'n.', '机场', 'We meet at the airport.', '我们在机场见。'],
  ['kitchen', '/ˈkɪtʃɪn/', 'n.', '厨房', 'Mom is in the kitchen.', '妈妈在厨房。'],
  ['bedroom', '/ˈbedruːm/', 'n.', '卧室', 'My bedroom is small.', '我的卧室很小。'],
  ['bathroom', '/ˈbæθruːm/', 'n.', '浴室', 'The bathroom is upstairs.', '浴室在楼上。'],
  ['playground', '/ˈpleɪɡraʊnd/', 'n.', '操场', 'Children play on the playground.', '孩子们在操场上玩。'],
  ['cinema', '/ˈsɪnəmə/', 'n.', '电影院', 'We go to the cinema on Sundays.', '我们周日去看电影。'],
  ['museum', '/mjuˈziːəm/', 'n.', '博物馆', 'The museum opens at nine.', '博物馆九点开门。'],
]

/* ================= 初中 / 高中真题 ================= */

export const deckJuniorPast: Deck = {
  id: 'en-junior-past',
  lang: 'en',
  title: { zh: '中考真题高频', en: 'Zhongkao Past Papers' },
  level: 'A2',
  examTag: '中考',
  desc: { zh: '近五年中考阅读与完形里的高频词', en: 'High-frequency words from recent Zhongkao papers' },
  accent: 'rose',
  stage: 'junior',
  series: '真题',
  cover: { from: '#DCF2CA', to: '#9FD184', ink: '#2C571B', label: 'ZHONGKAO', big: '真题' },
}

const JUNIOR_PAST: Row[] = [
  ['beside', '/bɪˈsaɪd/', 'prep.', '在…旁边', 'She sits beside me.', '她坐在我旁边。'],
  ['beyond', '/bɪˈjɑːnd/', 'prep.', '超出；在那边', 'The village is beyond the river.', '村子在河的那边。'],
  ['cause', '/kɔːz/', 'n.', '原因', 'We found the cause of the fire.', '我们找到了火灾的原因。'],
  ['certain', '/ˈsɜːrtn/', 'adj.', '确定的', 'I am certain he will come.', '我确定他会来。'],
  ['chance', '/tʃæns/', 'n.', '机会', 'Give me one more chance.', '再给我一次机会。'],
  ['check', '/tʃek/', 'v.', '检查', 'Check your answers again.', '再检查一遍答案。'],
  ['clear', '/klɪr/', 'adj.', '清楚的', 'Her voice is clear.', '她的声音很清楚。'],
  ['common', '/ˈkɑːmən/', 'adj.', '常见的', 'This mistake is common.', '这个错误很常见。'],
  ['complete', '/kəmˈpliːt/', 'v.', '完成', 'Complete the form first.', '先填完表格。'],
  ['consider', '/kənˈsɪdər/', 'v.', '考虑', 'Please consider my advice.', '请考虑我的建议。'],
  ['continue', '/kənˈtɪnjuː/', 'v.', '继续', 'Continue reading, please.', '请继续读。'],
  ['create', '/kriˈeɪt/', 'v.', '创造', 'They created a small garden.', '他们造了个小花园。'],
  ['culture', '/ˈkʌltʃər/', 'n.', '文化', 'Chinese culture is rich.', '中国文化很丰富。'],
  ['dangerous', '/ˈdeɪndʒərəs/', 'adj.', '危险的', 'It is dangerous to swim here.', '在这里游泳很危险。'],
  ['discuss', '/dɪˈskʌs/', 'v.', '讨论', 'We discussed the plan.', '我们讨论了这个计划。'],
  ['dream', '/driːm/', 'n.', '梦想', 'Her dream is to travel.', '她的梦想是旅行。'],
  ['during', '/ˈdʊrɪŋ/', 'prep.', '在…期间', 'Do not talk during the film.', '看电影时别说话。'],
  ['education', '/ˌedʒuˈkeɪʃn/', 'n.', '教育', 'Education changes lives.', '教育改变人生。'],
  ['either', '/ˈiːðər/', 'pron.', '两者之一', 'Either answer is fine.', '两个答案都行。'],
  ['energy', '/ˈenərdʒi/', 'n.', '能量；精力', 'Kids have a lot of energy.', '孩子精力旺盛。'],
]

export const deckSeniorPast: Deck = {
  id: 'en-senior-past',
  lang: 'en',
  title: { zh: '高考真题高频', en: 'Gaokao Past Papers' },
  level: 'B1',
  examTag: '高考',
  desc: { zh: '高考阅读与七选五里的高频实词', en: 'Key content words from recent Gaokao reading tasks' },
  accent: 'violet',
  stage: 'senior',
  series: '真题',
  cover: { from: '#FFD2DD', to: '#F292AE', ink: '#87203F', label: 'GAOKAO', big: '真题' },
}

const SENIOR_PAST: Row[] = [
  ['acknowledge', '/əkˈnɑːlɪdʒ/', 'v.', '承认', 'He acknowledged the mistake.', '他承认了错误。'],
  ['annual', '/ˈænjuəl/', 'adj.', '每年的', 'The annual meeting is in May.', '年会在五月。'],
  ['failure', '/ˈfeɪljər/', 'n.', '失败', 'Failure teaches us a lot.', '失败教会我们很多。'],
  ['figure', '/ˈfɪɡjər/', 'n.', '数字；人物', 'Sales figures rose last year.', '去年销售额上升。'],
  ['focus', '/ˈfoʊkəs/', 'v.', '集中', 'Focus on one task at a time.', '一次专注一件事。'],
  ['formal', '/ˈfɔːrml/', 'adj.', '正式的', 'Wear formal clothes tonight.', '今晚穿正装。'],
  ['fortune', '/ˈfɔːrtʃən/', 'n.', '财富；运气', 'He made a fortune in trade.', '他靠做贸易发了财。'],
  ['gather', '/ˈɡæðər/', 'v.', '聚集', 'Students gathered in the hall.', '学生们聚集在大厅。'],
  ['generous', '/ˈdʒenərəs/', 'adj.', '慷慨的', 'She is generous with her time.', '她愿意花时间帮人。'],
  ['graduate', '/ˈɡrædʒuət/', 'v.', '毕业', 'He graduated last summer.', '他去年夏天毕业。'],
  ['grateful', '/ˈɡreɪtfl/', 'adj.', '感激的', 'I am grateful for your help.', '我感谢你的帮助。'],
  ['guidance', '/ˈɡaɪdns/', 'n.', '指导', 'Ask your teacher for guidance.', '向老师寻求指导。'],
  ['independent', '/ˌɪndɪˈpendənt/', 'adj.', '独立的', 'She became independent early.', '她很早就独立了。'],
  ['injure', '/ˈɪndʒər/', 'v.', '伤害', 'He injured his knee.', '他膝盖受伤了。'],
  ['inspire', '/ɪnˈspaɪər/', 'v.', '激励', 'Her story inspired many.', '她的经历激励了很多人。'],
  ['judge', '/dʒʌdʒ/', 'v.', '判断', 'Do not judge people by looks.', '不要以貌取人。'],
  ['lack', '/læk/', 'v.', '缺少', 'The plan lacks details.', '这个方案缺少细节。'],
  ['likely', '/ˈlaɪkli/', 'adj.', '可能的', 'Rain is likely tonight.', '今晚可能会下雨。'],
]

/* ================= 四级 / 六级 / 考研 专项 ================= */

export const deckCet4Listening: Deck = {
  id: 'en-cet4-listening',
  lang: 'en',
  title: { zh: '四级听力高频', en: 'CET-4 Listening' },
  level: 'B1',
  examTag: 'CET',
  desc: { zh: '听力对话与讲座里反复出现的场景词', en: 'Scene words that repeat in CET-4 listening' },
  accent: 'cyan',
  stage: 'cet4',
  series: '专项',
  cover: { from: '#C7E6F7', to: '#8FC7E8', ink: '#0F4C6B', label: 'CET-4', big: '听力' },
}

const CET4_LISTENING: Row[] = [
  ['conversation', '/ˌkɑːnvərˈseɪʃn/', 'n.', '对话', 'The conversation lasted an hour.', '对话持续了一小时。'],
  ['lecture', '/ˈlektʃər/', 'n.', '讲座', 'The lecture starts at ten.', '讲座十点开始。'],
  ['schedule', '/ˈskedʒuːl/', 'n.', '日程', 'My schedule is full today.', '我今天日程很满。'],
  ['register', '/ˈredʒɪstər/', 'v.', '注册', 'Register for the course online.', '在线注册课程。'],
  ['semester', '/sɪˈmestər/', 'n.', '学期', 'The new semester begins in March.', '新学期三月开始。'],
  ['assignment', '/əˈsaɪnmənt/', 'n.', '作业', 'The assignment is due Friday.', '作业周五截止。'],
  ['campus', '/ˈkæmpəs/', 'n.', '校园', 'The campus is quiet in summer.', '夏天校园很安静。'],
  ['dormitory', '/ˈdɔːrmətɔːri/', 'n.', '宿舍', 'He lives in a dormitory.', '他住在宿舍。'],
  ['cafeteria', '/ˌkæfəˈtɪriə/', 'n.', '食堂', 'We eat lunch in the cafeteria.', '我们在食堂吃午饭。'],
  ['professor', '/prəˈfesər/', 'n.', '教授', 'The professor answered every question.', '教授回答了每个问题。'],
  ['research', '/rɪˈsɜːrtʃ/', 'n.', '研究', 'Her research focuses on sleep.', '她的研究聚焦睡眠。'],
  ['survey', '/ˈsɜːrveɪ/', 'n.', '调查', 'The survey covered 200 students.', '调查覆盖 200 名学生。'],
  ['interview', '/ˈɪntərvjuː/', 'n.', '面试', 'He has an interview tomorrow.', '他明天有面试。'],
  ['presentation', '/ˌpriːzenˈteɪʃn/', 'n.', '展示', 'Her presentation was clear.', '她的展示很清楚。'],
  ['discussion', '/dɪˈskʌʃn/', 'n.', '讨论', 'We had a long discussion.', '我们讨论了很久。'],
  ['opinion', '/əˈpɪnjən/', 'n.', '意见', 'Share your opinion freely.', '畅所欲言。'],
  ['suggest', '/səˈdʒest/', 'v.', '建议', 'I suggest taking the bus.', '我建议坐公交。'],
  ['recommend', '/ˌrekəˈmend/', 'v.', '推荐', 'Can you recommend a book?', '你能推荐一本书吗？'],
]

export const deckCet6Writing: Deck = {
  id: 'en-cet6-writing',
  lang: 'en',
  title: { zh: '六级写作提分词', en: 'CET-6 Writing' },
  level: 'B2',
  examTag: 'CET',
  desc: { zh: '写作里拉开分差的连接词与态度词', en: 'Linking and stance words that lift your essay' },
  accent: 'amber',
  stage: 'cet6',
  series: '专项',
  cover: { from: '#FFE6B8', to: '#F2C46F', ink: '#7A4E0B', label: 'CET-6', big: '写作' },
}

const CET6_WRITING: Row[] = [
  ['moreover', '/mɔːrˈoʊvər/', 'adv.', '而且', 'Moreover, the cost is lower.', '而且成本更低。'],
  ['nevertheless', '/ˌnevərðəˈles/', 'adv.', '然而', 'It rained; nevertheless we went.', '下雨了，我们还是去了。'],
  ['furthermore', '/ˌfɜːrðərˈmɔːr/', 'adv.', '此外', 'Furthermore, the data are reliable.', '此外，数据是可靠的。'],
  ['consequently', '/ˈkɑːnsɪkwentli/', 'adv.', '因此', 'He was late; consequently he missed it.', '他迟到，因此错过了。'],
  ['therefore', '/ˈðerfɔːr/', 'adv.', '所以', 'The plan failed; therefore we changed it.', '计划失败，所以我们改了。'],
  ['whereas', '/ˌwerˈæz/', 'conj.', '而', 'Some agree, whereas others object.', '有人同意，有人反对。'],
  ['undoubtedly', '/ʌnˈdaʊtɪdli/', 'adv.', '无疑', 'This is undoubtedly the best choice.', '这无疑是最好的选择。'],
  ['increasingly', '/ɪnˈkriːsɪŋli/', 'adv.', '越来越', 'Cities are increasingly crowded.', '城市越来越拥挤。'],
  ['significant', '/sɪɡˈnɪfɪkənt/', 'adj.', '重要的；显著的', 'There is a significant difference.', '有显著差异。'],
  ['phenomenon', '/fəˈnɑːmɪnən/', 'n.', '现象', 'This is a social phenomenon.', '这是一种社会现象。'],
  ['tendency', '/ˈtendənsi/', 'n.', '倾向', 'There is a tendency to overwork.', '有过度工作的倾向。'],
  ['priority', '/praɪˈɔːrəti/', 'n.', '优先事项', 'Safety is our top priority.', '安全是我们的首要任务。'],
  ['substantial', '/səbˈstænʃl/', 'adj.', '大量的', 'They made substantial progress.', '他们取得了实质性进展。'],
  ['tremendous', '/trəˈmendəs/', 'adj.', '巨大的', 'The response was tremendous.', '反响巨大。'],
  ['beneficial', '/ˌbenɪˈfɪʃl/', 'adj.', '有益的', 'Exercise is beneficial to health.', '运动有益健康。'],
  ['perspective', '/pərˈspektɪv/', 'n.', '视角', 'Travel changes your perspective.', '旅行改变你的视角。'],
]

export const deckPostgradReading: Deck = {
  id: 'en-postgrad-reading',
  lang: 'en',
  title: { zh: '考研阅读逻辑词', en: 'Postgrad Reading' },
  level: 'B2',
  examTag: '考研',
  desc: { zh: '读懂长难句逻辑关系的副词与连接词', en: 'Adverbs that carry the logic in long sentences' },
  accent: 'violet',
  stage: 'postgrad',
  series: '专项',
  cover: { from: '#D6CDF7', to: '#A794EE', ink: '#38288A', label: 'POSTGRAD', big: '逻辑' },
}

const POSTGRAD_READING: Row[] = [
  ['thereby', '/ˌðerˈbaɪ/', 'adv.', '从而', 'He resigned, thereby avoiding charges.', '他辞职，从而避免了指控。'],
  ['hence', '/hens/', 'adv.', '因此', 'The road is closed; hence the delay.', '路封了，因此延误。'],
  ['thus', '/ðʌs/', 'adv.', '因此', 'Thus the theory was proved.', '该理论由此得到证明。'],
  ['conversely', '/ˈkɑːnvɜːrsli/', 'adv.', '相反地', 'Conversely, costs may fall.', '相反，成本可能下降。'],
  ['accordingly', '/əˈkɔːrdɪŋli/', 'adv.', '相应地', 'Prices were adjusted accordingly.', '价格相应调整。'],
  ['alternatively', '/ɔːlˈtɜːrnətɪvli/', 'adv.', '或者', 'Alternatively, we could wait.', '或者我们可以等。'],
  ['presumably', '/prɪˈzuːməbli/', 'adv.', '大概', 'Presumably he knows the answer.', '他大概知道答案。'],
  ['arguably', '/ˈɑːrɡjuəbli/', 'adv.', '可以说', 'It is arguably the best solution.', '这可以说是最好的方案。'],
  ['notably', '/ˈnoʊtəbli/', 'adv.', '尤其', 'Several cities, notably Shanghai, grew fast.', '几个城市，尤其是上海，发展很快。'],
  ['largely', '/ˈlɑːrdʒli/', 'adv.', '主要地', 'The result is largely due to luck.', '结果主要靠运气。'],
  ['merely', '/ˈmɪrli/', 'adv.', '仅仅', 'He merely repeated the question.', '他只是重复了问题。'],
  ['solely', '/ˈsoʊlli/', 'adv.', '仅仅；唯一地', 'Success is not solely about talent.', '成功不只靠天赋。'],
  ['roughly', '/ˈrʌfli/', 'adv.', '大约', 'Roughly half agreed.', '大约一半人同意。'],
  ['virtually', '/ˈvɜːrtʃuəli/', 'adv.', '几乎', 'The work is virtually finished.', '工作几乎完成。'],
  ['considerably', '/kənˈsɪdərəbli/', 'adv.', '相当地', 'Costs fell considerably.', '成本大幅下降。'],
  ['ultimately', '/ˈʌltɪmətli/', 'adv.', '最终', 'Ultimately, readers decide.', '最终由读者决定。'],
]

/* ================= 留学 ================= */

export const deckToefl: Deck = {
  id: 'en-toefl',
  lang: 'en',
  title: { zh: '托福核心词', en: 'TOEFL Core' },
  level: 'B2 - C1',
  examTag: 'TOEFL',
  desc: { zh: '学术阅读与听力的高频抽象词', en: 'Abstract academic words for TOEFL reading and listening' },
  accent: 'cyan',
  stage: 'abroad',
  series: '托福',
  cover: { from: '#BFE0F5', to: '#7FB6E8', ink: '#123E6B', label: 'TOEFL', big: '托福' },
}

const TOEFL: Row[] = [
  ['accelerate', '/əkˈseləreɪt/', 'v.', '加速', 'The car accelerated smoothly.', '车子平稳加速。'],
  ['perennial', '/pəˈreniəl/', 'adj.', '长期存在的；多年生的', 'Traffic is a perennial problem here.', '交通拥堵在这里是长期问题。'],
  ['aggregate', '/ˈæɡrɪɡət/', 'n.', '总计', 'The aggregate score was high.', '总分很高。'],
  ['anomaly', '/əˈnɑːməli/', 'n.', '异常', 'The data show one anomaly.', '数据中有一处异常。'],
  ['apparatus', '/ˌæpəˈrætəs/', 'n.', '设备；装置', 'The apparatus measures pressure.', '这个装置测量压力。'],
  ['bulk', '/bʌlk/', 'n.', '大部分', 'The bulk of the cost is labor.', '大部分成本是人力。'],
  ['cluster', '/ˈklʌstər/', 'n.', '群；簇', 'A cluster of stars appeared.', '出现了一簇星星。'],
  ['component', '/kəmˈpoʊnənt/', 'n.', '组成部分', 'Each component was tested.', '每个部件都测试过。'],
  ['compress', '/kəmˈpres/', 'v.', '压缩', 'The machine compresses the gas.', '这台机器压缩气体。'],
  ['concurrent', '/kənˈkɜːrənt/', 'adj.', '同时发生的', 'Two events were concurrent.', '两件事同时发生。'],
  ['converge', '/kənˈvɜːrdʒ/', 'v.', '汇聚', 'The rivers converge near the city.', '河流在城市附近汇合。'],
  ['correlate', '/ˈkɔːrəleɪt/', 'v.', '相关联', 'Height correlates with weight.', '身高与体重相关。'],
  ['deplete', '/dɪˈpliːt/', 'v.', '耗尽', 'Overfishing depletes the stock.', '过度捕捞耗尽鱼群。'],
  ['diffuse', '/dɪˈfjuːz/', 'v.', '扩散', 'The gas diffused quickly.', '气体迅速扩散。'],
  ['discrete', '/dɪˈskriːt/', 'adj.', '离散的', 'The process has discrete stages.', '这个过程有分立阶段。'],
  ['embed', '/ɪmˈbed/', 'v.', '嵌入', 'The sensors are embedded in rock.', '传感器嵌在岩石里。'],
  ['equilibrium', '/ˌiːkwɪˈlɪbriəm/', 'n.', '平衡', 'The system reached equilibrium.', '系统达到平衡。'],
  ['hybrid', '/ˈhaɪbrɪd/', 'n.', '混合体', 'The design is a hybrid of two styles.', '这个设计是两种风格的混合。'],
]

/* ================= 英专 ================= */

export const deckTem4: Deck = {
  id: 'en-tem4',
  lang: 'en',
  title: { zh: '专四核心词', en: 'TEM-4 Core' },
  level: 'B2',
  examTag: 'TEM-4',
  desc: { zh: '英语专业四级高频词，含常用搭配', en: 'Core vocabulary for TEM-4 with common collocations' },
  accent: 'rose',
  stage: 'major',
  series: '专四',
  cover: { from: '#FFD9DF', to: '#F7A9B8', ink: '#8C2340', label: 'TEM-4', big: '专四' },
}

const TEM4: Row[] = [
  ['acquaint', '/əˈkweɪnt/', 'v.', '使熟悉', 'Please acquaint yourself with the rules.', '请熟悉一下规则。'],
  ['adjourn', '/əˈdʒɜːrn/', 'v.', '休会', 'The meeting was adjourned till Monday.', '会议休会到下周一。'],
  ['affluent', '/ˈæfluənt/', 'adj.', '富裕的', 'They live in an affluent district.', '他们住在富裕的街区。'],
  ['alliance', '/əˈlaɪəns/', 'n.', '联盟', 'The two firms formed an alliance.', '两家公司结成了联盟。'],
  ['bargain', '/ˈbɑːrɡɪn/', 'n.', '便宜货', 'This coat is a real bargain.', '这件外套真便宜。'],
  ['betray', '/bɪˈtreɪ/', 'v.', '背叛', 'He betrayed his friend.', '他背叛了朋友。'],
  ['casual', '/ˈkæʒuəl/', 'adj.', '随意的', 'Dress is casual here.', '这里穿着随意。'],
  ['cease', '/siːs/', 'v.', '停止', 'The noise ceased at midnight.', '午夜噪音停了。'],
  ['cherish', '/ˈtʃerɪʃ/', 'v.', '珍惜', 'I cherish these memories.', '我珍惜这些回忆。'],
  ['compel', '/kəmˈpel/', 'v.', '迫使', 'Rain compelled us to stay.', '下雨迫使我们留下。'],
  ['conscience', '/ˈkɑːnʃəns/', 'n.', '良心', 'His conscience troubled him.', '他的良心不安。'],
  ['counsel', '/ˈkaʊnsl/', 'n.', '建议；忠告', 'She sought counsel from an expert.', '她向专家求教。'],
  ['customary', '/ˈkʌstəmeri/', 'adj.', '惯常的', 'It is customary to tip here.', '这里习惯给小费。'],
  ['decay', '/dɪˈkeɪ/', 'v.', '腐烂', 'The fruit decayed in the heat.', '水果在高温下腐烂了。'],
  ['deceive', '/dɪˈsiːv/', 'v.', '欺骗', 'Do not let the label deceive you.', '别被标签骗了。'],
  ['decent', '/ˈdiːsnt/', 'adj.', '体面的', 'He earns a decent salary.', '他薪水还不错。'],
  ['defy', '/dɪˈfaɪ/', 'v.', '违抗', 'They defied the old rules.', '他们违抗了旧规矩。'],
  ['depth', '/depθ/', 'n.', '深度', 'The lake has great depth.', '这个湖很深。'],
]

export const deckTem8: Deck = {
  id: 'en-tem8',
  lang: 'en',
  title: { zh: '专八进阶词', en: 'TEM-8 Advanced' },
  level: 'C1',
  examTag: 'TEM-8',
  desc: { zh: '专八与考研长难句里的高阶词', en: 'Advanced words for TEM-8 and dense reading passages' },
  accent: 'amber',
  stage: 'major',
  series: '专八',
  cover: { from: '#F3D8B8', to: '#D9A97A', ink: '#6B3E12', label: 'TEM-8', big: '专八' },
}

const TEM8: Row[] = [
  ['abstain', '/əbˈsteɪn/', 'v.', '戒除；弃权', 'He abstained from voting.', '他投了弃权票。'],
  ['adversary', '/ˈædvərseri/', 'n.', '对手', 'She faced a worthy adversary.', '她遇到了一个可敬的对手。'],
  ['agile', '/ˈædʒl/', 'adj.', '敏捷的', 'The team is agile and quick.', '这个团队敏捷高效。'],
  ['aloof', '/əˈluːf/', 'adj.', '冷漠的；超然的', 'He remained aloof from the debate.', '他对争论保持超然。'],
  ['ambivalent', '/æmˈbɪvələnt/', 'adj.', '矛盾的', 'She felt ambivalent about moving.', '她对搬家心情矛盾。'],
  ['aptitude', '/ˈæptɪtuːd/', 'n.', '天资', 'He shows an aptitude for maths.', '他显示出数学天赋。'],
  ['archaic', '/ɑːrˈkeɪɪk/', 'adj.', '过时的', 'The rule seems archaic now.', '这条规定现在显得过时。'],
  ['arduous', '/ˈɑːrdʒuəs/', 'adj.', '艰巨的', 'It was an arduous journey.', '那是一段艰苦的旅程。'],
  ['ascertain', '/ˌæsərˈteɪn/', 'v.', '查明', 'We must ascertain the facts.', '我们必须查明事实。'],
  ['austere', '/ɔːˈstɪr/', 'adj.', '简朴的', 'They live an austere life.', '他们生活简朴。'],
  ['benign', '/bɪˈnaɪn/', 'adj.', '良性的；温和的', 'The growth was benign.', '这个肿块是良性的。'],
  ['candid', '/ˈkændɪd/', 'adj.', '坦率的', 'She gave a candid answer.', '她回答得很坦率。'],
  ['catalyst', '/ˈkætəlɪst/', 'n.', '催化剂', 'The report was a catalyst for change.', '报告成为变革的催化剂。'],
  ['cumbersome', '/ˈkʌmbərsəm/', 'adj.', '笨重的；繁琐的', 'The process is slow and cumbersome.', '流程又慢又繁琐。'],
  ['deem', '/diːm/', 'v.', '认为', 'The plan was deemed risky.', '这个方案被认为有风险。'],
  ['diligent', '/ˈdɪlɪdʒənt/', 'adj.', '勤奋的', 'She is a diligent student.', '她是个勤奋的学生。'],
  ['enigma', '/ɪˈnɪɡmə/', 'n.', '谜', 'His motives remain an enigma.', '他的动机仍是个谜。'],
  ['foremost', '/ˈfɔːrmoʊst/', 'adj.', '首要的', 'He is the foremost expert here.', '他是这里最权威的专家。'],
]

export const extraDecks: Deck[] = [
  deckPhonicsCvc,
  deckPhonicsMagic,
  deckPhonicsBlend,
  deckPrimaryCore,
  deckPrimaryScene,
  deckJuniorPast,
  deckSeniorPast,
  deckCet4Listening,
  deckCet6Writing,
  deckPostgradReading,
  deckToefl,
  deckTem4,
  deckTem8,
]

export const extraWords: Word[] = [
  ...build(CVC, deckPhonicsCvc),
  ...build(MAGIC, deckPhonicsMagic),
  ...build(BLEND, deckPhonicsBlend),
  ...build(PRIMARY_CORE, deckPrimaryCore),
  ...build(PRIMARY_SCENE, deckPrimaryScene),
  ...build(JUNIOR_PAST, deckJuniorPast),
  ...build(SENIOR_PAST, deckSeniorPast),
  ...build(CET4_LISTENING, deckCet4Listening),
  ...build(CET6_WRITING, deckCet6Writing),
  ...build(POSTGRAD_READING, deckPostgradReading),
  ...build(TOEFL, deckToefl),
  ...build(TEM4, deckTem4),
  ...build(TEM8, deckTem8),
]
