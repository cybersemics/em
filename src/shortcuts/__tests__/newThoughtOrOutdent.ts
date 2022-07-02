import importText from '../../action-creators/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { createTestStore } from '../../test-helpers/createTestStore'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import newSubthought from '../newSubthought'
import newThoughtOrOutdent from '../newThoughtOrOutdent'

it('empty thought should outdent when hit enter', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
              - d
                - e
                  - f`,
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c', 'd', 'e', 'f']),
  ])

  // create a new empty subthought
  executeShortcut(newSubthought, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  const expectedOutput = `- ${HOME_TOKEN}
  - a
    - b
      - c
        - d
          - e
            - f
        - `

  expect(exported).toEqual(expectedOutput)
})
