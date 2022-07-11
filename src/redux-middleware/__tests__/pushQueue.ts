import _ from 'lodash'
import SimplePath from '../../@types/SimplePath'
import deleteThought from '../../action-creators/deleteThought'
import editThought from '../../action-creators/editThought'
import importText from '../../action-creators/importText'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { DataProvider } from '../../data-providers/DataProvider'
import getLexemeDb from '../../data-providers/data-helpers/getLexeme'
import * as dexie from '../../data-providers/dexie'
import contextToPath from '../../selectors/contextToPath'
import getLexemeState from '../../selectors/getLexeme'
import { store } from '../../store'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import testTimer from '../../test-helpers/testTimer'
import head from '../../util/head'
import parentOf from '../../util/parentOf'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

const db = dexie as DataProvider

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('editing a thought should load the lexeme and merge contexts', async () => {
  // Related issue: https://github.com/cybersemics/em/issues/1074

  fakeTimer.useFakeTimer()

  store.dispatch(
    importText({
      text: `
      - g
        - h
      - a
        - b
          - c
            - d
              - e
                - f`,
    }),
  )

  await fakeTimer.runAllAsync()

  await fakeTimer.useRealTimer()

  expect((await getLexemeDb(db, 'f'))?.contexts).toHaveLength(1)

  const thoughtH = contextToThought(store.getState(), ['g', 'h'])
  const thoughtF = contextToThought(store.getState(), ['a', 'b', 'c', 'd', 'e', 'f'])

  await refreshTestApp()

  fakeTimer.useFakeTimer()

  // lexeme for 'f' should not be loaded into the state yet.
  expect(getLexemeState(store.getState(), 'f')).toBeFalsy()

  const pathGH = contextToPath(store.getState(), ['g', 'h']) as SimplePath

  store.dispatch(
    editThought({
      oldValue: 'h',
      newValue: 'f',
      context: ['g'],
      path: pathGH,
    }),
  )
  await fakeTimer.runAllAsync()

  fakeTimer.useRealTimer()

  // existing Lexemes should be pulled and synced after thought is edited.

  // both db and state should have same updated lexeme
  const thoughtContextsState = getLexemeState(store.getState(), 'f')?.contexts

  // Note: Thought h has been changed to f but the id remains the same
  // check that state has the correct contexts, ignoring order and ids
  expect(thoughtContextsState).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))
  expect(thoughtContextsState).toHaveLength(2)

  // check that db has the correct contexts, ignoring order and ids
  const thoughtContextsDb = (await getLexemeDb(db, 'f'))?.contexts
  expect(thoughtContextsDb).toEqual(expect.arrayContaining([thoughtH?.id, thoughtF?.id]))

  expect(thoughtContextsState).toHaveLength(2)
})

it('inline children of parent should be updated', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
      `,
    }),
  )

  await fakeTimer.runAllAsync()
  await fakeTimer.useRealTimer()

  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!

  await refreshTestApp()

  fakeTimer.useFakeTimer()

  const pathABC = contextToPath(store.getState(), ['a', 'b', 'c']) as SimplePath

  store.dispatch(
    editThought({
      oldValue: 'c',
      newValue: 'cc',
      context: ['a', 'b'],
      path: pathABC,
    }),
  )

  const thoughtCC = contextToThought(store.getState(), ['a', 'b', 'cc'])!
  expect(thoughtCC).toBeTruthy()

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const dbThoughtB = await db.getThoughtWithChildren(thoughtB.id)
  expect(dbThoughtB?.children).toEqual({
    [thoughtCC.id]: _.pick(thoughtCC, ['id', 'childrenMap', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value']),
  })
})

it('on delete, inline children of parent and grandparent should be deleted', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
      `,
    }),
  )

  await fakeTimer.runAllAsync()
  await fakeTimer.useRealTimer()

  const thoughtA = contextToThought(store.getState(), ['a'])!
  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  const thoughtC = contextToThought(store.getState(), ['a', 'b', 'c'])!

  const pathABC = contextToPath(store.getState(), ['a', 'b', 'c']) as SimplePath

  const dbThoughtABefore = await dexie.db.thoughtIndex.get(thoughtA.id)
  const dbThoughtBBefore = await dexie.db.thoughtIndex.get(thoughtB.id)

  expect(dbThoughtBBefore?.children).toEqual({
    [thoughtC.id]: thoughtC,
  })
  expect(dbThoughtABefore?.children[thoughtB.id]?.childrenMap).toEqual({
    [thoughtC.id]: thoughtC.id,
  })

  fakeTimer.useFakeTimer()

  store.dispatch(
    deleteThought({
      pathParent: parentOf(pathABC),
      thoughtId: head(pathABC),
    }),
  )

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  expect(contextToThought(store.getState(), ['a'])).toBeTruthy()
  expect(contextToThought(store.getState(), ['a', 'b'])).toBeTruthy()
  expect(contextToThought(store.getState(), ['a', 'b', 'c'])).toBeFalsy()

  fakeTimer.useFakeTimer()
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const dbThoughtAAfter = await dexie.db.thoughtIndex.get(thoughtA.id)
  const dbThoughtBAfter = await dexie.db.thoughtIndex.get(thoughtB.id)

  expect(dbThoughtBAfter?.children).toEqual({})
  expect(dbThoughtAAfter?.children[thoughtB.id]?.childrenMap).toEqual({})
})

it('on root thought, inline children of parent and grandparent should be deleted', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
      `,
    }),
  )

  await fakeTimer.runAllAsync()
  await fakeTimer.useRealTimer()

  const thoughtA = contextToThought(store.getState(), ['a'])!
  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  const thoughtC = contextToThought(store.getState(), ['a', 'b', 'c'])!

  const pathA = contextToPath(store.getState(), ['a']) as SimplePath

  const dbThoughtRootBefore = await dexie.db.thoughtIndex.get(HOME_TOKEN)
  const dbThoughtABefore = await dexie.db.thoughtIndex.get(thoughtA.id)
  const dbThoughtBBefore = await dexie.db.thoughtIndex.get(thoughtB.id)

  expect(dbThoughtBBefore?.children).toEqual({
    [thoughtC.id]: thoughtC,
  })
  expect(dbThoughtABefore?.children[thoughtB.id]?.childrenMap).toEqual({
    [thoughtC.id]: thoughtC.id,
  })
  expect(dbThoughtRootBefore?.children[thoughtA.id]?.childrenMap).toEqual({
    [thoughtB.id]: thoughtB.id,
  })

  fakeTimer.useFakeTimer()

  store.dispatch(
    deleteThought({
      pathParent: HOME_PATH,
      thoughtId: head(pathA),
    }),
  )

  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  expect(contextToThought(store.getState(), ['a'])).toBeFalsy()
  expect(contextToThought(store.getState(), ['a', 'b'])).toBeFalsy()
  expect(contextToThought(store.getState(), ['a', 'b', 'c'])).toBeFalsy()

  fakeTimer.useFakeTimer()
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()

  const dbThoughtRootAfter = await dexie.db.thoughtIndex.get(HOME_TOKEN)
  const dbThoughtAAfter = await dexie.db.thoughtIndex.get(thoughtA.id)
  const dbThoughtBAfter = await dexie.db.thoughtIndex.get(thoughtB.id)

  expect(dbThoughtBAfter).toBeFalsy()
  expect(dbThoughtAAfter).toBeFalsy()
  expect(dbThoughtRootAfter!.children).toEqual({})
})
