import { store } from '../../store'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getThought } from '../../selectors'
import { clear, newThought } from '../../action-creators'
import initDB, * as db from '../dexie'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import getContext from '../data-helpers/getContext'
import dbGetThought from '../data-helpers/getThought'
import testTimer from '../../test-helpers/testTimer'

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
  })

  it('load settings into indexedDB on initialization', async () => {
    const thoughtState = getThought(store.getState(), 'Settings')

    expect(thoughtState).not.toBeUndefined()
    expect(thoughtState!.contexts).toHaveLength(1)

    const thoughtDB = await dbGetThought(db, 'Settings')

    expect(thoughtDB).not.toBeUndefined()
    expect(thoughtDB!.contexts).toHaveLength(1)

    expect(thoughtState!.contexts[0].id).toEqual(thoughtDB!.contexts[0].id)
  })

  it('persist newThought', async () => {

    fakeTimer.useFakeTimer()

    store.dispatch(newThought({ value: 'a' }))

    await fakeTimer.runAllAsync()

    fakeTimer.useRealTimer()

    // Note: Always use real timer before awaiting db calls. https://github.com/cybersemics/em/issues/919#issuecomment-739135971
    const parentEntryRoot = await getContext(db, [HOME_TOKEN])

    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })
  })

  it('persist existingThoughtChange', async () => {

    fakeTimer.useFakeTimer()

    store.dispatch([
      { type: 'newThought', value: '' },
      {
        type: 'existingThoughtChange',
        context: [HOME_TOKEN],
        oldValue: '',
        newValue: 'a',
        path: [{ value: '', rank: 0 }],
      }
    ])

    await fakeTimer.runAllAsync()

    fakeTimer.useRealTimer()

    const parentEntryRoot = await getContext(db, [HOME_TOKEN])

    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

  })
})
