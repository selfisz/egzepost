/**
 * Import consolidated Kpa + u.p.e.a. + Ordynacja podatkowa into searchable article JSON.
 *
 * Default: official ISAP tekst jednolity PDFs in `data/source/` → pdftotext.
 * Fallback (IMPORT_SOURCE=eli): Sejm ELI API HTML/PDF (ISAP download URLs are often blocked).
 *
 *   npm run import:acts
 *   IMPORT_SOURCE=eli npm run import:acts     # force ELI network fetch
 *   IMPORT_SOURCE=local npm run import:acts   # scripts/raw/*.html|*.txt only
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'data')
const sourceDir = path.join(root, 'data', 'source')
const cacheDir = process.env.CACHE_DIR
  ? path.resolve(process.env.CACHE_DIR)
  : path.join(root, 'scripts', 'raw')

type ActDef = {
  id: string
  shortName: string
  title: string
  displayAddress: string
  /** Original act ELI (for metadata / ISAP links) */
  baseEli: string
  isapPdf: string
  /** Committed official consolidated PDF under data/source/ */
  sourcePdf: string
  /** Preferred consolidated HTML sources (newest first) — ELI fallback */
  tjHtmlElis: string[]
  /** Preferred consolidated PDF sources (newest first) — ELI fallback */
  tjPdfElis: string[]
  htmlFile: string
  txtFile: string
}

const ACTS: ActDef[] = [
  {
    id: 'upea',
    shortName: 'u.p.e.a.',
    title:
      'Ustawa z dnia 17 czerwca 1966 r. o postępowaniu egzekucyjnym w administracji',
    displayAddress: 'Dz.U. 1966 nr 24 poz. 151 (tekst jednolity)',
    baseEli: 'DU/1966/151',
    isapPdf:
      'https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU19660240151/U/D19660151Lj.pdf',
    sourcePdf: 'upea-D19660151Lj.pdf',
    tjHtmlElis: ['DU/2023/2505', 'DU/2022/479'],
    tjPdfElis: ['DU/2026/1311', 'DU/2026/268', 'DU/2025/132', 'DU/2023/2505'],
    htmlFile: 'upea.html',
    txtFile: 'upea.txt',
  },
  {
    id: 'kpa',
    shortName: 'Kpa',
    title: 'Ustawa z dnia 14 czerwca 1960 r. Kodeks postępowania administracyjnego',
    displayAddress: 'Dz.U. 1960 nr 30 poz. 168 (tekst jednolity)',
    baseEli: 'DU/1960/168',
    isapPdf:
      'https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU19600300168/U/D19600168Lj.pdf',
    sourcePdf: 'kpa-D19600168Lj.pdf',
    tjHtmlElis: ['DU/2024/572'],
    tjPdfElis: ['DU/2025/1691', 'DU/2024/572'],
    htmlFile: 'kpa.html',
    txtFile: 'kpa.txt',
  },
  {
    id: 'ordynacja',
    shortName: 'Op',
    title: 'Ustawa z dnia 29 sierpnia 1997 r. Ordynacja podatkowa',
    displayAddress: 'Dz.U. 1997 nr 137 poz. 926 (tekst jednolity)',
    baseEli: 'DU/1997/926',
    isapPdf:
      'https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU19971370926/U/D19970926Lj.pdf',
    sourcePdf: 'ordynacja-D19970926Lj.pdf',
    tjHtmlElis: ['DU/2025/1112', 'DU/2023/2383'],
    tjPdfElis: ['DU/2026/622', 'DU/2025/1112', 'DU/2023/2383'],
    htmlFile: 'ordynacja.html',
    txtFile: 'ordynacja.txt',
  },
]

export type ArticleBlock =
  | { type: 'text'; text: string }
  | { type: 'para'; marker: string; text: string; children?: ArticleBlock[] }
  | { type: 'point'; marker: string; text: string; children?: ArticleBlock[] }
  | { type: 'letter'; marker: string; text: string }

export type Article = {
  id: string
  actId: string
  number: string
  label: string
  text: string
  excerpt: string
  blocks: ArticleBlock[]
  chapter?: string
  section?: string
}

