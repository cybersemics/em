import { screen } from '@testing-library/dom'
import { act } from 'react'
import SimplePath from '../../@types/SimplePath'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('basic note', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =note
          - foo`,
    }),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})

it('re-render note when =note subthought value changes', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =note
          - foo`,
    }),
    setCursor(['a', '=note', 'foo']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: 'foo',
          newValue: 'bar',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('bar')
  expect(element)
})

it('render note when subthought is edited from non-attribute', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - note
          - foo`,
    }),
    setCursor(['a', 'note']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: 'note',
          newValue: '=note',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})

it('render note when subthought is edited from non-note attribute', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =test
          - foo`,
    }),
    setCursor(['a', '=test']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: '=test',
          newValue: '=note',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})
