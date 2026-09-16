import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import hashThought from '../hashThought'
import projectLexemes from '../projectLexemes'

const A = '00000000000000000000000000000701' as ThoughtId
const B = '00000000000000000000000000000702' as ThoughtId
const C = '00000000000000000000000000000703' as ThoughtId
const D = '00000000000000000000000000000704' as ThoughtId
const E = '00000000000000000000000000000705' as ThoughtId
const catHash = hashThought('cat')
const dogHash = hashThought('dog')
const thought: Thought = {
  id: A,
  value: 'cat',
  parentId: HOME_TOKEN,
  childrenMap: {},
  rank: 0,
  created: 1 as Timestamp,
  lastUpdated: 2 as Timestamp,
  updatedBy: 'writer',
}

it.each([{ rank: 1, parentId: EM_TOKEN }, { value: 'Cats' }])(
  'preserves the index reference when membership and metadata are unchanged (%j)',
  update => {
    const lexeme = { contexts: [A], created: thought.created, lastUpdated: thought.lastUpdated, updatedBy: 'writer' }
    Object.freeze(lexeme.contexts)
    Object.freeze(lexeme)
    const lexemeIndex = Object.freeze({ [catHash]: lexeme })

    expect(projectLexemes(lexemeIndex, { [A]: { ...thought, ...update } })).toBe(lexemeIndex)
  },
)

it('preserves unaffected references while grouping renames, additions, and deletions by normalized value', () => {
  const cat = { contexts: [A, B], created: thought.created, lastUpdated: thought.lastUpdated, updatedBy: 'writer' }
  const dog = { ...cat, contexts: [D] }
  const unchangedHash = hashThought('bird')
  const unchanged = { ...cat, contexts: [E] }
  const lexemeIndex = { [catHash]: cat, [dogHash]: dog, [unchangedHash]: unchanged }
  Object.values(lexemeIndex).forEach(lexeme => {
    Object.freeze(lexeme.contexts)
    Object.freeze(lexeme)
  })
  Object.freeze(lexemeIndex)

  const projected = projectLexemes(lexemeIndex, {
    [A]: { ...thought, value: 'Dog', lastUpdated: 3 as Timestamp, updatedBy: 'renamer' },
    [B]: null,
    [C]: {
      ...thought,
      id: C,
      value: 'dogs',
      created: 4 as Timestamp,
      lastUpdated: 4 as Timestamp,
      updatedBy: 'creator',
    },
    [E]: { ...thought, id: E, value: 'bird' },
  })

  expect(projected).toEqual({
    [dogHash]: { contexts: [D, A, C], created: 1, lastUpdated: 4, updatedBy: 'creator' },
    [unchangedHash]: unchanged,
  })
  expect(projected[unchangedHash]).toBe(unchanged)
})

it('preserves the context list when only aggregate metadata changes', () => {
  const lexeme = { contexts: [A, B], created: thought.created, lastUpdated: thought.lastUpdated, updatedBy: 'writer' }
  const lexemeIndex = { [catHash]: lexeme }

  const projected = projectLexemes(lexemeIndex, {
    [A]: { ...thought, lastUpdated: 3 as Timestamp, updatedBy: 'editor' },
  })

  expect(projected[catHash]).toEqual({ contexts: [A, B], created: 1, lastUpdated: 3, updatedBy: 'editor' })
  expect(projected[catHash].contexts).toBe(lexeme.contexts)
  expect(lexemeIndex[catHash].lastUpdated).toBe(2)
})
