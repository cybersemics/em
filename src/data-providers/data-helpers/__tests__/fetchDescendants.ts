import all from 'it-all'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { HOME_TOKEN } from '../../../constants'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../../util/initialState'
import db, { thoughtspaceRuntime } from '../../thoughtspace'
import fetchDescendants from '../fetchDescendants'

beforeEach(initStore)
afterEach(async () => {
  await waitForThoughtspaceIdle()
  await thoughtspaceRuntime.drop()
  vi.useRealTimers()
})

it('yields persisted thoughts breadth-first across sibling branches', async () => {
  store.dispatch(importText({ text: '- a\n  - b\n    - c\n- x\n  - y\n    - z' }))
  await waitForThoughtspaceIdle()

  const chunks = await all(fetchDescendants(db, HOME_TOKEN, initialState))

  expect(chunks.map(chunk => Object.values(chunk.thoughtIndex).map(thought => thought.value))).toEqual([
    [HOME_TOKEN],
    ['a', 'x'],
    ['b', 'y'],
    ['c', 'z'],
  ])
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
