import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newSubthoughtActionCreator as newSubthought } from '../../actions/newSubthought'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut from '../../util/executeShortcut'
import { executeShortcutWithMulticursor } from '../../util/executeShortcut'
import clearThoughtShortcut from '../clearThought'
import deleteEmptyThoughtOrOutdent from '../deleteEmptyThoughtOrOutdent'

/**
 * This has been moved to the top because the rest of the tests aren't getting cleaned up.
 * This should be properly fixed at some point.
 */
describe('DOM', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('delete the thought when user triggered clearThought and then hit back', async () => {
    await act(async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: 'b', insertNewSubthought: true }),
        setCursor(['a', 'b']),
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the thought b exists so we can confirm later that it is deleted.
    const initialExportedData = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(initialExportedData).toBe(`- __ROOT__
  - a
    - b`)

    await act(async () => {
      executeShortcut(clearThoughtShortcut)
      executeShortcut(deleteEmptyThoughtOrOutdent)
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the thought b doesn't exist now.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a`)
  })
})

it('do nothing when there is no cursor', () => {
  const store = createTestStore()

  store.dispatch([{ type: 'newThought', value: 'a' }, setCursor(null)])

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a`

  expect(exported).toEqual(expectedOutput)
})

it('outdent on pressing backspace at the beginning of the thought', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
    setCursor(['a', 'b', 'c']),
  ])

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
  store.dispatch([
    importText({
      text: `
      - a
        - b
          - c
          - d`,
    }),
    setCursor(['a', 'b', 'd']),
  ])

  executeShortcut(deleteEmptyThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - cd`

  expect(exported).toEqual(expectedOutput)
})

describe('multicursor', () => {
  it('deletes multiple empty thoughts', async () => {
    const store = createTestStore()

    store.dispatch([
      newThought({ value: 'a' }),
      newSubthought(),
      setCursor(['a']),
      newThought({ value: 'b' }),
      newSubthought(),
      setCursor(['b']),
      newThought({ value: 'c' }),
      setCursor(['a', '']),
      addMulticursor(['b', '']),
    ])

    executeShortcutWithMulticursor(deleteEmptyThoughtOrOutdent, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - c`

    expect(exported).toEqual(expectedOutput)
  })

  it('outdents multiple only children', async () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
            - a
              - a1
            - b
              - b1
            - c
          `,
      }),
      setCursor(['a', 'a1']),
      addMulticursor(['b', 'b1']),
    ])

    executeShortcutWithMulticursor(deleteEmptyThoughtOrOutdent, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - a1
  - b
  - b1
  - c`

    expect(exported).toEqual(expectedOutput)
  })

  it('handles mixed scenarios correctly', async () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
            - a
            - b
              - b1
            - c
              - c1
              - c2
          `,
      }),
      setCursor(['a']),
      newSubthought(),
      setCursor(['a', '']),
      addMulticursor(['b', 'b1']),
      addMulticursor(['c', 'c1']),
    ])

    executeShortcutWithMulticursor(deleteEmptyThoughtOrOutdent, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    const expectedOutput = `- ${HOME_TOKEN}
  - a
  - b
  - b1
  - c
    - c1
    - c2`

    expect(exported).toEqual(expectedOutput)
  })
})
