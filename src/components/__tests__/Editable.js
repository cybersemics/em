import { store } from '../../store'
import { createTestApp } from '../../setupTests'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { equalArrays, pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Editable from '../Editable'
import ContentEditable from 'react-contenteditable'
import { noop } from 'lodash'
import { exportContext } from '../../selectors'

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = context => node => equalArrays(pathToContext(node.props().thoughtsRanked), context)

beforeAll(async () => {
  await createTestApp()
})

afterEach(async () => {
  store.dispatch({ type: 'clear' })
})

it('indent on adding space at the beginning of the thought', async () => {

  await store.dispatch(importText(RANKED_ROOT, `
    - a
      - b
        - c
        - d`))

  await store.dispatch({
    type: 'setCursor',
    thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }, { value: 'd', rank: 3 }],
    flag: true })

  document.wrapper.update()

  const editable = document.wrapper
    .find(Editable)
    .filterWhere(whereContext(['a', 'b', 'd']))
    .first()

  const contentEditable = editable.find(ContentEditable).first()

  // add space at the begining of the thought
  contentEditable.simulate('change', { preventDefault: noop, target: { value: ' d' } })

  document.wrapper.update()

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
        - d`

  expect(exported).toEqual(expectedOutput)
})

it('prevent indent on adding space at the beginning of the immovable thought', async () => {

  await store.dispatch(importText(RANKED_ROOT, `
    - a
      - b
        - c
        - d
          - =immovable`))

  await store.dispatch({
    type: 'setCursor',
    thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'b', rank: 1 }, { value: 'd', rank: 3 }],
    flag: true })

  document.wrapper.update()

  const editable = document.wrapper
    .find(Editable)
    .filterWhere(whereContext(['a', 'b', 'd']))
    .first()

  const contentEditable = editable.find(ContentEditable).first()

  // add space at the begining of the thought
  contentEditable.simulate('change', { preventDefault: noop, target: { value: ' d' } })

  document.wrapper.update()

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  // indent shouldn't happen and output should remain the same
  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
      - c
      - d
        - =immovable`

  expect(exported).toEqual(expectedOutput)
})
