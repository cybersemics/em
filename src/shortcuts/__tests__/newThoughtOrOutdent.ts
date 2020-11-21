import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'
import newSubthought from '../newSubthought'
import newThoughtOrOutdent from '../newThoughtOrOutdent'
import executeShortcut from '../../test-helpers/executeShortcut'

it('empty thought should outdent when hit enter', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `
      - a
        - b
          - c
            - d
              - e
                - f
  ` })

  store.dispatch({ type: 'setCursor', path: [
    { value: 'a', rank: '0' },
    { value: 'b', rank: '1' },
    { value: 'c', rank: '2' },
    { value: 'd', rank: '3' },
    { value: 'e', rank: '4' },
    { value: 'f', rank: '5' },
  ] })

  // create a new empty subthought
  executeShortcut(newSubthought, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  // this should cause outdent instead of creating new thought
  executeShortcut(newThoughtOrOutdent, { store })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d
          - e
            - f
        -${' '}`

  expect(exported).toEqual(expectedOutput)
})
