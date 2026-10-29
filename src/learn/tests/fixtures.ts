import fs from 'node:fs'
import path from 'node:path'
import type { ActBundle, DataIndex } from '../../types'
import { generateQuestionBank, type GenerateResult } from '../generator'

export const DATA_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'public', 'data')

let cached: GenerateResult | undefined

/** Generator run on the real, committed seed of acts. */
export function real(): GenerateResult {
  if (cached) return cached
  const index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf8')) as DataIndex
  const bundles = index.acts.map((a) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${a.id}.json`), 'utf8')) as ActBundle)
  cached = generateQuestionBank(bundles, index.generatedAt)
  return cached
}

export function question(id: string) {
  const q = real().bank.questions.find((x) => x.id === id)
  if (!q) throw new Error(`brak pytania ${id}`)
  return q
}

export function draft(id: string) {
  const d = real().drafts.find((x) => x.id === id)
  if (!d) throw new Error(`brak szkicu ${id}`)
  return d
}
