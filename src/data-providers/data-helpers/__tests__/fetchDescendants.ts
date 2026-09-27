import all from 'it-all'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { EM_TOKEN, HOME_TOKEN } from '../../../constants'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../../util/initialState'
import mergeThoughts from '../../../util/mergeThoughts'
import db, { thoughtspaceRuntime } from '../../thoughtspace'
import fetchDescendants from '../fetchDescendants'

beforeEach(initStore)
afterEach(async () => {
  await waitForThoughtspaceIdle()
  await thoughtspaceRuntime.drop()
  vi.useRealTimers()
})

it('buffers branches at the depth limit while still loading leaves and attributes', async () => {
  store.dispatch(importText({ text: '- leaf\n- branch\n  - child\n- =note\n  - content' }))
  await waitForThoughtspaceIdle()

  const chunks = await all(fetchDescendants(db, HOME_TOKEN, initialState, { maxDepth: 1 }))

  expect(chunks.map(chunk => Object.values(chunk.thoughtIndex).map(({ value, pending }) => [value, pending]))).toEqual([
    [[HOME_TOKEN, false]],
    [
      ['leaf', false],
      ['branch', true],
      ['=note', true],
    ],
    [['content', false]],
  ])
})

it('loads EM descendants beyond the depth limit while buffering the other requested root', async () => {
  store.dispatch(importText({ text: '- branch\n  - child' }))
  store.dispatch(importText({ path: [EM_TOKEN], text: '- preference\n  - option\n    - value' }))
  await waitForThoughtspaceIdle()

  const chunks = await all(fetchDescendants(db, [HOME_TOKEN, EM_TOKEN], initialState, { maxDepth: 1 }))

  const values = Object.values(mergeThoughts(...chunks).thoughtIndex).map(thought => thought.value)
  expect(values).toEqual(expect.arrayContaining(['branch', 'preference', 'option', 'value']))
  expect(values).not.toContain('child')
})

it('loads pin metadata together and continues through children of a pinned parent at the depth limit', async () => {
  store.dispatch(importText({ text: '- parent\n  - =pin\n    - true\n  - child\n    - grandchild' }))
  await waitForThoughtspaceIdle()

  const chunks = await all(fetchDescendants(db, HOME_TOKEN, initialState, { maxDepth: 2 }))

  expect(Object.values(chunks[1].thoughtIndex).map(thought => thought.value)).toEqual(['parent', '=pin', 'true'])
  expect(Object.values(mergeThoughts(...chunks).thoughtIndex).map(thought => thought.value)).toEqual([
    HOME_TOKEN,
    'parent',
    '=pin',
    'true',
    'child',
    'grandchild',
  ])
})
