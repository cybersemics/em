import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { refreshTestApp } from '../../test-helpers/createTestApp'
import { deleteThoughtAtFirstMatchActionCreator } from '../../test-helpers/deleteThoughtAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

let cleanup: () => void

/** Exports the canonical document independently of Redux's published thoughts and navigation. */
const exportDocument = () =>
  exportContext({ ...initialState(), thoughts: thoughtspaceRuntime.project() }, [HOME_TOKEN], 'text/plain')

beforeEach(async () => {
  await initStore()
  ;({ cleanup } = await initialize({ storage: 'memory' }))
  await vi.runOnlyPendingTimersAsync()
})

afterEach(async () => {
  cleanup()
  await vi.runAllTimersAsync()
  await waitForThoughtspaceIdle()
})

it('disables isLoading after initialize', () => {
  expect(store.getState().isLoading).toBe(false)
})

it('explicit clearing deletes the document and stays deleted after reinitialization', async () => {
  await store.dispatch(importText({ text: '- a\n  - b\n    - c' }))
  await store.dispatch(clear({ persist: true }))

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)

  await refreshTestApp()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)
})

it('clear resets navigation without evicting the complete document', async () => {
  store.dispatch(newThought({ value: 'a' }))
  await vi.runOnlyPendingTimersAsync()
  const thoughtA = contextToThought(store.getState(), ['a'])!
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - a`)

  store.dispatch(clear())

  expect(store.getState().cursor).toBeNull()
  expect(store.getState().thoughts.thoughtIndex[thoughtA.id]).toEqual(thoughtA)
  expect(store.getState().isLoading).toBe(false)
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - a`)

  await refreshTestApp()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a`)
  expect(contextToThought(store.getState(), ['a'])!.id).toBe(thoughtA.id)
})

it('does not repopulate a deleted thought', async () => {
  store.dispatch([
    newThought({}),
    deleteThoughtAtFirstMatchActionCreator(['']),
    // deleteThought does not update the cursor; the user-facing deleteThoughtWithCursor command normally does.
    setCursor(null),
  ])
  await vi.runOnlyPendingTimersAsync()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)
})

it('publishes every descendant before initialization completes', async () => {
  await store.dispatch(importText({ text: '- a\n  - b\n    - c\n      - d\n        - e' }))
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
        - d
          - e`)

  await refreshTestApp()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
        - d
          - e`)
})

it('deletes an entire deep subtree after reinitialization', async () => {
  await store.dispatch(importText({ text: '- x\n- a\n  - b\n    - c\n      - d\n        - e' }))
  store.dispatch(setCursor(['x']))
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - b
      - c
        - d
          - e`)
  await refreshTestApp()

  // Delete without navigating into the deep subtree.
  store.dispatch(deleteThoughtAtFirstMatchActionCreator(['a']))
  await vi.runAllTimersAsync()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - x`)
})

it('moves an entire deep subtree after reinitialization', async () => {
  await store.dispatch(importText({ text: '- x\n- a\n  - m\n  - b\n    - c\n      - d\n        - e' }))
  store.dispatch(setCursor(['x']))
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - m
    - b
      - c
        - d
          - e`)
  await refreshTestApp()

  // Move without navigating into the deep subtree.
  store.dispatch(moveThoughtAtFirstMatchActionCreator({ from: ['a'], to: ['x', 'a'], after: null }))
  await vi.runOnlyPendingTimersAsync()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x
    - a
      - m
      - b
        - c
          - d
            - e`)
  expect(store.getState().thoughts).toEqual(thoughtspaceRuntime.project())
})

it('edits a deep subtree root after reinitialization', async () => {
  await store.dispatch(importText({ text: '- x\n- a\n  - m\n  - b\n    - c\n      - d\n        - e' }))
  store.dispatch(setCursor(['x']))
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x
  - a
    - m
    - b
      - c
        - d
          - e`)
  await refreshTestApp()

  // Edit without navigating into the deep subtree.
  store.dispatch(editThought(['a'], 'k'))
  await vi.runAllTimersAsync()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - x
  - k
    - m
    - b
      - c
        - d
          - e`)
  expect(store.getState().thoughts).toEqual(thoughtspaceRuntime.project())
})
