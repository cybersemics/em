import { describe, expect, it } from 'vitest'
import matchMilestone from '../matchMilestone.ts'

const TITLES = [
  '📖 Context View',
  '📖 Context View (backlog)',
  '🧤 Drag & Drop',
  '✅ Test Engineering',
  '💹 Metaprogramming',
]

describe('matchMilestone', () => {
  it('matches an exact title', () => {
    expect(matchMilestone('🧤 Drag & Drop', TITLES)).toBe('🧤 Drag & Drop')
  })

  it('matches ignoring case', () => {
    expect(matchMilestone('🧤 drag & drop', TITLES)).toBe('🧤 Drag & Drop')
  })

  it('matches when the model drops the leading emoji', () => {
    expect(matchMilestone('Drag & Drop', TITLES)).toBe('🧤 Drag & Drop')
  })

  it('matches when the model spells out the ampersand', () => {
    expect(matchMilestone('Drag and Drop', TITLES)).toBe('🧤 Drag & Drop')
  })

  it('matches despite surrounding whitespace', () => {
    expect(matchMilestone('  ✅ Test Engineering \n', TITLES)).toBe('✅ Test Engineering')
  })

  it('distinguishes a milestone from its backlog counterpart', () => {
    expect(matchMilestone('Context View', TITLES)).toBe('📖 Context View')
    expect(matchMilestone('Context View (backlog)', TITLES)).toBe('📖 Context View (backlog)')
  })

  it('rejects a milestone that is not open', () => {
    expect(matchMilestone('🥞 Flat Render', TITLES)).toBeNull()
  })

  it('rejects null, undefined, and empty input', () => {
    expect(matchMilestone(null, TITLES)).toBeNull()
    expect(matchMilestone(undefined, TITLES)).toBeNull()
    expect(matchMilestone('   ', TITLES)).toBeNull()
  })

  it('rejects input that carries no letters or digits rather than matching arbitrarily', () => {
    expect(matchMilestone('📖', TITLES)).toBeNull()
  })

  it('matches a title the model copied back with its description appended', () => {
    expect(
      matchMilestone('💹 Metaprogramming — Metaprogramming attributes like =children, =pin, =label, etc.', TITLES),
    ).toBe('💹 Metaprogramming')
  })

  it('matches an appended description joined by a plain hyphen', () => {
    expect(matchMilestone('✅ Test Engineering - flaky tests and CI', TITLES)).toBe('✅ Test Engineering')
  })

  it('keeps the backlog distinction when a description is appended', () => {
    expect(matchMilestone('📖 Context View (backlog) — deferred work', TITLES)).toBe('📖 Context View (backlog)')
  })

  it('still rejects an invented milestone that merely begins with a real title', () => {
    expect(matchMilestone('📖 Context View Extras', TITLES)).toBeNull()
  })

  it('rejects an ambiguous loose match rather than guessing', () => {
    expect(matchMilestone('FooBar', ['Foo Bar', 'foo-bar'])).toBeNull()
  })

  it('prefers an exact match over a loose match on a different milestone', () => {
    expect(matchMilestone('Foo Bar', ['Foo Bar', 'foo-bar'])).toBe('Foo Bar')
  })
})
