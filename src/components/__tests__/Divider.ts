import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import { HOME_TOKEN } from '../../constants'
import { getChildrenRanked } from '../../selectors'
import windowEvent from '../../test-helpers/windowEvent'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

it('convert "---" to divider', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: '---' } })

  // cursor back to trigger existingThoughtChange
  windowEvent('keydown', { key: 'Escape' })

  jest.runOnlyPendingTimers()
  wrapper.update()

  const divider = wrapper.find('Divider')
  expect(divider).toHaveLength(1)

})

it('convert "–-" (emdash + dash) to divider', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: '—-' } })

  // cursor back to trigger existingThoughtChange
  windowEvent('keydown', { key: 'Escape' })

  jest.runOnlyPendingTimers()
  wrapper.update()

  const divider = wrapper.find('Divider')
  expect(divider).toHaveLength(1)

})

it('do not convert "-" to divider', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: '-' } })

  // cursor back to trigger existingThoughtChange
  windowEvent('keydown', { key: 'Escape' })

  jest.runOnlyPendingTimers()

  // state
  const rootSubthoughts = getChildrenRanked(store.getState(), [HOME_TOKEN])
  expect(rootSubthoughts).toHaveLength(1)
  expect(rootSubthoughts[0]).toMatchObject({ value: '-', rank: 0 })

  // DOM
  wrapper.update()
  const aEditable = wrapper.find('div.editable')
  expect(aEditable.at(0).text()).toBe('-')

})

it('do not convert "—" (emdash) to divider', async () => {

  // create thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: '—' } })

  // cursor back to trigger existingThoughtChange
  windowEvent('keydown', { key: 'Escape' })

  jest.runOnlyPendingTimers()

  // state
  const rootSubthoughts = getChildrenRanked(store.getState(), [HOME_TOKEN])
  expect(rootSubthoughts).toHaveLength(1)
  expect(rootSubthoughts[0]).toMatchObject({ value: '—', rank: 0 })

  // DOM
  wrapper.update()
  const aEditable = wrapper.find('div.editable')
  expect(aEditable.at(0).text()).toBe('—')

})
