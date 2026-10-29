import type { Question, QuestionBank } from '../model'
import { TYPE_LABELS } from '../progress'
import { shuffle } from '../text'
import type { Rejection } from './draft'

export function questionMarkdown(q: Question): string {
  const lines = [`**${TYPE_LABELS[q.type]} · ${q.variant} · ${q.format} · poziom ${q.difficulty}** — \`${q.id}\``, '', `> ${q.prompt}`]
  if (q.context) lines.push('>', ...q.context.split('\n').map((l) => `> ${l}`))
  lines.push('')
  for (const o of q.options ?? []) lines.push(`- ${o.correct ? '✅' : '▫️'} ${o.text}${o.note && !o.correct ? ` — _${o.note}_` : ''}`)
  if (q.format === 'flashcard') lines.push(`Odpowiedź:\n\n${q.answer.split('\n').map((l) => `- ${l}`).join('\n')}`)
  else lines.push('', `Odpowiedź: **${q.answer}**`)
  lines.push('', `Podstawa: ${q.sources.map((s) => `${s.citation} — „${s.quote.length > 260 ? `${s.quote.slice(0, 260)}…` : s.quote}”`).join('; ')}`)
  return lines.join('\n')
}

function table(rows: [string, number][], head: [string, string]): string {
  return [`| ${head[0]} | ${head[1]} |`, '|---|---:|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n')
}

export function bankReport(bank: QuestionBank, rejected: Rejection[]): string {
  const s = bank.stats
  const groups = new Map<string, Question[]>()
  for (const q of bank.questions) groups.set(`${q.type}:${q.variant}`, [...(groups.get(`${q.type}:${q.variant}`) ?? []), q])
  const samples = [...groups].map(([k, list]) => shuffle(list, k)[0])
  const stagesWith = bank.stages.filter((x) => x.questionIds.length).length

  return [
    '# Bank pytań — raport jakości',
    '',
    `Wygenerowano regułowo (bez AI) z danych \`${bank.dataGeneratedAt}\`. Plik tworzy \`npm run build:questions\` — nie edytuj ręcznie.`,
    '',
    `**${s.total}** pytań po walidacji · **${s.rejected}** kandydatów odrzuconych · ${stagesWith}/${bank.stages.length} rozdziałów (etapów) ma pytania.`,
    '',
    '## Liczby',
    '',
    table(Object.entries(s.byType).map(([k, v]) => [TYPE_LABELS[k as Question['type']] ?? k, v]), ['Typ', 'Pytań']),
    '',
    table(Object.entries(s.byAct).map(([k, v]) => [bank.acts.find((a) => a.id === k)?.shortName ?? k, v]), ['Akt', 'Pytań']),
    '',
    table(Object.entries(s.byFormat), ['Format', 'Pytań']),
    '',
    table(Object.entries(s.byDifficulty).map(([k, v]) => [`poziom ${k}`, v]), ['Trudność', 'Pytań']),
    '',
    '## Odrzucone kandydatury (powód)',
    '',
    'Generator pomija przepis zamiast tworzyć słabe pytanie. Walidator sprawdza: strukturę, istnienie podstawy prawnej, zgodność każdej opcji z cytatem (poprawna — występuje w przepisie; dystraktor — udowodnione, że nie występuje), jednoznaczność (brak podpowiedzi w treści, brak dublujących się opcji), duplikaty, liczbę odpowiedzi i sensowność (długości, artefakty importu PDF).',
    '',
    table(
      Object.entries(s.rejectedByReason).sort((a, b) => b[1] - a[1]),
      ['Typ: powód', 'Liczba'],
    ),
    '',
    '## Próbki (po jednej na typ i wariant)',
    '',
    ...samples.flatMap((q) => [questionMarkdown(q), '', '---', '']),
    `_Odrzuceń z detalem: ${rejected.length}. Pełna lista: \`npm run build:questions -- --rejected\`._`,
    '',
  ].join('\n')
}
