import { act } from '@testing-library/react'
import { clearActionCreator as clear } from '../../actions/clear'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'
import keyValueBy from '../../util/keyValueBy'

const timer = testTimer()

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Mount tests required for caret. */
describe('mount', () => {
  it('after deleteEmptyThought, caret should move to end of previous thought', async () => {
    await act(async () => {
      store.dispatch([{ type: 'newThought', value: 'apple' }, { type: 'newThought' }, { type: 'deleteEmptyThought' }])
    })

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

    // Selection.focusOffset a number representing the offset of the selection's anchor within the focusNode. If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of chi,ld nodes of the focusNode preceding the focus.
    // In this case, the selection is in the applebanana text node, in between apple and banana.
    expect(window.getSelection()?.focusNode?.nodeType).toBe(Node.TEXT_NODE)
    expect(window.getSelection()?.focusNode?.textContent).toBe('applebanana')
    expect(window.getSelection()?.focusOffset).toBe('apple'.length)
  })
})

// TODO: Fix test
it.skip('delete pending descendants', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

  // c will be pending after refresh
  const text = `
  - a
    - b
      -c
        - d
          - e
            - one
            - two
    - x`

  store.dispatch(importText({ text }))
  await timer.runAllAsync()

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

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  store.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  store.dispatch([setCursor(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  const stateAfterRefresh = store.getState()

  // Create a map of { [text]: !!thought } for readable test output
  const thoughtsAfterRefresh = keyValueBy(thoughts, (text, thought) => ({
    [text]: !!getThoughtById(stateAfterRefresh, thought.id),
  }))

  expect(thoughtsAfterRefresh).toEqual({
    a: true,
    b: true,
    c: true,
    x: true,
    // pending
    d: false,
    e: false,
    one: false,
    two: false,
  })

  timer.useFakeTimer()

  store.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

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

// TODO: y-indexeddb breaks tests so it is disabled
it.skip('delete many pending descendants', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

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

  store.dispatch(importText({ text }))
  await timer.runAllAsync()

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

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  store.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  store.dispatch([setCursor(['Cybersemics'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  timer.useFakeTimer()

  store.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

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
