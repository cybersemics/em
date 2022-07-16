import { screen } from '@testing-library/dom'
import SimplePath from '../../@types/SimplePath'
import editThought from '../../action-creators/editThought'
import importText from '../../action-creators/importText'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('basic note', async () => {
  store.dispatch([
    importText({
      text: `
      - a
        - =note
          - foo`,
    }),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  const element = screen.getByText('foo')
  expect(element)
})

it('re-render note when =note subthought value changes', async () => {
  store.dispatch([
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
          context: ['a', '=note', 'foo'],
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  const element = screen.getByText('bar')
  expect(element)
})

it('render note when subthought is edited from non-attribute', async () => {
  store.dispatch([
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
          context: ['a', 'note'],
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  const element = screen.getByText('foo')
  expect(element)
})

it('render note when subthought is edited from non-note attribute', async () => {
  store.dispatch([
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
          context: ['a', '=test'],
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  const element = screen.getByText('foo')
  expect(element)
})
