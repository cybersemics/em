import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import contextToPath from '../../selectors/contextToPath'
import importText from '../../action-creators/importText'
import setCursor from '../../action-creators/setCursor'
import newThought from '../../action-creators/newThought'
import { store } from '../../store'
import { createTestStore } from '../../test-helpers/createTestStore'
import deleteEmptyThoughtOrOutdent from '../deleteEmptyThoughtOrOutdent'
import executeShortcut from '../../test-helpers/executeShortcut'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import clearThoughtShortcut from '../clearThought'
import { Thunk } from '../../@types'

it('do nothing when there is no cursor', () => {
  const store = createTestStore()

  store.dispatch([{ type: 'newThought', value: 'a' }, setCursor({ path: null })])

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a`

  expect(exported).toEqual(expectedOutput)
})

it('outdent on pressing backspace at the beginning of the thought', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
  `,
    }),
  )

  store.dispatch(setCursor({ path: contextToPath(store.getState(), ['a', 'b', 'c']) }))

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
    - c`

  expect(exported).toEqual(expectedOutput)
})

it('do not outdent thought with siblings', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch(
    importText({
      text: `
      - a
        - b
          - c
          - d`,
    }),
  )

  store.dispatch(setCursor({ path: contextToPath(store.getState(), ['a', 'b', 'd']) }))

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - cd`

  expect(exported).toEqual(expectedOutput)
})

describe('DOM', () => {
  beforeEach(async () => {
    await createTestApp()
  })

  afterEach(cleanupTestApp)

  it('delete the thought when user triggered clearThought and then hit back', async () => {
    store.dispatch([
      newThought({ value: 'a' }),
      newThought({ value: 'b', insertNewSubthought: true }),
      (): Thunk => (_, getState) => setCursor({ path: contextToPath(getState(), ['a', 'b']) }),
    ])

    // This ensures that the thought b exists so we can confirm later that it is deleted.
    const initialExportedData = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(initialExportedData).toBe(`- __ROOT__
  - a
    - b`)

    executeShortcut(clearThoughtShortcut, { store })

    jest.runOnlyPendingTimers()

    executeShortcut(deleteEmptyThoughtOrOutdent, { store })

    // This ensures that the thought b doesn't exist now.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a`)
  })
})
