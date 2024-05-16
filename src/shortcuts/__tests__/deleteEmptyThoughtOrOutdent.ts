import { act } from '@testing-library/react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import clearThoughtShortcut from '../clearThought'
import deleteEmptyThoughtOrOutdent from '../deleteEmptyThoughtOrOutdent'

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

    // This ensures that the thought b exists so we can confirm later that it is deleted.
    const initialExportedData = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(initialExportedData).toBe(`- __ROOT__
  - a
    - b`)

    await act(async () => {
      executeShortcut(clearThoughtShortcut)
      executeShortcut(deleteEmptyThoughtOrOutdent)
    })

    // This ensures that the thought b doesn't exist now.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - a`)
  })
})
