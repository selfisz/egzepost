import type { Question, QuestionBank } from './model'

/** `public/data/questions.json` — everything except the questions themselves. */
export type QuestionBankIndex = Omit<QuestionBank, 'questions'> & {
  /** actId → file name (relative to the index) with that act's questions. */
  files: Record<string, string>
}

export type QuestionBankPart = { actId: string; questions: Question[] }

export const BANK_INDEX_FILE = 'questions.json'

/**
 * Load the generated bank. `dataBaseUrl` = the folder that serves `public/data/`
 * (in the app: `${import.meta.env.BASE_URL}data/`).
 */
export async function loadQuestionBank(dataBaseUrl: string, fetchImpl: typeof fetch = fetch): Promise<QuestionBank> {
  const base = dataBaseUrl.replace(/\/?$/, '/')
  const res = await fetchImpl(`${base}${BANK_INDEX_FILE}`)
  if (!res.ok) throw new Error(`Brak banku pytań (${base}${BANK_INDEX_FILE}). Uruchom: npm run build:questions`)
  const index = (await res.json()) as QuestionBankIndex
  const parts = await Promise.all(
    Object.values(index.files).map(async (file) => {
      const r = await fetchImpl(`${base}${file}`)
      if (!r.ok) throw new Error(`Brak pliku pytań: ${base}${file}`)
      return (await r.json()) as QuestionBankPart
    }),
  )
  return assembleBank(index, parts)
}

export function assembleBank(index: QuestionBankIndex, parts: QuestionBankPart[]): QuestionBank {
  const { files: _files, ...meta } = index
  void _files
  const byAct = new Map(parts.map((p) => [p.actId, p.questions]))
  return { ...meta, questions: index.acts.flatMap((a) => byAct.get(a.id) ?? []) }
}

export function splitBank(bank: QuestionBank): { index: QuestionBankIndex; parts: QuestionBankPart[] } {
  const { questions, ...meta } = bank
  const files: Record<string, string> = {}
  const parts = bank.acts.map((a) => {
    files[a.id] = `questions-${a.id}.json`
    return { actId: a.id, questions: questions.filter((q) => q.actId === a.id) }
  })
  return { index: { ...meta, files }, parts }
}
