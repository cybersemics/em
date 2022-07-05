import clear from '../../action-creators/clear'
import deleteThoughtWithCursor from '../../action-creators/deleteThoughtWithCursor'
import importTextAction from '../../action-creators/importText'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
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
  const thoughtA = contextToThought(state, ['a'])!
  const thoughtB = contextToThought(state, ['a', 'b'])!
  const thoughtC = contextToThought(state, ['a', 'b', 'c'])!
  const thoughtD = contextToThought(state, ['a', 'b', 'c', 'd'])!
  const thoughtE = contextToThought(state, ['a', 'b', 'c', 'd', 'e'])!
  const thoughtOne = contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'one'])!
  const thoughtTwo = contextToThought(state, ['a', 'b', 'c', 'd', 'e', 'two'])!
  const thoughtX = contextToThought(state, ['a', 'x'])!

  expect(thoughtA).toBeTruthy()
  expect(thoughtB).toBeTruthy()
  expect(thoughtC).toBeTruthy()
  expect(thoughtD).toBeTruthy()
  expect(thoughtE).toBeTruthy()
  expect(thoughtOne).toBeTruthy()
  expect(thoughtTwo).toBeTruthy()
  expect(thoughtX).toBeTruthy()

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  initialize()
  await timer.runAllAsync()

  appStore.dispatch([setCursor(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  const stateAfterRefresh = appStore.getState()

  expect(getThoughtById(stateAfterRefresh, thoughtA.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtB.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtC.id)).toBeTruthy()
  expect(getThoughtById(stateAfterRefresh, thoughtD.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtE.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtOne.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtTwo.id)).toBeFalsy()
  expect(getThoughtById(stateAfterRefresh, thoughtX.id)).toBeTruthy()

  timer.useFakeTimer()

  appStore.dispatch([deleteThoughtWithCursor({})])

  await timer.runAllAsync()

  timer.useRealTimer()

  const stateNew = appStore.getState()
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)

  expect(getThoughtById(stateNew, thoughtA.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtB.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtC.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtD.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtE.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtOne.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtTwo.id)).toBeFalsy()
  expect(getThoughtById(stateNew, thoughtX.id)).toBeFalsy()
})

it('delete more pending descendants', async () => {
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
  const thoughtCybersemics = contextToThought(state, ['Cybersemics'])!
  const thoughtTeam = contextToThought(state, ['Cybersemics', 'Team'])!
  const thoughtWork = contextToThought(state, ['Cybersemics', 'Team', 'Work'])!
  const thoughtStructures = contextToThought(state, ['Cybersemics', 'Team', 'Structures'])!
  const thoughtHowMuch = contextToThought(state, [
    'Cybersemics',
    'Team',
    'Structures',
    'How much should we work together and how much apart?',
  ])!
  const thoughtAgenda = contextToThought(state, ['Cybersemics', 'Team', 'Agenda'])!
  const thought71719 = contextToThought(state, ['Cybersemics', 'Team', 'Agenda', '7/17/19'])!
  const thoughtProductionViability = contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Production Viability'])!
  const thoughtProductionPerformance = contextToThought(state, [
    'Cybersemics',
    'Team',
    'Work',
    'Production Viability',
    'Production Performance',
  ])!
  const thoughtCommunity = contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Community Building'])!
  const thoughtSocialMedia = contextToThought(state, [
    'Cybersemics',
    'Team',
    'Work',
    'Community Building',
    'Social Media',
  ])!
  const thoughtAdoption = contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Adoption Infrastructure'])!
  const thoughtImport = contextToThought(state, ['Cybersemics', 'Team', 'Work', 'Adoption Infrastructure', 'Import'])!

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

  const ids = {
    Cybersemics: thoughtCybersemics.id,
    Team: thoughtTeam.id,
    Work: thoughtWork.id,
    Structures: thoughtStructures.id,
    HowMuch: thoughtHowMuch.id,
    Agenda: thoughtAgenda.id,
    '71719': thought71719.id,
    'Production Viability': thoughtProductionViability.id,
    'Production Performance': thoughtProductionPerformance.id,
    'Community Building': thoughtCommunity.id,
    'Social Media': thoughtSocialMedia.id,
    'Adoption Infrastructure': thoughtAdoption.id,
    Import: thoughtImport.id,
  }

  // Create a map of { [text]: !!thought } for readable test output
  const thoughts = keyValueBy(ids, (text, id) => ({ [text]: !!getThoughtById(stateNew, id) }))

  expect(thoughts).toEqual({
    Cybersemics: false,
    Team: false,
    Work: false,
    Structures: false,
    HowMuch: false,
    Agenda: false,
    '71719': false,
    'Production Viability': false,
    'Production Performance': false,
    'Community Building': false,
    'Social Media': false,
    'Adoption Infrastructure': false,
    Import: false,
  })
})
