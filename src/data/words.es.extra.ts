import type { Word } from './types'

/**
 * 西班牙语 A1 / A2 补充词表。
 *
 * 西语没有像四六级那样公开的官方大纲文件，所以这份是手写的常用词表：
 * 按主题（问候、数字、时间、身体、饮食、家居、地点、交通、动作、形容、颜色、连接）
 * 覆盖 DELE A1/A2 的日常交流场景。词条只收「词 + 词性 + 释义」，
 * 例句留给首页速查和拼写工坊去练。
 */

type Row = [string, string, string]

const A1: Row[] = [
  // 问候与礼貌
  ['hola', '你好', 'int.'], ['adiós', '再见', 'int.'], ['señor', '先生', 'm.'], ['señora', '女士；夫人', 'f.'],
  ['perdón', '对不起；抱歉', 'm.'], ['disculpe', '劳驾；对不起', 'int.'], ['bienvenido', '欢迎', 'adj.'],
  ['hasta', '直到', 'prep.'], ['luego', '之后；然后', 'adv.'], ['pronto', '很快；不久', 'adv.'],
  ['gracias', '谢谢', 'f.pl.'], ['noche', '夜晚', 'f.'], ['día', '白天；日子', 'm.'], ['tarde', '下午；晚', 'f.'],

  // 数字
  ['uno', '一', 'num.'], ['dos', '二', 'num.'], ['tres', '三', 'num.'], ['cuatro', '四', 'num.'],
  ['cinco', '五', 'num.'], ['seis', '六', 'num.'], ['siete', '七', 'num.'], ['ocho', '八', 'num.'],
  ['nueve', '九', 'num.'], ['diez', '十', 'num.'], ['once', '十一', 'num.'], ['doce', '十二', 'num.'],
  ['veinte', '二十', 'num.'], ['cien', '一百', 'num.'], ['mil', '一千', 'num.'], ['primero', '第一；首先', 'adj.'],

  // 时间
  ['hoy', '今天', 'adv.'], ['ayer', '昨天', 'adv.'], ['ahora', '现在', 'adv.'], ['hora', '小时；时刻', 'f.'],
  ['minuto', '分钟', 'm.'], ['semana', '星期；周', 'f.'], ['mes', '月', 'm.'], ['año', '年', 'm.'],
  ['lunes', '星期一', 'm.'], ['martes', '星期二', 'm.'], ['miércoles', '星期三', 'm.'], ['jueves', '星期四', 'm.'],
  ['viernes', '星期五', 'm.'], ['sábado', '星期六', 'm.'], ['domingo', '星期日', 'm.'],
  ['invierno', '冬天', 'm.'], ['verano', '夏天', 'm.'], ['primavera', '春天', 'f.'], ['otoño', '秋天', 'm.'],

  // 人与家庭
  ['hombre', '男人', 'm.'], ['mujer', '女人', 'f.'], ['niño', '男孩；孩子', 'm.'], ['niña', '女孩', 'f.'],
  ['hermano', '兄弟', 'm.'], ['hermana', '姐妹', 'f.'], ['abuelo', '祖父；外祖父', 'm.'], ['abuela', '祖母；外祖母', 'f.'],
  ['esposo', '丈夫', 'm.'], ['esposa', '妻子', 'f.'], ['gente', '人们', 'f.'], ['persona', '人', 'f.'],
  ['profesor', '老师', 'm.'], ['estudiante', '学生', 'm./f.'], ['médico', '医生', 'm.'], ['policía', '警察', 'm./f.'],
  ['camarero', '服务员', 'm.'], ['jefe', '老板；上司', 'm.'],

  // 身体
  ['cabeza', '头', 'f.'], ['mano', '手', 'f.'], ['ojo', '眼睛', 'm.'], ['boca', '嘴', 'f.'],
  ['pie', '脚', 'm.'], ['brazo', '手臂', 'm.'], ['pierna', '腿', 'f.'], ['pelo', '头发', 'm.'],
  ['cara', '脸', 'f.'], ['oreja', '耳朵', 'f.'], ['nariz', '鼻子', 'f.'], ['diente', '牙齿', 'm.'],

  // 饮食
  ['pan', '面包', 'm.'], ['leche', '牛奶', 'f.'], ['café', '咖啡', 'm.'], ['té', '茶', 'm.'],
  ['vino', '葡萄酒', 'm.'], ['carne', '肉', 'f.'], ['pescado', '鱼（食物）', 'm.'], ['fruta', '水果', 'f.'],
  ['manzana', '苹果', 'f.'], ['naranja', '橙子', 'f.'], ['plátano', '香蕉', 'm.'], ['huevo', '鸡蛋', 'm.'],
  ['arroz', '米饭', 'm.'], ['queso', '奶酪', 'm.'], ['sal', '盐', 'f.'], ['azúcar', '糖', 'm.'],
  ['sopa', '汤', 'f.'], ['ensalada', '沙拉', 'f.'], ['postre', '甜点', 'm.'], ['desayuno', '早餐', 'm.'],
  ['almuerzo', '午餐', 'm.'], ['cena', '晚餐', 'f.'], ['verdura', '蔬菜', 'f.'], ['aceite', '油', 'm.'],

  // 家居与物品
  ['ropa', '衣服', 'f.'], ['camisa', '衬衫', 'f.'], ['zapato', '鞋', 'm.'], ['sombrero', '帽子', 'm.'],
  ['bolso', '包', 'm.'], ['llave', '钥匙', 'f.'], ['teléfono', '电话', 'm.'], ['papel', '纸', 'm.'],
  ['lápiz', '铅笔', 'm.'], ['cuaderno', '笔记本', 'm.'], ['ordenador', '电脑', 'm.'], ['cama', '床', 'f.'],
  ['baño', '浴室；厕所', 'm.'], ['cocina', '厨房', 'f.'], ['salón', '客厅', 'm.'], ['jardín', '花园', 'm.'],
  ['piso', '公寓；楼层', 'm.'], ['espejo', '镜子', 'm.'], ['reloj', '钟表', 'm.'], ['vaso', '杯子', 'm.'],
  ['plato', '盘子；菜', 'm.'], ['cuchillo', '刀', 'm.'], ['tenedor', '叉子', 'm.'], ['cuchara', '勺子', 'f.'],

  // 地点
  ['plaza', '广场', 'f.'], ['parque', '公园', 'm.'], ['mercado', '市场', 'm.'], ['restaurante', '餐馆', 'm.'],
  ['hotel', '旅馆', 'm.'], ['hospital', '医院', 'm.'], ['banco', '银行；长椅', 'm.'], ['oficina', '办公室', 'f.'],
  ['estación', '车站', 'f.'], ['aeropuerto', '机场', 'm.'], ['museo', '博物馆', 'm.'], ['iglesia', '教堂', 'f.'],
  ['biblioteca', '图书馆', 'f.'], ['supermercado', '超市', 'm.'], ['centro', '中心；市中心', 'm.'], ['barrio', '街区', 'm.'],
  ['país', '国家', 'm.'], ['campo', '田野；乡村', 'm.'], ['mar', '海', 'm.'], ['río', '河', 'm.'],
  ['montaña', '山', 'f.'], ['árbol', '树', 'm.'], ['flor', '花', 'f.'], ['animal', '动物', 'm.'],
  ['perro', '狗', 'm.'], ['gato', '猫', 'm.'], ['pájaro', '鸟', 'm.'],

  // 交通
  ['tren', '火车', 'm.'], ['autobús', '公共汽车', 'm.'], ['avión', '飞机', 'm.'], ['bicicleta', '自行车', 'f.'],
  ['barco', '船', 'm.'], ['billete', '票', 'm.'], ['viaje', '旅行', 'm.'], ['maleta', '行李箱', 'f.'],

  // 动作
  ['ir', '去', 'v.'], ['venir', '来', 'v.'], ['tener', '有', 'v.'], ['hacer', '做', 'v.'],
  ['decir', '说', 'v.'], ['ver', '看见', 'v.'], ['oír', '听见', 'v.'], ['saber', '知道（事实）', 'v.'],
  ['conocer', '认识（人/地方）', 'v.'], ['querer', '想要；爱', 'v.'], ['poder', '能够', 'v.'], ['deber', '应该；欠', 'v.'],
  ['poner', '放；穿上', 'v.'], ['salir', '出去', 'v.'], ['llegar', '到达', 'v.'], ['llevar', '携带；穿', 'v.'],
  ['traer', '带来', 'v.'], ['dar', '给', 'v.'], ['tomar', '拿；喝；乘坐', 'v.'], ['pagar', '支付', 'v.'],
  ['comprar', '买', 'v.'], ['vender', '卖', 'v.'], ['abrir', '打开', 'v.'], ['cerrar', '关闭', 'v.'],
  ['empezar', '开始', 'v.'], ['terminar', '结束', 'v.'], ['esperar', '等待；希望', 'v.'], ['buscar', '寻找', 'v.'],
  ['encontrar', '找到；遇见', 'v.'], ['ayudar', '帮助', 'v.'], ['preguntar', '提问', 'v.'], ['responder', '回答', 'v.'],
  ['escribir', '写', 'v.'], ['leer', '读', 'v.'], ['escuchar', '听', 'v.'], ['caminar', '走路', 'v.'],
  ['correr', '跑', 'v.'], ['dormir', '睡觉', 'v.'], ['despertar', '醒来', 'v.'], ['levantarse', '起床', 'v.'],
  ['sentarse', '坐下', 'v.'], ['jugar', '玩；比赛', 'v.'], ['cantar', '唱歌', 'v.'], ['bailar', '跳舞', 'v.'],
  ['cocinar', '做饭', 'v.'], ['limpiar', '打扫', 'v.'], ['usar', '使用', 'v.'], ['necesitar', '需要', 'v.'],
  ['gustar', '使喜欢', 'v.'], ['pensar', '想；思考', 'v.'], ['entender', '理解', 'v.'], ['sentir', '感觉', 'v.'],
  ['mirar', '看；注视', 'v.'], ['viajar', '旅行', 'v.'], ['volver', '返回', 'v.'], ['seguir', '继续；跟随', 'v.'],
  ['dejar', '留下；让', 'v.'], ['nacer', '出生', 'v.'], ['morir', '死', 'v.'], ['abrir', '开', 'v.'],

  // 形容
  ['alto', '高的；响的', 'adj.'], ['bajo', '低的；矮的', 'adj.'], ['largo', '长的', 'adj.'], ['corto', '短的', 'adj.'],
  ['gordo', '胖的', 'adj.'], ['delgado', '瘦的', 'adj.'], ['joven', '年轻的', 'adj.'], ['viejo', '老的；旧的', 'adj.'],
  ['rico', '有钱的；好吃的', 'adj.'], ['pobre', '穷的', 'adj.'], ['rápido', '快的', 'adj.'], ['lento', '慢的', 'adj.'],
  ['caliente', '热的', 'adj.'], ['frío', '冷的', 'adj.'], ['limpio', '干净的', 'adj.'], ['sucio', '脏的', 'adj.'],
  ['lleno', '满的', 'adj.'], ['vacío', '空的', 'adj.'], ['abierto', '开着的', 'adj.'], ['cerrado', '关着的', 'adj.'],
  ['mismo', '同样的', 'adj.'], ['otro', '另一个', 'adj.'], ['mucho', '很多', 'adj.'], ['poco', '很少', 'adj.'],
  ['todo', '全部', 'adj.'], ['nada', '什么都没有', 'pron.'], ['alguno', '某个；一些', 'adj.'],

  // 颜色
  ['rojo', '红色', 'adj.'], ['azul', '蓝色', 'adj.'], ['verde', '绿色', 'adj.'], ['amarillo', '黄色', 'adj.'],
  ['negro', '黑色', 'adj.'], ['blanco', '白色', 'adj.'], ['gris', '灰色', 'adj.'], ['marrón', '棕色', 'adj.'],
  ['rosa', '粉色；玫瑰', 'adj.'], ['morado', '紫色', 'adj.'],

  // 副词与连接
  ['muy', '很；非常', 'adv.'], ['más', '更多', 'adv.'], ['menos', '更少', 'adv.'], ['también', '也', 'adv.'],
  ['sí', '是；对', 'adv.'], ['aquí', '这里', 'adv.'], ['allí', '那里', 'adv.'], ['bien', '好', 'adv.'],
  ['mal', '不好', 'adv.'], ['así', '这样', 'adv.'], ['porque', '因为', 'conj.'], ['pero', '但是', 'conj.'],
  ['cuando', '当…时', 'conj.'], ['donde', '哪里', 'adv.'], ['como', '像；作为', 'prep.'], ['si', '如果', 'conj.'],
  ['ya', '已经', 'adv.'], ['después', '之后', 'adv.'], ['antes', '之前', 'adv.'], ['con', '和；带着', 'prep.'],
  ['sin', '没有', 'prep.'], ['para', '为了；给', 'prep.'], ['por', '通过；因为', 'prep.'], ['sobre', '在…上面；关于', 'prep.'],
  ['entre', '在…之间', 'prep.'], ['desde', '从', 'prep.'], ['hasta', '直到', 'prep.'], ['según', '根据', 'prep.'],
]

