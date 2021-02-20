import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { getChildrenRanked } from '../../selectors'
import { importText, render } from '../../action-creators'
import windowEvent from '../../test-helpers/windowEvent'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

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

  jest.runOnlyPendingTimers()

  // state
  const rootSubthoughts = getChildrenRanked(store.getState(), [HOME_TOKEN])
  expect(rootSubthoughts).toHaveLength(1)
  expect(rootSubthoughts[0]).toMatchObject({ value: 'a', rank: 0 })

  const subthoughts = getChildrenRanked(store.getState(), ['a'])
  expect(subthoughts).toHaveLength(2)
  expect(subthoughts[0]).toMatchObject({ value: '', rank: -1 })
  expect(subthoughts[1]).toMatchObject({ value: 'a1', rank: 0 })

  // DOM
  wrapper.update()
  const aEditable = wrapper.find('div.editable')
  expect(aEditable.at(0).text()).toBe('a')

  const aSubthoughts = wrapper.find('.children .children div.editable')
  expect(aSubthoughts).toHaveLength(2)
  expect(aSubthoughts.at(0).text()).toBe('')
  expect(aSubthoughts.at(1).text()).toBe('a1')

})

// Intermittent test failure. Unable to reproduce locally.
//   Expected: ""
//   Received: "Hit the Enter key to add a new thought.A  AFeedback | HelpVersion: 162.0.0"
it.skip('caret is set on new thought', async () => {

  windowEvent('keydown', { key: 'Enter' })
  jest.runOnlyPendingTimers()
  wrapper.update()
  const { focusNode, focusOffset } = window.getSelection() || {}
  expect(focusNode?.textContent).toEqual('')
  expect(focusOffset).toEqual(0)

})

// Intermittent test failure. Unable to reproduce locally.
it.skip('caret is set on new subthought', async () => {

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
  jest.runOnlyPendingTimers()

  store.dispatch(render())
  jest.runOnlyPendingTimers()
  wrapper.update()

  const { focusNode, focusOffset } = window.getSelection() || {}
  expect(focusNode?.textContent).toEqual('a1')
  expect(focusOffset).toEqual(0)

})

it('do not allow edit to duplicate thought', async () => {

  store.dispatch(importText({
    path: HOME_PATH,
    text: `
      - a
      - b
      - c`
  }))

  jest.runOnlyPendingTimers()
  wrapper.update()

  // try to change `c` to `a`
  const editableSubthought = wrapper.find('div.editable').at(2)
  await editableSubthought.simulate('change', { target: { value: 'a' } })

  // trigger throttled change event
  windowEvent('keydown', { key: 'Escape' })

  // state
  const rootSubthoughts = getChildrenRanked(store.getState(), [HOME_TOKEN])
  expect(rootSubthoughts).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'b', rank: 1 },
    { value: 'c', rank: 2 },
  ])
  expect(rootSubthoughts).toHaveLength(3)

})

it('allow duplicate empty thoughts', async () => {

  // create empty thought
  windowEvent('keydown', { key: 'Enter' })

  // create `a`
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable').at(1)
  await editable.simulate('change', { target: { value: 'a' } })

  // create `b` and edit to empty thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editableSubthought = wrapper.find('div.editable').at(2)
  await editableSubthought.simulate('change', { target: { value: 'b' } })
  await editableSubthought.simulate('change', { target: { value: '' } })

  // trigger throttled change event
  windowEvent('keydown', { key: 'Escape' })

  // state
  const rootSubthoughts = getChildrenRanked(store.getState(), [HOME_TOKEN])
  expect(rootSubthoughts).toMatchObject([
    { value: '', rank: 0 },
    { value: 'a', rank: 1 },
    { value: '', rank: 2 },
  ])
  expect(rootSubthoughts).toHaveLength(3)

})