export type ActBundle = {
  id: string
  shortName: string
  title: string
  displayAddress: string
  source: {
    kind: 'isap-pdf' | 'eli-html' | 'eli-pdf' | 'local-html' | 'local-txt'
    eli?: string
    url?: string
    fetchedAt: string
    note: string
  }
  articleCount: number
  articles: Article[]
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function blocksFromFlatText(text: string): ArticleBlock[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return [{ type: 'text', text }]

  const blocks: ArticleBlock[] = []
  let currentPara: Extract<ArticleBlock, { type: 'para' }> | null = null
  let currentPoint: Extract<ArticleBlock, { type: 'point' }> | null = null

  const flushPoint = () => {
    if (currentPoint && currentPara) {
      currentPara.children = currentPara.children ?? []
      currentPara.children.push(currentPoint)
      currentPoint = null
    } else if (currentPoint) {
      blocks.push(currentPoint)
      currentPoint = null
    }
  }
  const flushPara = () => {
    flushPoint()
    if (currentPara) {
      blocks.push(currentPara)
      currentPara = null
    }
  }

  for (const line of lines) {
    const para = line.match(/^(§\s*\d+[a-z]?\.?|ust\.\s*\d+)\s*(.*)$/i)
    const point = line.match(/^(\d+[a-z]?\)|\d+\.)\s+(.*)$/)
    const letter = line.match(/^([a-z]\))\s+(.*)$/i)

    if (para) {
      flushPara()
      currentPara = { type: 'para', marker: para[1].replace(/\s+/g, ' ').trim(), text: para[2] || '', children: [] }
      continue
    }
    if (point) {
      flushPoint()
      currentPoint = { type: 'point', marker: point[1], text: point[2] || '', children: [] }
      continue
    }
    if (letter) {
      const lit: ArticleBlock = { type: 'letter', marker: letter[1], text: letter[2] || '' }
      if (currentPoint) {
        currentPoint.children = currentPoint.children ?? []
        currentPoint.children.push(lit)
      } else if (currentPara) {
        currentPara.children = currentPara.children ?? []
        currentPara.children.push(lit)
      } else {
        blocks.push(lit)
      }
      continue
    }
    if (currentPoint) currentPoint.text = `${currentPoint.text} ${line}`.trim()
    else if (currentPara) currentPara.text = `${currentPara.text} ${line}`.trim()
    else blocks.push({ type: 'text', text: line })
  }
  flushPara()
  return blocks.length ? blocks : [{ type: 'text', text }]
}

function parseBlocksFromCheerio($: cheerio.CheerioAPI, $inner: cheerio.Cheerio<any>): ArticleBlock[] {
  const blocks: ArticleBlock[] = []

  const walk = ($el: cheerio.Cheerio<any>, into: ArticleBlock[]) => {
    $el.children().each((_, child) => {
      const $c = $(child)
      const cls = $c.attr('class') || ''
      if (cls.includes('unit_para')) {
        const marker = normalizeWhitespace($c.children('h2,h3,h4').first().text()) || '§'
        const innerTextParts: string[] = []
        const children: ArticleBlock[] = []
        $c.children('.unit-inner').first().children().each((__, sub) => {
          const $s = $(sub)
          const sc = $s.attr('class') || ''
          if (sc.includes('unit_pint') || sc.includes('unit_point')) {
            const pm = normalizeWhitespace($s.children('h2,h3,h4').first().text())
            const pt = normalizeWhitespace($s.find('.unit-inner').first().text())
            const letters: ArticleBlock[] = []
            $s.find('.unit_lett, .unit_lit, [class*="unit_lett"]').each((___, lit) => {
              const $l = $(lit)
              letters.push({
                type: 'letter',
                marker: normalizeWhitespace($l.children('h2,h3,h4').first().text()) || 'a)',
                text: normalizeWhitespace($l.find('.unit-inner').first().text()),
              })
            })
            children.push({
              type: 'point',
              marker: pm || '1)',
              text: pt,
              children: letters.length ? letters : undefined,
            })
          } else if ($s.attr('data-template') === 'xText' || sc.includes('pro-text') || sc.includes('pro-cite')) {
            const t = normalizeWhitespace($s.text())
            if (t) innerTextParts.push(t)
          } else {
            const t = normalizeWhitespace($s.text())
            if (t && !sc.includes('unit_')) innerTextParts.push(t)
          }
        })
        into.push({
          type: 'para',
          marker,
          text: innerTextParts.join(' ').trim(),
          children: children.length ? children : undefined,
        })
        return
      }
      if (cls.includes('unit_pint') || cls.includes('unit_point')) {
        const marker = normalizeWhitespace($c.children('h2,h3,h4').first().text()) || '1)'
        const text = normalizeWhitespace($c.children('.unit-inner').first().clone().children('.unit_lett, .unit_lit, [class*="unit_lett"]').remove().end().text())
        into.push({ type: 'point', marker, text })
        return
      }
      if ($c.attr('data-template') === 'xText' || (cls.includes('pro-text') && !cls.includes('unit_'))) {
        const t = normalizeWhitespace($c.text())
        if (t) into.push({ type: 'text', text: t })
        return
      }
      if ($c.is('.unit-inner')) walk($c, into)
    })
  }

  walk($inner, blocks)
  if (!blocks.length) {
    const t = normalizeWhitespace($inner.text())
    if (t) return blocksFromFlatText(t)
  }
  return blocks
}

