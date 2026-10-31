/**
 * 仅给构建脚本用的聚合入口。
 * 这些数据文件里的词条本身已由 scripts/gen-corpus.mjs 抽取例句合并进 public/corpus.json，
 * 所以运行时不引用本文件（Vite 不会把它打进产物）。
 */
import { wordsEnCET4, wordsEnCET4Past, wordsEnCET6, wordsEnCET6Past, wordsEnIELTS, wordsEnJunior, wordsEnPostgrad, wordsEnPostgradPast, wordsEnSenior } from './words.en'
import { extraWords } from './words.extra'
import { extraWords2 } from './words.extra2'
import { wordsJaN5 } from './words.ja'
import { wordsEsA1 } from './words.es'
import { wordsEsA1Extra, wordsEsA2Extra } from './words.es.extra'
import type { Word } from './types'

export const LEGACY_WORDS: Word[] = [
  ...extraWords,
  ...extraWords2,
  ...wordsEnJunior,
  ...wordsEnSenior,
  ...wordsEnCET4,
  ...wordsEnCET4Past,
  ...wordsEnCET6,
  ...wordsEnCET6Past,
  ...wordsEnPostgrad,
  ...wordsEnPostgradPast,
  ...wordsEnIELTS,
  ...wordsJaN5,
  ...wordsEsA1,
  ...wordsEsA1Extra,
  ...wordsEsA2Extra,
]
