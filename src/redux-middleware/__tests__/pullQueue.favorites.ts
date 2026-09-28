import { act } from 'react'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import db from '../../data-providers/thoughtspace'
import createTestApp, { cleanupTestApp, refreshTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import hashThought from '../../util/hashThought'

// createTestApp is called inside each test rather than in beforeEach, because the favorites pull happens during app
// initialization and the spy has to be installed before it.
afterEach(async () => {
  await cleanupTestApp()
  vi.restoreAllMocks()
})

// https://github.com/cybersemics/em/issues/5254
it('first test pulls favorites', async () => {
  const getLexemeById = vi.spyOn(db, 'getLexemeById')
  await createTestApp()
  await dispatch(newThought({ value: 'a' }))
  await act(() => vi.runAllTimersAsync())

  expect(getLexemeById.mock.calls.filter(([key]) => key === hashThought('=favorite')).length).toBeGreaterThan(0)
})

it('second test pulls favorites', async () => {
  const getLexemeById = vi.spyOn(db, 'getLexemeById')
  await createTestApp()
  await dispatch(newThought({ value: 'a' }))
  await act(() => vi.runAllTimersAsync())

  expect(getLexemeById.mock.calls.filter(([key]) => key === hashThought('=favorite')).length).toBeGreaterThan(0)
})

it('pulls favorites once per session, not again after a clear', async () => {
  const getLexemeById = vi.spyOn(db, 'getLexemeById')
  await createTestApp()
  await dispatch(newThought({ value: 'a' }))
  await act(() => vi.runAllTimersAsync())
  const pullsBefore = getLexemeById.mock.calls.filter(([key]) => key === hashThought('=favorite')).length

  await refreshTestApp()
  await dispatch(newThought({ value: 'b' }))
  await act(() => vi.runAllTimersAsync())

  expect(getLexemeById.mock.calls.filter(([key]) => key === hashThought('=favorite')).length).toBe(pullsBefore)
})