function flattenBlocks(blocks: ArticleBlock[]): string {
  const parts: string[] = []
  const rec = (b: ArticleBlock) => {
    if (b.type === 'text') parts.push(b.text)
    else if (b.type === 'para') {
      parts.push(`${b.marker} ${b.text}`.trim())
      b.children?.forEach(rec)
    } else if (b.type === 'point') {
      parts.push(`${b.marker} ${b.text}`.trim())
      b.children?.forEach(rec)
    } else {
      parts.push(`${b.marker} ${b.text}`.trim())
    }
  }
  blocks.forEach(rec)
  return normalizeWhitespace(parts.join('\n'))
}

function parseArticlesFromHtml(act: ActDef, html: string): Article[] {
  const $ = cheerio.load(html)
  const articles: Article[] = []
  let currentChapter = ''
  let currentSection = ''

  // Prefer consolidated annex units (bran_*) over obwieszczenie body (pass_*)
  const hasBran = $('[id^="bran_"].unit_arti, [id*="-arti_"].unit_arti[id^="bran"]').length > 0
    || $('[id^="bran_"][class*="unit_arti"]').length > 0

  $('[class*="unit_"]').each((_, el) => {
    const $el = $(el)
    const cls = $el.attr('class') || ''
    const id = $el.attr('id') || ''

    if (cls.includes('unit_bran') || cls.includes('unit_chpt') || cls.includes('unit_schp')) {
      if (hasBran && !id.startsWith('bran_') && !id.includes('bran_')) return
      const title = normalizeWhitespace($el.children('h2,h3,h4').first().text())
      if (cls.includes('unit_bran') || cls.includes('unit_chpt')) {
        if (title) currentChapter = title
        currentSection = ''
      } else if (title) currentSection = title
      return
    }

    if (!cls.includes('unit_arti')) return
    if (hasBran && !id.startsWith('bran_') && !id.includes('bran_')) return

    const labelRaw = normalizeWhitespace($el.children('h2,h3,h4').first().text())
    const m = labelRaw.match(/^Art\.?\s*([0-9]+[a-z]?)/i)
    if (!m) return
    const number = m[1]
    const label = `Art. ${number}`
    const $inner = $el.children('.unit-inner').first()
    const blocks = parseBlocksFromCheerio($, $inner)
    const text = flattenBlocks(blocks) || normalizeWhitespace($inner.text())
    if (!text) return
    const excerpt = text.length > 280 ? `${text.slice(0, 277).trim()}…` : text
    articles.push({
      id: `${act.id}:${number}`,
      actId: act.id,
      number,
      label,
      text,
      excerpt,
      blocks: blocks.length ? blocks : [{ type: 'text', text }],
      chapter: currentChapter || undefined,
      section: currentSection || undefined,
    })
  })

  const seen = new Set<string>()
  return articles.filter((a) => {
    if (seen.has(a.number)) return false
    seen.add(a.number)
    return true
  })
}

const PAGE_HEADER = /^©?\s*Kancelaria Sejmu\b.*$/i
const DZIAL_RE = /^(DZIAŁ|Dział)\s+([IVXLC\d]+[a-z]?)\b\.?\s*(.*)$/i
const ROZDZIAL_RE = /^(Rozdział|ROZDZIAŁ)\s+(\d+[a-z]?)\b\.?\s*(.*)$/i
/** Headings only: capital „Art.” — lowercase „art.” is a cross-ref, not a new unit */
const ART_RE = /^Art\.\s*(\d+[a-z]?)\b\.?\s*(.*)$/

