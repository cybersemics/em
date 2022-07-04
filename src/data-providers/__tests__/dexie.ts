import clear from '../../action-creators/clear'
import newThought from '../../action-creators/newThought'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getLexeme from '../../selectors/getLexeme'
import { store } from '../../store'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import { editThoughtByContextActionCreator } from '../../test-helpers/editThoughtByContext'
import testTimer from '../../test-helpers/testTimer'
import storage from '../../util/storage'
import getContext from '../data-helpers/getContext'
import dbGetThought from '../data-helpers/getLexeme'
import initDB, * as db from '../dexie'

/*
  Note: sinon js fake timer is used to overcome some short comming we have with jest's fake timer.
  For details: https://github.com/cybersemics/em/issues/919#issuecomment-739135971
*/

const fakeTimer = testTimer()

describe('dexie', () => {
  beforeEach(initDB)
  afterEach(db.clearAll)
  dataProviderTest(db)
})

describe('integration', () => {
  beforeEach(async () => {
    fakeTimer.useFakeTimer()
    initialize()
    await fakeTimer.runAllAsync()
    fakeTimer.useRealTimer()
  })

  afterEach(async () => {
    fakeTimer.useRealTimer()
    store.dispatch(clear())
    await db.clearAll()
    storage.clear()
  })

  // TODO: Fix regression from 1089c96071
  it.skip('load settings into indexedDB on initialization', async () => {
    const thoughtState = getLexeme(store.getState(), 'Settings')

    expect(thoughtState).not.toBeUndefined()
    expect(thoughtState!.contexts).toHaveLength(1)

    const thoughtDB = await dbGetThought(db, 'Settings')

    expect(thoughtDB).not.toBeUndefined()
  })

  it('persist newThought', async () => {
    fakeTimer.useFakeTimer()

    store.dispatch(newThought({ value: 'a' }))

    await fakeTimer.runAllAsync()

    fakeTimer.useRealTimer()

    const thoughtAId = contextToThoughtId(store.getState(), ['a'])!

    // Note: Always use real timer before awaiting db calls. https://github.com/cybersemics/em/issues/919#issuecomment-739135971
    const root = await getContext(db, [HOME_TOKEN])

    expect(root).toMatchObject({
      childrenMap: { [thoughtAId]: thoughtAId },
    })
  })

  it('persist editThought', async () => {
    fakeTimer.useFakeTimer()

    store.dispatch([
      { type: 'newThought', value: '' },
      editThoughtByContextActionCreator({
        at: [''],
        oldValue: '',
        newValue: 'a',
        rankInContext: 0,
      }),
    ])

    await fakeTimer.runAllAsync()

    const thoughtAId = contextToThoughtId(store.getState(), ['a'])!

    fakeTimer.useRealTimer()

    const root = await getContext(db, [HOME_TOKEN])

    expect(root).toMatchObject({
      childrenMap: { [thoughtAId]: thoughtAId },
    })
  })
})
