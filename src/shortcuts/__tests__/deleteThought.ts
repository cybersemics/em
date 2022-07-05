import clear from '../../action-creators/clear'
import deleteThoughtWithCursor from '../../action-creators/deleteThoughtWithCursor'
import importTextAction from '../../action-creators/importText'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import { getLexeme } from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import { store as appStore } from '../../store'
import contextToThought from '../../test-helpers/contextToThought'
import { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import testTimer from '../../test-helpers/testTimer'
import keyValueBy from '../../util/keyValueBy'

const timer = testTimer()

// Note: Since we are using intialize for these tests, we need to make sure to cleanup dbs, storage and window location.
afterEach(async () => await cleanupTestApp())

it('delete pending descendants', async () => {
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

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  const state = appStore.getState()

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
  appStore.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  appStore.dispatch([setCursor(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  const stateAfterRefresh = appStore.getState()

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

  appStore.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

  const stateNew = appStore.getState()
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

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  const state = appStore.getState()

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
  appStore.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  appStore.dispatch([setCursor(['Cybersemics'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  timer.useFakeTimer()

  appStore.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

  const stateNew = appStore.getState()

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