function cleanPdfNoise(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return true
      if (PAGE_HEADER.test(t)) return false
      if (/^s\.\s*\d+\s*\/\s*\d+$/i.test(t)) return false
      // ISAP Lj date footer (e.g. 2026-10-08)
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return false
      return true
    })
    .join('\n')
}

function parseArticlesFromTxt(act: ActDef, txt: string): Article[] {
  // Body start: first Art. 1. Prefer załącznik only when it precedes that Art. 1
  // (obwieszczenie annex). ISAP Lj PDFs often mention załącznik later — do not cut there.
  const cleaned = cleanPdfNoise(txt)
  const firstArt1 = cleaned.search(/(?:^|\n)\s*Art\.\s*1\b/)
  const zal = cleaned.search(/za[łl][aą]cznik/i)
  let body = cleaned
  if (zal >= 0 && (firstArt1 < 0 || zal < firstArt1)) {
    body = cleaned.slice(zal)
    const art1 = body.search(/(?:^|\n)\s*Art\.\s*1\b/)
    if (art1 >= 0) body = body.slice(art1)
  } else if (firstArt1 >= 0) {
    // Include preceding structure headings (DZIAŁ / Rozdział) before Art. 1
    const pre = cleaned.slice(0, firstArt1)
    const heading = [...pre.matchAll(/(?:^|\n)[ \t]*(DZIAŁ|Dział|Rozdział|ROZDZIAŁ)\s+/g)]
    const dzialPre = heading.length ? heading[0].index! : -1
    body = dzialPre >= 0 ? cleaned.slice(dzialPre) : cleaned.slice(firstArt1)
  }

  const lines = body.split(/\n/)
  let currentDzial = ''
  let currentDzialTitle = ''
  let currentRoz = ''
  let currentRozTitle = ''
  let pendingTitle: string | null = null

  type Draft = {
    number: string
    lines: string[]
    chapter?: string
    section?: string
  }
  let draft: Draft | null = null
  const drafts: Draft[] = []

  const flush = () => {
    if (!draft) return
    drafts.push(draft)
    draft = null
  }

  const dzialLabel = () => {
    if (!currentDzial) return undefined
    const title = currentDzialTitle ? ` — ${currentDzialTitle}` : ''
    return `Dział ${currentDzial}${title}`
  }
  const rozLabel = () => {
    if (!currentRoz) return undefined
    const title = currentRozTitle ? ` — ${currentRozTitle}` : ''
    return `Rozdział ${currentRoz}${title}`
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line) {
      if (draft) draft.lines.push('')
      continue
    }

    const dzial = line.match(DZIAL_RE)
    if (dzial && !/^\d+\)/.test(line)) {
      // Avoid false positives like "Dział VIII)" inside sentences — require start-of-line form
      flush()
      currentDzial = dzial[2]
      currentDzialTitle = (dzial[3] || '').trim()
      currentRoz = ''
      currentRozTitle = ''
      pendingTitle = currentDzialTitle ? null : 'dzial'
      continue
    }

    const roz = line.match(ROZDZIAL_RE)
    if (roz) {
      flush()
      currentRoz = roz[2]
      currentRozTitle = (roz[3] || '').trim()
      pendingTitle = currentRozTitle ? null : 'roz'
      continue
    }

    const art = line.match(ART_RE)
    if (art) {
      flush()
      pendingTitle = null
      draft = {
        number: art[1],
        lines: art[2] ? [art[2]] : [],
        chapter: dzialLabel(),
        section: rozLabel(),
      }
      continue
    }

    // Title line immediately under DZIAŁ / Rozdział heading
    if (pendingTitle === 'dzial' && !ART_RE.test(line) && !ROZDZIAL_RE.test(line)) {
      currentDzialTitle = line
      pendingTitle = null
      continue
    }
    if (pendingTitle === 'roz' && !ART_RE.test(line) && !DZIAL_RE.test(line)) {
      currentRozTitle = line
      pendingTitle = null
      continue
    }

    if (draft) draft.lines.push(line)
  }
  flush()

  const articles: Article[] = []
  for (const d of drafts) {
    let raw = d.lines.join('\n').replace(/^\d+\)\s+/, '')
    raw = normalizeWhitespace(raw)
    if (!raw || raw.length < 5) continue
    const blocks = blocksFromFlatText(raw)
    const text = flattenBlocks(blocks)
    articles.push({
      id: `${act.id}:${d.number}`,
      actId: act.id,
      number: d.number,
      label: `Art. ${d.number}`,
      text,
      excerpt: text.length > 280 ? `${text.slice(0, 277).trim()}…` : text,
      blocks,
      chapter: d.chapter,
      section: d.section,
    })
  }

  // Prefer longer text when duplicates (PDF sometimes repeats headers)
  const best = new Map<string, Article>()
  for (const a of articles) {
    const prev = best.get(a.number)
    if (!prev || a.text.length > prev.text.length) best.set(a.number, a)
  }
  return [...best.values()].sort((a, b) =>
    a.number.localeCompare(b.number, 'pl', { numeric: true }),
  )
}

