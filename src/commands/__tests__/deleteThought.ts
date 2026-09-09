import { act } from 'react'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import keyValueBy from '../../util/keyValueBy'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Mount tests required for caret. */
describe('mount', () => {
  it('after deleteEmptyThought, caret should move to end of previous thought', async () => {
    await act(async () => {
      store.dispatch([{ type: 'newThought', value: 'apple' }, { type: 'newThought' }, { type: 'deleteEmptyThought' }])
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Selection.focusOffset a number representing the offset of the selection's anchor within the focusNode. If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of chi,ld nodes of the focusNode preceding the focus.
    // In this case, the selection is at the end of the apple element.
    expect(window.getSelection()?.focusNode?.nodeType).toBe(Node.ELEMENT_NODE)
    expect(window.getSelection()?.focusNode?.textContent).toBe('apple')
    expect(window.getSelection()?.focusOffset).toBe(1)
  })

  it('after merging siblings, caret should be in between', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
          - apple
          - banana`,
        }),
        setCursor(['banana']),
        { type: 'deleteEmptyThought' },
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Selection.focusOffset a number representing the offset of the selection's anchor within the focusNode. If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of chi,ld nodes of the focusNode preceding the focus.
    // In this case, the selection is in the applebanana text node, in between apple and banana.
    expect(window.getSelection()?.focusNode?.nodeType).toBe(Node.TEXT_NODE)
    expect(window.getSelection()?.focusNode?.textContent).toBe('applebanana')
    expect(window.getSelection()?.focusOffset).toBe('apple'.length)
  })
})

it('delete pending descendants', async () => {
  await dispatch(
    importText({
      text: `
  - a
    - b
      - c
        - d
          - e
            - one
            - two
    - x`,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const thoughts = {
    a: contextToThought(state, ['a'])!,
    b: contextToThought(state, ['a', 'b'])!,
    c: contextToThought(state, ['a', 'b', 'c'])!,
    d: contextToThought(state, ['a', 'b', 'c', 'd'])!,
    e: contextToThought(state, ['a', 'b', 'c', 'd', 'e'])!,
    one: contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'one'])!,
    two: contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'two'])!,
    x: contextToThought(state, ['a', 'x'])!,
  }

  // Create a map of { [text]: !!thought } for readable test output
  const thoughtsBeforeRefresh = keyValueBy(thoughts, (text, thought) => ({
    [text]: !!getThoughtById(state, thought.id),
  }))

  expect(thoughtsBeforeRefresh).toEqual({
    a: true,
    b: true,
    c: true,
    d: true,
    e: true,
    one: true,
    two: true,
    x: true,
  })

  // clear and initialize again to reload from local db (simulating page refresh)
  await refreshTestApp()

  await dispatch(setCursor(['a']))

  // wait for the pull queue to load the thoughts within the buffer depth
  await act(vi.runOnlyPendingTimersAsync)

  const stateAfterRefresh = store.getState()

  // Create a map of { [text]: 'loaded' | 'pending' | 'missing' } for readable test output
  const thoughtsAfterRefresh = keyValueBy(thoughts, (text, thought) => {
    const thoughtAfterRefresh = getThoughtById(stateAfterRefresh, thought.id)
    return { [text]: !thoughtAfterRefresh ? 'missing' : thoughtAfterRefresh.pending ? 'pending' : 'loaded' }
  })

  // Only the thoughts within the pull queue's buffer depth are loaded. d is a pending placeholder, and its descendants have not been loaded at all.
  expect(thoughtsAfterRefresh).toEqual({
    a: 'loaded',
    b: 'loaded',
    c: 'loaded',
    x: 'loaded',
    d: 'pending',
    e: 'missing',
    one: 'missing',
    two: 'missing',
  })

  await dispatch(deleteThoughtWithCursor())

  await act(vi.runOnlyPendingTimersAsync)

  const stateNew = store.getState()
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)

  // Create a map of { [text]: !!thought } for readable test output
  const thoughtsAfterDelete = keyValueBy(thoughts, (text, thought) => ({
    [text]: !!getThoughtById(stateNew, thought.id),
  }))

  // all descendants should be removed from the thoughtIndex
  expect(thoughtsAfterDelete).toEqual({
    a: false,
    b: false,
    c: false,
    d: false,
    e: false,
    one: false,
    two: false,
    x: false,
  })

  const lexemes = keyValueBy(thoughts, (text, thought) => ({ [text]: !!getLexeme(stateNew, thought.value) }))

  expect(lexemes).toEqual({
    a: false,
    b: false,
    c: false,
    d: false,
    e: false,
    one: false,
    two: false,
    x: false,
  })
})

it('delete many pending descendants', async () => {
  const text = `
    - Cybersemics
      - Team
        - Work
          - Production Viability
            - Production Performance
              - Front-end
              - Back-end
              - Scaling
            - Native Mobile
              - Can we use the same codebase?
          - Community Building
            - Social Media
            - Podcasts
          - Adoption Infrastructure
            - Import
            - Unit Tests
            - API
        - Structures
          - How much should we work together and how much apart?
            - 1-2x week co-working
            - Tue, Wed, Thu
          - How should we communicate? How should we gracefully handle drops in communication?
            - Slack
            - In person
          - Task tracking?
            - GitHub Issues
            - Notion
              - Project Management
          - Weekly stipend?
            - Milestone based
          - Code style and reviews?
          - Check-in
          - Documentation, Codebase, Tasks, Viability
          - Weekly check
            - Expectations, Requirements
            - Expectations for work relationship
            - Not tied to money
        - Agenda
          - 7/17/19
            - Work Check-In
              - Are we meeting
      `

  await dispatch(importText({ text }))

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const thoughts = {
    Cybersemics: contextToThought(state, ['Cybersemics'])!,
    Team: contextToThought(state, ['Cybersemics', 'Team'])!,
    Work: contextToThought(state, ['Cybersemics', 'Team', 'Work'])!,
    Structures: contextToThought(state, ['Cybersemics', 'Team', 'Structures'])!,
    HowMuch: contextToThought(state, [
      'Cybersemics',
      'Team',
      'Structures',
      'How much should we work together and how much apart?',
    ])!,
    Agenda: contextToThought(state, ['Cybersemics', 'Team', 'Agenda'])!,
    71719: contextToThought(state, ['Cybersemics', 'Team', 'Agenda', '7/17/19'])!,
    ProductionViability: contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Production Viability'])!,
    ProductionPerformance: contextToThought(state, [
      'Cybersemics',
      'Team',
      'Work',
      'Production Viability',
      'Production Performance',
    ])!,
    CommunityBuilding: contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Community Building'])!,
    SocialMedia: contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Community Building', 'Social Media'])!,
    AdoptionInfrastructure: contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Adoption Infrastructure'])!,
    Import: contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Adoption Infrastructure', 'Import'])!,
  }

  // clear and initialize again to reload from local db (simulating page refresh)
  await refreshTestApp()

  await dispatch(setCursor(['Cybersemics']))

  // wait for the pull queue to load the thoughts within the buffer depth
  await act(vi.runOnlyPendingTimersAsync)

  const stateAfterRefresh = store.getState()

  // Create a map of { [text]: 'loaded' | 'pending' | 'missing' } for readable test output
  const thoughtsAfterRefresh = keyValueBy(thoughts, (text, thought) => {
    const thoughtAfterRefresh = getThoughtById(stateAfterRefresh, thought.id)
    return { [text]: !thoughtAfterRefresh ? 'missing' : thoughtAfterRefresh.pending ? 'pending' : 'loaded' }
  })

  // Only the thoughts within the pull queue's buffer depth are loaded, leaving several pending placeholders whose own descendants have not been loaded at all.
  expect(thoughtsAfterRefresh).toEqual({
    Cybersemics: 'loaded',
    Team: 'loaded',
    Work: 'loaded',
    Structures: 'loaded',
    Agenda: 'loaded',
    HowMuch: 'pending',
    ProductionViability: 'pending',
    CommunityBuilding: 'pending',
    AdoptionInfrastructure: 'pending',
    71719: 'pending',
    ProductionPerformance: 'missing',
    SocialMedia: 'missing',
    Import: 'missing',
  })

  await dispatch(deleteThoughtWithCursor())

  await act(vi.runOnlyPendingTimersAsync)

  const stateNew = store.getState()

  // Create a map of { [text]: !!thought } for readable test output
  const thoughtsAfterDelete = keyValueBy(thoughts, (text, thought) => ({
    [text]: !!getThoughtById(stateNew, thought.id),
  }))

  // all descendants should be removed from the thoughtIndex
  expect(thoughtsAfterDelete).toEqual({
    Cybersemics: false,
    Team: false,
    Work: false,
    Structures: false,
    HowMuch: false,
    Agenda: false,
    71719: false,
    ProductionViability: false,
    ProductionPerformance: false,
    CommunityBuilding: false,
    SocialMedia: false,
    AdoptionInfrastructure: false,
    Import: false,
  })

  const lexemes = keyValueBy(thoughts, (text, thought) => ({ [text]: !!getLexeme(stateNew, thought.value) }))

  expect(lexemes).toEqual({
    Cybersemics: false,
    Team: false,
    Work: false,
    Structures: false,
    HowMuch: false,
    Agenda: false,
    71719: false,
    ProductionViability: false,
    ProductionPerformance: false,
    CommunityBuilding: false,
    SocialMedia: false,
    AdoptionInfrastructure: false,
    Import: false,
  })
})
