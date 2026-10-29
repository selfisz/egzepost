/**
 * Build the learning question bank from imported acts (no AI, no network).
 *   npm run build:questions               → public/data/questions*.json + QUESTIONS.md
 *   npm run build:questions -- --check    → exit 1 if committed bank is stale
 *   npm run build:questions -- --rejected → print every rejected candidate
 */
import fs from 'node:fs'
import path from 'node:path'
import type { ActBundle, DataIndex } from '../src/types'
import { splitBank } from '../src/learn/bank'
import { generateQuestionBank } from '../src/learn/generator'
import { bankReport } from '../src/learn/generator/report'

const DATA = path.resolve(import.meta.dirname, '..', 'public', 'data')

export function readActs(dataDir = DATA): { index: DataIndex; bundles: ActBundle[] } {
  const index = JSON.parse(fs.readFileSync(path.join(dataDir, 'index.json'), 'utf8')) as DataIndex
  const bundles = index.acts.map((a) => JSON.parse(fs.readFileSync(path.join(dataDir, `${a.id}.json`), 'utf8')) as ActBundle)
  return { index, bundles }
}

/** One question per line keeps git diffs reviewable. */
function serializePart(part: { actId: string; questions: unknown[] }): string {
  return `{"actId":${JSON.stringify(part.actId)},"questions":[\n${part.questions.map((q) => JSON.stringify(q)).join(',\n')}\n]}\n`
}

export function renderFiles(dataDir = DATA): Record<string, string> {
  const { index, bundles } = readActs(dataDir)
  const { bank, rejected } = generateQuestionBank(bundles, index.generatedAt)
  const { index: bankIndex, parts } = splitBank(bank)
  const files: Record<string, string> = {
    'questions.json': `${JSON.stringify(bankIndex, null, 1)}\n`,
    'QUESTIONS.md': bankReport(bank, rejected),
  }
  for (const p of parts) files[bankIndex.files[p.actId]] = serializePart(p)
  return files
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--rejected')) {
    const { index, bundles } = readActs()
    const { rejected } = generateQuestionBank(bundles, index.generatedAt)
    for (const r of rejected) console.log(`${r.type}\t${r.articleId}\t${r.reason}\t${r.detail ?? ''}`)
    return
  }
  const files = renderFiles()
  if (args.includes('--check')) {
    const stale = Object.entries(files).filter(([name, body]) => {
      const p = path.join(DATA, name)
      return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body
    })
    if (stale.length) {
      console.error(`Bank pytań nieaktualny: ${stale.map(([n]) => n).join(', ')}. Uruchom: npm run build:questions`)
      process.exit(1)
    }
    console.log('Bank pytań aktualny.')
    return
  }
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(DATA, name), body)
    console.log(`→ public/data/${name} (${(Buffer.byteLength(body) / 1024).toFixed(0)} KB)`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main()