async function fetchEli(eli: string, file: 'text.html' | 'text.pdf'): Promise<Buffer | null> {
  const url = `https://api.sejm.gov.pl/eli/acts/${eli}/${file}`
  const res = await fetch(url, {
    headers: {
      Accept: file.endsWith('html') ? 'text/html' : 'application/pdf',
      'User-Agent': 'egzepost-import/0.1 (+https://github.com/selfisz/egzepost)',
    },
  })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (file.endsWith('html')) {
    const s = buf.toString('utf8')
    if (s.includes('Incapsula') || !s.includes('unit_arti')) return null
  } else if (!buf.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    return null
  }
  return buf
}

async function pdfToText(pdfPath: string, txtPath: string): Promise<string> {
  await execFileAsync('pdftotext', ['-layout', pdfPath, txtPath])
  return readFile(txtPath, 'utf8')
}

async function loadActSource(act: ActDef): Promise<{
  articles: Article[]
  source: ActBundle['source']
}> {
  const localHtml = path.join(cacheDir, act.htmlFile)
  const localTxt = path.join(cacheDir, act.txtFile)
  const officialPdf = path.join(sourceDir, act.sourcePdf)
  const mode = process.env.IMPORT_SOURCE || 'isap'

  if (mode === 'local') {
    if (await exists(localHtml)) {
      const html = await readFile(localHtml, 'utf8')
      return {
        articles: parseArticlesFromHtml(act, html),
        source: {
          kind: 'local-html',
          fetchedAt: new Date().toISOString(),
          note: `Lokalny HTML: ${localHtml}`,
        },
      }
    }
    if (await exists(localTxt)) {
      const txt = await readFile(localTxt, 'utf8')
      return {
        articles: parseArticlesFromTxt(act, txt),
        source: {
          kind: 'local-txt',
          fetchedAt: new Date().toISOString(),
          note: `Lokalny TXT (pdftotext): ${localTxt}`,
        },
      }
    }
    throw new Error(`IMPORT_SOURCE=local but missing ${localHtml} / ${localTxt}`)
  }

  // Default: committed ISAP tekst jednolity PDFs in data/source/
  if (mode !== 'eli' && (await exists(officialPdf))) {
    console.log(`  ISAP PDF ${act.sourcePdf}…`)
    await mkdir(cacheDir, { recursive: true })
    const txtPath = path.join(cacheDir, act.txtFile)
    const txt = await pdfToText(officialPdf, txtPath)
    const articles = parseArticlesFromTxt(act, txt)
    if (articles.length < 30) {
      throw new Error(
        `${act.id}: only ${articles.length} articles from ${act.sourcePdf} — aborting`,
      )
    }
    return {
      articles,
      source: {
        kind: 'isap-pdf',
        url: act.isapPdf,
        fetchedAt: new Date().toISOString(),
        note: `Oficjalny tekst jednolity PDF: data/source/${act.sourcePdf} → pdftotext. ISAP: ${act.isapPdf}`,
      },
    }
  }

  // ELI fallback (network)
  await mkdir(cacheDir, { recursive: true })
  for (const eli of act.tjPdfElis) {
    console.log(`  try PDF ${eli}…`)
    const pdf = await fetchEli(eli, 'text.pdf')
    if (!pdf) continue
    const pdfPath = path.join(cacheDir, `${act.id}-${eli.replace(/\//g, '-')}.pdf`)
    const txtPath = path.join(cacheDir, act.txtFile)
    await writeFile(pdfPath, pdf)
    try {
      const txt = await pdfToText(pdfPath, txtPath)
      const articles = parseArticlesFromTxt(act, txt)
      if (articles.length >= 30) {
        return {
          articles,
          source: {
            kind: 'eli-pdf',
            eli,
            url: `https://api.sejm.gov.pl/eli/acts/${eli}/text.pdf`,
            fetchedAt: new Date().toISOString(),
            note: `Tekst jednolity PDF ELI ${eli} → pdftotext. ISAP Lj PDF: ${act.isapPdf}`,
          },
        }
      }
    } catch (e) {
      console.warn(`  pdftotext failed for ${eli}:`, e)
    }
  }

  for (const eli of act.tjHtmlElis) {
    console.log(`  try HTML ${eli}…`)
    const buf = await fetchEli(eli, 'text.html')
    if (!buf) continue
    const html = buf.toString('utf8')
    await writeFile(localHtml, html, 'utf8')
    const articles = parseArticlesFromHtml(act, html)
    if (articles.length >= 30) {
      return {
        articles,
        source: {
          kind: 'eli-html',
          eli,
          url: `https://api.sejm.gov.pl/eli/acts/${eli}/text.html`,
          fetchedAt: new Date().toISOString(),
          note: `Tekst jednolity HTML ELI ${eli} (jednostki bran_*). ISAP Lj: ${act.isapPdf}`,
        },
      }
    }
  }

  throw new Error(`No usable consolidated source for ${act.id}`)
}

