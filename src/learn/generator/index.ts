import type { ActBundle, Article } from '../../types'
import type { BankStats, Question, QuestionBank, QuestionOption, Stage } from '../model'
import { shuffle, slug } from '../text'
import type { Draft, Rejection } from './draft'
import { extractCurated } from './curated'
import { extractDeadlines } from './deadlines'
import { extractDefinitions } from './definitions'
import { extractDutyRight } from './duty-right'
import { extractEnumerations } from './enumerations'
import { extractExceptions } from './exceptions'
import { buildCorpus, isLiveArticle, type Corpus } from './units'
import { validateAll, type Problem } from './validate'
import { extractWhichArticle } from './which-article'

export { validateDraft, validateAll } from './validate'
export type { Problem, Rule } from './validate'
export type { Draft, Rejection } from './draft'
export { buildCorpus } from './units'
export type { Corpus, Unit } from './units'

const head = (label: string) => label.split(' — ')[0]

/** One stage = one rozdział; articles of a dział outside any rozdział form their own stage. */
export function stageIdOf(a: Pick<Article, 'actId' | 'chapter' | 'section'>): string {
  const ch = slug(head(a.chapter?.trim() || 'bez-dzialu'))
  return a.section?.trim() ? `${a.actId}:${ch}:${slug(head(a.section))}` : `${a.actId}:${ch}`
}

function buildStages(corpus: Corpus): Stage[] {
  const stages = new Map<string, Stage>()
  const perAct = new Map<string, number>()
  for (const a of corpus.articles) {
    const id = stageIdOf(a)
    let s = stages.get(id)
    if (!s) {
      const order = perAct.get(a.actId) ?? 0
      perAct.set(a.actId, order + 1)
      const chapter = a.chapter?.trim() || 'Bez działu'
      s = {
        id,
        actId: a.actId,
        order,
        chapter,
        section: a.section?.trim() || undefined,
        label: a.section?.trim() || chapter,
        articleIds: [],
        questionIds: [],
      }
      stages.set(id, s)
    }
    if (isLiveArticle(a)) s.articleIds.push(a.id)
  }
  return [...stages.values()]
}

const TYPE_ORDER = ['definition', 'duty-right', 'deadline', 'exception', 'conditions', 'enumeration', 'which-article', 'comparison', 'order']

function finalize(d: Draft, stageId: string): Question {
  const opts = d.options ? shuffle(d.options, d.id) : undefined
  const options: QuestionOption[] | undefined = opts?.map((o, i) => ({
    id: String.fromCharCode(97 + i),
    text: o.text,
    correct: o.correct,
    ...(o.note ? { note: o.note } : {}),
  }))
  return {
    id: d.id,
    type: d.type,
    variant: d.variant,
    format: d.format,
    difficulty: d.difficulty,
    actId: d.actId,
    articleId: d.articleId,
    stageId,
    prompt: d.prompt,
    ...(d.context ? { context: d.context } : {}),
    ...(options ? { options } : {}),
    answer: d.answer,
    sources: d.sources,
  }
}

function count<T>(list: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of list) out[key(x)] = (out[key(x)] ?? 0) + 1
  return out
}

export type GenerateResult = {
  bank: QuestionBank
  rejected: (Rejection & { problems?: Problem[] })[]
  corpus: Corpus
  drafts: Draft[]
}

export function generateQuestionBank(bundles: ActBundle[], dataGeneratedAt: string): GenerateResult {
  const corpus = buildCorpus(bundles)
  const stageOf = (a: Article) => stageIdOf(a)
  const results = [
    extractDefinitions(corpus),
    extractDutyRight(corpus),
    extractDeadlines(corpus),
    extractExceptions(corpus),
    extractEnumerations(corpus),
    extractWhichArticle(corpus, stageOf),
    extractCurated(corpus),
  ]
  const drafts = results.flatMap((r) => r.drafts)
  const { valid, rejected: invalid } = validateAll(drafts, corpus)
  const rejected = [...results.flatMap((r) => r.rejected), ...invalid]

  const stages = buildStages(corpus)
  const stageById = new Map(stages.map((s) => [s.id, s]))
  const artIndex = new Map(corpus.articles.map((a, i) => [a.id, i]))
  const questions = valid
    .map((d) => finalize(d, stageOf(corpus.articleById.get(d.articleId)!)))
    .sort(
      (a, b) =>
        artIndex.get(a.articleId)! - artIndex.get(b.articleId)! ||
        a.difficulty - b.difficulty ||
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
        a.id.localeCompare(b.id),
    )
  for (const q of questions) stageById.get(q.stageId)?.questionIds.push(q.id)

  const stats: BankStats = {
    total: questions.length,
    byType: count(questions, (q) => q.type),
    byAct: count(questions, (q) => q.actId),
    byFormat: count(questions, (q) => q.format),
    byDifficulty: count(questions, (q) => String(q.difficulty)),
    rejected: rejected.length,
    rejectedByReason: count(rejected, (r) => `${r.type}: ${r.reason}`),
  }

  return {
    bank: {
      version: 1,
      dataGeneratedAt,
      acts: corpus.acts.map((a) => ({ id: a.id, shortName: a.shortName })),
      stages,
      questions,
      stats,
    },
    rejected,
    corpus,
    drafts,
  }
}
