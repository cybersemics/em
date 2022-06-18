import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import contextToPath from '../../selectors/contextToPath'
import importText from '../../action-creators/importText'
import setCursor from '../../action-creators/setCursor'
import { createTestStore } from '../../test-helpers/createTestStore'
import indentOnSpace from '../indentOnSpace'
import executeShortcut from '../../test-helpers/executeShortcut'

it('indent on adding space at the beginning of the thought', () => {
  const store = createTestStore()

  store.dispatch(
    importText({
      text: `
        - a
          - b
            - c
            - d
  `,
    }),
  )

  store.dispatch(setCursor({ path: contextToPath(store.getState(), ['a', 'b', 'd']) }))

  executeShortcut(indentOnSpace, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - c
        - d`

  expect(exported).toEqual(expectedOutput)
})

it('prevent indent on adding space at the beginning of the immovable thought', () => {
  const store = createTestStore()

  store.dispatch(
    importText({
      text: `
        - a
          - b
            - c
            - d
              - =immovable
  `,
    }),
  )

  store.dispatch(setCursor({ path: contextToPath(store.getState(), ['a', 'b', 'd']) }))

  executeShortcut(indentOnSpace, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  // indent shouldn't happen and output should remain the same
  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - c
      - d
        - =immovable`

  expect(exported).toEqual(expectedOutput)
})
