/** Pure text helpers shared by generator and validator. */

export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** Lowercase + collapsed whitespace + unified dashes/quotes — for containment checks. */
export function norm(s: string): string {
  return clean(s)
    .toLocaleLowerCase('pl')
    .replace(/[–—‑]/g, '-')
    .replace(/[„”"«»]/g, '"')
}

export function contains(haystack: string, needle: string): boolean {
  const n = norm(needle)
  return n.length > 0 && norm(haystack).includes(n)
}

/** Strip list punctuation and trailing connectives from an enumeration item. */
export function trimItem(s: string): string {
  let t = clean(s)
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/[;,.:]+$/u, '')
      .replace(/\s+(oraz|lub|albo|i|a także|bądź)$/u, '')
      .trim()
  }
  return t
}

const STOP = new Set([
  'i', 'w', 'z', 'na', 'do', 'o', 'od', 'po', 'lub', 'oraz', 'albo', 'się', 'nie', 'jest', 'że',
  'przez', 'dla', 'a', 'to', 'jego', 'jej', 'ich', 'tym', 'tego', 'których', 'który', 'która',
  'mowa', 'art', 'pkt', 'ust', 'lit',
])

function stems(s: string): Set<string> {
  const out = new Set<string>()
  for (const w of norm(s).split(/[^\p{L}\d]+/u)) {
    if (!w || STOP.has(w)) continue
    out.add(w.length > 5 ? w.slice(0, 5) : w)
  }
  return out
}

/** Jaccard similarity over crude Polish stems (first 5 letters). */
export function similarity(a: string, b: string): number {
  const A = stems(a)
  const B = stems(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

export function tooSimilar(a: string, b: string, threshold = 0.5): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  return similarity(a, b) >= threshold
}

/** PDF-import artifacts that make a unit unreliable as a question source. */
export function hasArtifacts(s: string): boolean {
  return (
    /wejdzie w życie|nowe brzmienie|dodany .{0,40} wejdzie|\[|\]/iu.test(s) ||
    /\s[,;]/.test(s) ||
    /\p{L}- \p{Ll}/u.test(s) ||
    /zm\.\d|\)\)/u.test(s) ||
    /Dz\. Urz\. UE L|\d{2}\.\d{2}\.\d{4}, str\./u.test(s) ||
    /\bArt\. \d+[a-z]*\. /u.test(s) ||
    /<\s*(§|Art\.|ust\.)/u.test(s) ||
    /(Oddział|Rozdział|Dział) [\dIVX]+[a-z]? \p{Lu}/u.test(s) ||
    /\(uchylon|\(pominięt|\(utracił/iu.test(s)
  )
}

export function isRepealed(s: string): boolean {
  return /^\(?\s*(uchylon|pominięt|utracił)/iu.test(clean(s))
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic PRNG seeded by a string (mulberry32). */
export function rng(seed: string): () => number {
  let a = fnv1a(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(list: readonly T[], seed: string): T[] {
  const r = rng(seed)
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function slug(s: string): string {
  return norm(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const GAP = '▢'
