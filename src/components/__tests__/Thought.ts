import { ReactWrapper } from 'enzyme'
import _ from 'lodash'
import editThought from '../../action-creators/editThought'
import importText from '../../action-creators/importText'
import newThought from '../../action-creators/newThought'
import * as ContentEditableModule from '../../components/ContentEditable'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import { getChildrenRanked } from '../../selectors/getChildren'
import { store } from '../../store'
import createRtlTestApp, { cleanupTestApp as cleanupRtlTestApp } from '../../test-helpers/createRtlTestApp'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import getChildrenRankedByContext from '../../test-helpers/getChildrenRankedByContext'
import windowEvent from '../../test-helpers/windowEvent'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

describe('Enzyme', () => {
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

    // state
    const rootSubthoughts = getChildrenRanked(store.getState(), HOME_TOKEN)
    expect(rootSubthoughts).toHaveLength(1)
    expect(rootSubthoughts[0]).toMatchObject({ value: 'a', rank: 0 })

    const subthoughts = getChildrenRankedByContext(store.getState(), ['a'])
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

  it('create, edit, format and delete empty thought', async () => {
    windowEvent('keydown', { key: 'Enter' })
    wrapper.update()
    const editable = wrapper.find('div.editable')
    await editable.simulate('change', { target: { value: 'a<b>b</b>' } })
    windowEvent('keydown', { key: 'Enter' })

    // DOM
    wrapper.update()
    const aEditable = wrapper.find('div.editable')
    expect(aEditable.at(0).text()).toBe('ab')
  })

  // Intermittent test failure. Unable to reproduce locally.
  //   Expected: ""
  //   Received: "Hit the Enter key to add a new thought.A  AFeedback | HelpVersion: 162.0.0"
  it('caret is set on new thought', async () => {
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
    wrapper.update()

    const { focusNode, focusOffset } = window.getSelection() || {}
    expect(focusNode?.textContent).toEqual('a1')
    expect(focusOffset).toEqual(0)
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
    const rootSubthoughts = getChildrenRanked(store.getState(), HOME_TOKEN)
    expect(rootSubthoughts).toMatchObject([
      { value: '', rank: 0 },
      { value: 'a', rank: 1 },
      { value: '', rank: 2 },
    ])
    expect(rootSubthoughts).toHaveLength(3)
  })
})

describe('React Testing Library', () => {
  beforeEach(createRtlTestApp)
  afterEach(async () => {
    jest.restoreAllMocks()
    await cleanupRtlTestApp()
  })

  // TODO: Optimize to only render once
  // Note: This seems to be producing different results depending on whether it is run with the other describe block or only this describe block
  it.skip('do not re-render ContentEditable additional times on load', () => {
    const Editable = jest.spyOn(ContentEditableModule, 'default')

    store.dispatch(newThought({ value: 'a' }))

    expect(Editable).toHaveBeenCalledTimes(1)
  })

  it('do not re-render parent on edit', () => {
    const ContentEditable = jest.spyOn(ContentEditableModule, 'default')

    store.dispatch(
      importText({
        text: `
      - a
        - b
    `,
      }),
    )

    const initialCalls = ContentEditable.mock.calls.length

    store.dispatch([
      editThought({
        oldValue: 'b',
        newValue: 'bb',
        path: contextToPath(store.getState(), ['a', 'b'])!,
      }),
    ])

    // calls made during edit
    const calls = ContentEditable.mock.calls.slice(initialCalls)
    const callsGrouped = _.groupBy(calls, call => call[0].html)

    expect(callsGrouped.a?.length || 0).toEqual(0)
  })
})