async function importAct(act: ActDef): Promise<ActBundle> {
  console.log(`→ ${act.shortName}`)
  const { articles, source } = await loadActSource(act)
  console.log(`  ${articles.length} artykułów (${source.kind}${source.eli ? ` ${source.eli}` : ''})`)
  // Sanity: sample articles should exist
  const required =
    act.id === 'upea'
      ? ['18', '33', '56']
      : act.id === 'kpa'
        ? ['104', '124', '144']
        : ['1', '2', '3']
  for (const n of required) {
    if (!articles.some((a) => a.number === n)) {
      console.warn(`  WARN: missing sample Art. ${n}`)
    }
  }
  return {
    id: act.id,
    shortName: act.shortName,
    title: act.title,
    displayAddress: act.displayAddress,
    source,
    articleCount: articles.length,
    articles,
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })
  const bundles: ActBundle[] = []
  for (const act of ACTS) bundles.push(await importAct(act))

  const index = {
    generatedAt: new Date().toISOString(),
    acts: bundles.map((b) => ({
      id: b.id,
      shortName: b.shortName,
      title: b.title,
      displayAddress: b.displayAddress,
      articleCount: b.articleCount,
      source: b.source,
      isapPdf: ACTS.find((a) => a.id === b.id)?.isapPdf,
    })),
  }
  await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')
  for (const b of bundles) {
    await writeFile(path.join(outDir, `${b.id}.json`), JSON.stringify(b, null, 2), 'utf8')
  }
  await writeFile(
    path.join(outDir, 'IMPORT.md'),
    [
      '# Import status',
      '',
      `Generated: ${index.generatedAt}`,
      '',
      ...bundles.map(
        (b) =>
          `- **${b.shortName}**: ${b.articleCount} art. via ${b.source.kind}${b.source.eli ? ` (${b.source.eli})` : ''}${b.source.kind === 'isap-pdf' ? ` — data/source/` : ''}`,
      ),
      '',
      'Re-run: `npm run import:acts` (uses `data/source/*Lj.pdf` by default).',
      'ELI fallback: `IMPORT_SOURCE=eli npm run import:acts`.',
      'Raw cache: put HTML/TXT in `scripts/raw/` and `IMPORT_SOURCE=local npm run import:acts`.',
      '',
    ].join('\n'),
    'utf8',
  )
  console.log('Wrote public/data/*')
  console.log('Tip: run `npm run import:titles` to attach Legalis Art. N [Tytuł] headings.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
