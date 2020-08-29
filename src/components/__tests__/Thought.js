import { store } from '../../store'
import { getThoughtsRanked } from '../../selectors'
import windowEvent from '../../test-helpers/windowEvent'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { act } from 'react-dom/test-utils'

let wrapper = null // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
  wrapper = null
})

it('create, navigate, and edit thoughts', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // create subthought
  windowEvent('keydown', { key: 'Enter', ctrlKey: true })
  wrapper.update()
  const editableSubthought = wrapper.find('.children .children div.editable')
  await editableSubthought.simulate('change', { target: { value: 'a1' } })

  // cursor back
  windowEvent('keydown', { key: 'Escape' })

  // create top subthought
  windowEvent('keydown', { key: 'Enter', shiftKey: true, ctrlKey: true })

  act(jest.runOnlyPendingTimers)

  // state
  const subthoughts = getThoughtsRanked(store.getState(), ['a'])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a1', rank: 0 })

  // DOM
  wrapper.update()
  const editableSubthoughts2 = wrapper.find('.children .children div.editable')
  expect(editableSubthoughts2).toHaveLength(2)
  expect(editableSubthoughts2.at(0).text()).toBe('')
  expect(editableSubthoughts2.at(1).text()).toBe('a1')

})

it('caret is set on new thought', async () => {

  windowEvent('keydown', { key: 'Enter' })
  act(jest.runOnlyPendingTimers)
  wrapper.update()
  const { focusNode, focusOffset } = window.getSelection() || {}
  expect(focusNode.textContent).toEqual('')
  expect(focusOffset).toEqual(0)

})

it('caret is set on new subthought', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  // create subthought
  windowEvent('keydown', { key: 'Enter', ctrlKey: true })
  wrapper.update()
  const editableSubthought = wrapper.find('.children .children div.editable')
  await editableSubthought.simulate('change', { target: { value: 'a1' } })
  act(jest.runOnlyPendingTimers)

  store.dispatch({ type: 'render' })
  act(jest.runOnlyPendingTimers)
  wrapper.update()

  const { focusNode, focusOffset } = window.getSelection() || {}
  expect(focusNode.textContent).toEqual('a1')
  expect(focusOffset).toEqual(0)

})
