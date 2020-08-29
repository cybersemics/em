import { ROOT_TOKEN } from '../../constants'
import { store } from '../../store'
import { getThoughtsRanked } from '../../selectors'
import windowEvent from '../../test-helpers/windowEvent'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { act } from 'react-dom/test-utils'
import { ReactWrapper } from 'enzyme'
import { importText } from '../'

// See: enzyme types
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/enzyme/index.d.ts
let wrapper: ReactWrapper = null as any // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp() as any
})

afterEach(async () => {
  await cleanupTestApp()
  // @ts-ignore
  wrapper = null
})

it('re-render thought after importing text', () => {

  // create empty thought
  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()

  // import text
  store.dispatch(importText([{ value: '', rank: 0 }], 'a'))

  act(() => {
    jest.runOnlyPendingTimers()
  })

  // state
  const subthoughts = getThoughtsRanked(store.getState(), [ROOT_TOKEN])
  expect(subthoughts).toHaveLength(1)
  expect(subthoughts[0]).toMatchObject({ value: 'a' })

  // DOM
  wrapper.update()
  const editable = wrapper.find('div.editable')
  expect(editable.text()).toBe('a')

})
