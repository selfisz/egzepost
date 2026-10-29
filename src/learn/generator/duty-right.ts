import { emptyResult, type DraftOption, type ExtractResult } from './draft'
import { focus, gap, quoteCtx } from './common'
import { Citation, sourceOf, type Corpus } from './units'
import { hasArtifacts, isRepealed, norm, shuffle } from '../text'

/** Closed role vocabulary per act (nominative, as they open a sentence). Longest first. */
export const ROLES: Record<string, string[]> = {
  upea: [
    'Dłużnik zajętej wierzytelności', 'Organ egzekucyjny', 'Organ odwoławczy', 'Organ nadzoru',
    'Wierzyciel', 'Zobowiązany', 'Egzekutor', 'Pracodawca', 'Bank',
  ],
  kpa: [
    'Organ administracji publicznej', 'Organ prowadzący postępowanie', 'Organ wyższego stopnia',
    'Organ odwoławczy', 'Pracownik organu', 'Strona', 'Świadek', 'Biegły',
  ],
  ordynacja: [
    'Organ prowadzący postępowanie', 'Organ odwoławczy', 'Organ podatkowy', 'Kontrolujący',
    'Kontrolowany', 'Pełnomocnik', 'Podatnik', 'Płatnik', 'Inkasent', 'Strona',
  ],
}

const DUTY = ['jest obowiązany', 'jest obowiązana', 'obowiązany jest', 'obowiązana jest', 'ma obowiązek']
const RIGHT = ['może', 'jest uprawniony', 'jest uprawniona', 'ma prawo']
/** Any modal in the unit — a second one makes the question ambiguous. */
const ANY_MODAL = /\b(może|mogą|obowiązan\w*|uprawnion\w*|ma obowiązek|ma prawo|nie może|zobowiązany jest|są obowiązani)\b/giu
/** `może być`, `może zostać` = possibility, not a subject's power. */
const NOT_ACTION = /^(być|zostać|nastąpić|dotyczyć|obejmować|mieć|przekraczać|wynosić|następować)$/u

/** Stems that prove a role is not mentioned anywhere in a unit (conservative). */
function roleStems(role: string): string[] {
  const words = norm(role).split(' ').filter((w) => w !== 'organ' && w.length >= 4)
  return words.map((w) => (w.length > 6 ? w.slice(0, w.length - 2) : w.slice(0, 5)))
}

export function extractDutyRight(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  for (const u of corpus.units) {
    const roles = ROLES[u.act.id]
    if (!roles || isRepealed(u.text) || hasArtifacts(u.text)) continue
    const head = u.text.replace(/^§\s*\d+\w*\.\s*/, '')
    const role = roles.find((r) => head.startsWith(`${r} `))
    if (!role) continue
    const rest = head.slice(role.length + 1)
    const duty = DUTY.find((m) => rest.startsWith(`${m} `))
    const right = RIGHT.find((m) => rest.startsWith(`${m} `))
    const modal = duty ?? right
    if (!modal) continue
    const verb = rest.slice(modal.length + 1).split(/[\s,]/)[0]
    const aid = u.article.id
    if (!/[ćc]$/u.test(verb) || NOT_ACTION.test(verb)) {
      res.rejected.push({ type: 'duty-right', reason: 'brak czynności podmiotu (np. „może być”)', articleId: aid, detail: u.path })
      continue
    }
    const modals = u.fullText.match(ANY_MODAL) ?? []
    if (modals.length !== 1) {
      res.rejected.push({ type: 'duty-right', reason: 'kilka norm modalnych w jednostce', articleId: aid, detail: u.path })
      continue
    }
    const ctxBase = focus(u.text, 0)
    if (!ctxBase) continue
    const cite = Citation(u)
    const src = sourceOf(u)
    const base = { type: 'duty-right' as const, actId: u.act.id, articleId: aid, sources: [src] }
    const isDuty = Boolean(duty)
    const phrase = `${role} ${modal}`

    const kindCtx = gap(ctxBase, ` ${modal} `)
    if (kindCtx) {
      const other = isDuty ? RIGHT : DUTY
      res.drafts.push({
        ...base,
        id: `duty-right:kind:${aid}:${u.path}`,
        variant: 'kind',
        format: 'single',
        difficulty: 1,
        prompt: `${cite}: czy ten przepis nakłada na podmiot obowiązek, czy przyznaje mu uprawnienie?`,
        context: quoteCtx(kindCtx.replace(/▢/, ' ▢ ')),
        answer: isDuty ? `Obowiązek („${modal}”)` : `Uprawnienie („${modal}”)`,
        hidden: [` ${modal} `],
        options: [
          { text: 'Obowiązek', correct: isDuty, ...(isDuty ? { present: [{ text: phrase }] } : { absent: other.map((t) => ({ text: `${role} ${t}` })) }) },
          { text: 'Uprawnienie', correct: !isDuty, ...(!isDuty ? { present: [{ text: phrase }] } : { absent: other.map((t) => ({ text: `${role} ${t}` })) }) },
        ],
      })
    }

    const others = shuffle(
      roles.filter((r) => r !== role && roleStems(r).length && roleStems(r).every((s) => !norm(u.fullText).includes(s))),
      aid + u.path,
    ).slice(0, 3)
    const actorCtx = gap(ctxBase, role)
    if (others.length < 2 || !actorCtx) {
      res.rejected.push({ type: 'duty-right', reason: 'za mało podmiotów-dystraktorów', articleId: aid, detail: u.path })
      continue
    }
    res.drafts.push({
      ...base,
      id: `duty-right:actor:${aid}:${u.path}`,
      variant: 'actor',
      format: 'single',
      difficulty: 2,
      prompt: `${cite}: ${isDuty ? 'na kogo przepis nakłada ten obowiązek' : 'komu przepis przyznaje to uprawnienie'}?`,
      context: quoteCtx(actorCtx),
      answer: role,
      hidden: [phrase],
      options: [
        { text: role, correct: true, present: [{ text: phrase }] },
        ...others.map<DraftOption>((r) => ({
          text: r,
          correct: false,
          note: `${cite} nie wymienia tego podmiotu.`,
          absent: roleStems(r).map((text) => ({ text })),
        })),
      ],
    })
  }
  return res
}
