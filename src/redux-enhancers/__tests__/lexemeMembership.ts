import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { initialize } from '../../initialize'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { refreshTestApp } from '../../test-helpers/createTestApp'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'

let cleanup: () => void

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

it.each(['create', 'rename'] as const)('includes deep memberships immediately after %s and refresh', async mode => {
  await store.dispatch(importText({ text: '- a\n- b\n  - c\n    - d\n      - e\n        - f' }))
  const deepId = contextToThought(store.getState(), ['b', 'c', 'd', 'e', 'f'])!.id
  await refreshTestApp()
  expect(getLexeme(store.getState(), 'f')?.contexts).toEqual([deepId])

  // No timer or storage flush between the command and its complete context count.
  if (mode === 'create') store.dispatch([setCursorFirstMatch(['a']), newThought({ value: 'f' })])
  else store.dispatch(editThought(['a'], 'f'))
  const rootId = contextToThought(store.getState(), ['f'])!.id
  expect(getLexeme(store.getState(), 'f')?.contexts).toEqual([deepId, rootId].sort())

  await refreshTestApp()
  expect(getLexeme(store.getState(), 'f')?.contexts).toEqual([deepId, rootId].sort())
})
