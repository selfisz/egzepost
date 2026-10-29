/**
 * Merge Legalis editorial article titles into existing ISAP article JSON.
 *
 * Titles come from `Art. N [Tytuł]` in data/legalis/*.pdf (pdftotext).
 * Body text is never modified — only `title` is attached for navigation.
 *
 *   npm run import:titles
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const legalisDir = path.join(root, 'data', 'legalis')
const cacheDir = path.join(root, 'scripts', 'raw', 'legalis')
const outDir = path.join(root, 'public', 'data')

type ActId = 'upea' | 'kpa' | 'ordynacja'

const ACTS: { id: ActId; pdf: string }[] = [
  { id: 'upea', pdf: 'upea.pdf' },
  { id: 'kpa', pdf: 'kpa.pdf' },
  { id: 'ordynacja', pdf: 'ordynacja.pdf' },
]

type Article = {
  id: string
  actId: string
  number: string
  label: string
  text: string
  excerpt: string
  title?: string
  [key: string]: unknown
}

type ActBundle = {
  id: string
  articles: Article[]
  articleCount: number
  [key: string]: unknown
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Bracket titles + bare (uchylony) markers from Legalis. */
export function extractLegalisTitles(txt: string): Map<string, string> {
  const titles = new Map<string, string>()

  const bracket = /(?:^|\n)\s*Art\.\s*(\d+[a-z]?)\s*\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = bracket.exec(txt))) {
    const num = m[1]
    const title = m[2].replace(/\s+/g, ' ').trim()
    if (title && !titles.has(num)) titles.set(num, title)
  }

  // Uchylony without brackets — still a real Legalis nav cue
  const uchylony = /(?:^|\n)\s*Art\.\s*(\d+[a-z]?)\s*\(uchylon[ye]\)/gi
  while ((m = uchylony.exec(txt))) {
    const num = m[1]
    if (!titles.has(num)) titles.set(num, 'uchylony')
  }

  return titles
}

async function pdfToText(pdfPath: string, txtPath: string): Promise<string> {
  await mkdir(path.dirname(txtPath), { recursive: true })
  await execFileAsync('pdftotext', ['-layout', pdfPath, txtPath])
  return readFile(txtPath, 'utf8')
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  const report: string[] = ['# Legalis title import', '', `Generated: ${new Date().toISOString()}`, '']

  for (const act of ACTS) {
    const pdfPath = path.join(legalisDir, act.pdf)
    if (!(await exists(pdfPath))) {
      throw new Error(`Missing ${pdfPath}`)
    }
    const txtPath = path.join(cacheDir, `${act.id}.txt`)
    console.log(`→ ${act.id}: pdftotext ${act.pdf}`)
    const txt = await pdfToText(pdfPath, txtPath)
    const titles = extractLegalisTitles(txt)

    const bundlePath = path.join(outDir, `${act.id}.json`)
    const bundle = JSON.parse(await readFile(bundlePath, 'utf8')) as ActBundle
    let matched = 0
    let fromUchylony = 0
    const missing: string[] = []

    for (const article of bundle.articles) {
      const title = titles.get(article.number)
      if (title) {
        article.title = title
        matched += 1
        if (title === 'uchylony') fromUchylony += 1
      } else {
        delete article.title
        missing.push(article.number)
      }
    }

    await writeFile(bundlePath, JSON.stringify(bundle, null, 2), 'utf8')
    const pct = bundle.articles.length
      ? ((100 * matched) / bundle.articles.length).toFixed(1)
      : '0'
    const line = `${act.id}: ${matched}/${bundle.articles.length} (${pct}%) titles; bracket=${matched - fromUchylony}, uchylony=${fromUchylony}, missing=${missing.length}`
    console.log(`  ${line}`)
    if (missing.length) console.log(`  missing: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`)
    report.push(`- **${act.id}**: ${matched}/${bundle.articles.length} (${pct}%)`)
    if (missing.length) report.push(`  - without title: ${missing.join(', ')}`)
  }

  report.push('')
  report.push('Source: `data/legalis/*.pdf` (Legalis `Art. N [Tytuł]`). Body text unchanged (ISAP Lj).')
  report.push('Re-run: `npm run import:titles`.')
  await writeFile(path.join(outDir, 'TITLES.md'), report.join('\n'), 'utf8')
  console.log('Wrote public/data/*.json + TITLES.md')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
