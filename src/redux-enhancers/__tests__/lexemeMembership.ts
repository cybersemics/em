import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it.each(['create', 'rename'] as const)('includes deep memberships immediately after %s and refresh', async mode => {
  await dispatch(importText({ text: '- a\n- b\n  - c\n    - d\n      - e\n        - f' }))
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
