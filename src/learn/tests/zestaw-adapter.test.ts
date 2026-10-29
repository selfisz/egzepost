/**
 * Adapter-level tests for „Mój zestaw” strict scope + session preview.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emptyLearnState } from '../index'
import { describeSessionPreview, planSession } from '../../lib/learn-adapter'
import { real } from './fixtures'

const bank = real().bank

describe('Mój zestaw — strict session scope', () => {
  it('pulls only questions from selected stages/articles', () => {
    const stage = bank.stages.find((s) => s.questionIds.length >= 3)!
    const plan = planSession(bank, emptyLearnState(), {
      mode: 'test',
      zestaw: { stageIds: [stage.id], articleIds: [] },
    })
    assert.ok(plan.items.length > 0)
    for (const it of plan.items) {
      assert.equal(it.question.stageId, stage.id)
    }
  })

  it('does not silently fill from another act when set has no matching questions', () => {
    const plan = planSession(bank, emptyLearnState(), {
      mode: 'mixed',
      zestaw: { stageIds: ['nieistniejacy-etap'], articleIds: ['upea:99999'] },
    })
    assert.equal(plan.items.length, 0)
  })

  it('preview reports honest empty message for empty set', () => {
    const info = describeSessionPreview(bank, emptyLearnState(), {
      mode: 'test',
      zestaw: { stageIds: [], articleIds: [] },
    })
    assert.equal(info.count, 0)
    assert.match(info.emptyMessage ?? '', /pusty|brak/i)
    assert.equal(info.scopeKind, 'zestaw')
  })

  it('preview for a chapter shows type breakdown', () => {
    const stage = bank.stages.find((s) => s.questionIds.length >= 5)!
    const info = describeSessionPreview(bank, emptyLearnState(), {
      mode: 'test',
      actId: stage.actId as 'upea' | 'kpa' | 'ordynacja',
      stageId: stage.id,
    })
    assert.ok(info.count > 0)
    assert.ok(info.byType.length > 0)
    assert.equal(info.scopeKind, 'chapter')
  })
})