const A2: Row[] = [
  // 动作
  ['conseguir', '获得；办到', 'v.'], ['explicar', '解释', 'v.'], ['describir', '描述', 'v.'], ['decidir', '决定', 'v.'],
  ['elegir', '选择', 'v.'], ['preferir', '更喜欢', 'v.'], ['cambiar', '改变；交换', 'v.'], ['intentar', '尝试', 'v.'],
  ['evitar', '避免', 'v.'], ['permitir', '允许', 'v.'], ['prohibir', '禁止', 'v.'], ['ofrecer', '提供', 'v.'],
  ['aceptar', '接受', 'v.'], ['rechazar', '拒绝', 'v.'], ['invitar', '邀请', 'v.'], ['presentar', '介绍；呈现', 'v.'],
  ['contar', '讲述；数', 'v.'], ['mostrar', '展示', 'v.'], ['parecer', '看起来像；觉得', 'v.'], ['ocurrir', '发生', 'v.'],
  ['pasar', '经过；发生', 'v.'], ['quedar', '留下；约定', 'v.'], ['subir', '上去；提高', 'v.'], ['bajar', '下去；降低', 'v.'],
  ['entrar', '进入', 'v.'], ['sacar', '取出；取得', 'v.'], ['meter', '放入', 'v.'], ['continuar', '继续', 'v.'],
  ['comenzar', '开始', 'v.'], ['preparar', '准备', 'v.'], ['organizar', '组织', 'v.'], ['participar', '参加', 'v.'],
  ['discutir', '讨论；争吵', 'v.'], ['creer', '相信；认为', 'v.'], ['dudar', '怀疑', 'v.'], ['suponer', '假设；猜想', 'v.'],
  ['imaginar', '想象', 'v.'], ['aprender', '学习', 'v.'], ['enseñar', '教；展示', 'v.'], ['practicar', '练习', 'v.'],
  ['recordar', '记得', 'v.'], ['olvidar', '忘记', 'v.'], ['mejorar', '改善', 'v.'], ['cuidar', '照顾', 'v.'],
  ['descansar', '休息', 'v.'], ['disfrutar', '享受', 'v.'], ['molestar', '打扰；使不快', 'v.'], ['preocuparse', '担心', 'v.'],
  ['alegrarse', '高兴', 'v.'], ['enfadarse', '生气', 'v.'], ['casarse', '结婚', 'v.'], ['mudarse', '搬家', 'v.'],

  // 名词
  ['experiencia', '经验', 'f.'], ['oportunidad', '机会', 'f.'], ['problema', '问题', 'm.'], ['solución', '解决办法', 'f.'],
  ['razón', '理由；理智', 'f.'], ['idea', '主意；想法', 'f.'], ['opinión', '意见', 'f.'], ['decisión', '决定', 'f.'],
  ['pregunta', '问题（提问）', 'f.'], ['respuesta', '回答', 'f.'], ['ejemplo', '例子', 'm.'], ['explicación', '解释', 'f.'],
  ['diferencia', '差别', 'f.'], ['relación', '关系', 'f.'], ['situación', '情况', 'f.'], ['condición', '条件', 'f.'],
  ['posibilidad', '可能性', 'f.'], ['necesidad', '需要', 'f.'], ['importancia', '重要性', 'f.'], ['interés', '兴趣；利益', 'm.'],
  ['atención', '注意力', 'f.'], ['confianza', '信任', 'f.'], ['paciencia', '耐心', 'f.'], ['esfuerzo', '努力', 'm.'],
  ['resultado', '结果', 'm.'], ['cambio', '变化', 'm.'], ['desarrollo', '发展', 'm.'], ['medio', '手段；一半；环境', 'm.'],
  ['ambiente', '环境；气氛', 'm.'], ['cultura', '文化', 'f.'], ['sociedad', '社会', 'f.'], ['política', '政治；政策', 'f.'],
  ['economía', '经济', 'f.'], ['educación', '教育', 'f.'], ['tecnología', '技术', 'f.'], ['comunicación', '交流', 'f.'],
  ['información', '信息', 'f.'], ['noticia', '新闻', 'f.'], ['mensaje', '消息', 'm.'], ['correo', '邮件', 'm.'],
  ['internet', '互联网', 'm.'], ['pantalla', '屏幕', 'f.'], ['aplicación', '应用；应用程序', 'f.'], ['archivo', '文件', 'm.'],
  ['empresa', '公司', 'f.'], ['reunión', '会议', 'f.'], ['proyecto', '项目', 'm.'], ['cliente', '客户', 'm.'],
  ['precio', '价格', 'm.'], ['descuento', '折扣', 'm.'], ['factura', '发票', 'f.'], ['contrato', '合同', 'm.'],

  // 形容词
  ['importante', '重要的', 'adj.'], ['necesario', '必要的', 'adj.'], ['posible', '可能的', 'adj.'], ['imposible', '不可能的', 'adj.'],
  ['interesante', '有趣的', 'adj.'], ['aburrido', '无聊的', 'adj.'], ['divertido', '好玩的', 'adj.'], ['peligroso', '危险的', 'adj.'],
  ['seguro', '安全的；确定的', 'adj.'], ['extraño', '奇怪的', 'adj.'], ['normal', '正常的', 'adj.'], ['especial', '特别的', 'adj.'],
  ['común', '常见的；共同的', 'adj.'], ['diferente', '不同的', 'adj.'], ['parecido', '相似的', 'adj.'], ['conocido', '有名的；认识的', 'adj.'],
  ['famoso', '著名的', 'adj.'], ['moderno', '现代的', 'adj.'], ['antiguo', '古老的；以前的', 'adj.'], ['actual', '当前的', 'adj.'],
  ['reciente', '最近的', 'adj.'], ['futuro', '未来的', 'adj.'], ['pasado', '过去的', 'adj.'], ['público', '公共的', 'adj.'],
  ['privado', '私人的', 'adj.'], ['personal', '个人的', 'adj.'], ['profesional', '专业的', 'adj.'], ['social', '社会的', 'adj.'],
  ['económico', '经济的；便宜的', 'adj.'], ['cultural', '文化的', 'adj.'], ['físico', '身体的；物理的', 'adj.'], ['mental', '心理的', 'adj.'],
  ['emocional', '情感的', 'adj.'], ['libre', '自由的；空闲的', 'adj.'], ['ocupado', '忙的；被占用的', 'adj.'], ['listo', '准备好的；聪明的', 'adj.'],

  // 副词与连接
  ['quizá', '也许', 'adv.'], ['incluso', '甚至', 'adv.'], ['especialmente', '尤其', 'adv.'], ['realmente', '确实；真正地', 'adv.'],
  ['finalmente', '最后', 'adv.'], ['normalmente', '通常', 'adv.'], ['generalmente', '一般地', 'adv.'], ['probablemente', '可能', 'adv.'],
  ['seguramente', '肯定；大概', 'adv.'], ['completamente', '完全地', 'adv.'], ['bastante', '相当；足够', 'adv.'], ['demasiado', '太；过多', 'adv.'],
  ['suficiente', '足够的', 'adj.'], ['apenas', '几乎不', 'adv.'], ['simplemente', '只是；简单地', 'adv.'], ['además', '此外', 'adv.'],
  ['entonces', '那么；当时', 'adv.'], ['mientras', '当…时；与此同时', 'conj.'], ['aunque', '虽然', 'conj.'], ['sin embargo', '然而', 'conj.'],
  ['por eso', '因此', 'conj.'], ['por ejemplo', '例如', 'conj.'], ['en cambio', '相反', 'conj.'], ['de repente', '突然', 'adv.'],
  ['casi', '几乎', 'adv.'], ['todavía', '仍然', 'adv.'], ['temprano', '早', 'adv.'], ['lejos', '远', 'adv.'],
  ['cerca', '近', 'adv.'], ['barato', '便宜的', 'adj.'], ['caro', '贵的', 'adj.'], ['agradable', '令人愉快的', 'adj.'],
]

function build(rows: Row[], deckId: string): Word[] {
  return rows.map((r, i) => ({
    id: `${deckId}-${i}`,
    lang: 'es' as const,
    deckId,
    lemma: r[0],
    pos: r[2],
    zh: r[1],
    example: '',
    exampleZh: '',
    freq: i,
  }))
}

export const wordsEsA1Extra: Word[] = build(A1, 'es-a1')
export const wordsEsA2Extra: Word[] = build(A2, 'es-a2')
