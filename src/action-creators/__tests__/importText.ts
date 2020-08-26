import { ROOT_TOKEN } from '../../constants'
import { store } from '../../store'
import * as db from '../../db'
import { getThoughtsRanked } from '../../selectors'
import windowEvent from '../../test-helpers/windowEvent'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { act } from 'react-dom/test-utils'
import { ReactWrapper } from 'enzyme'
import { importText } from '../'

type TestDocument = Document & {
  // See: enzyme types
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/enzyme/index.d.ts
  wrapper: ReactWrapper,
}

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('re-render thought after importing text', async () => {

  const document = global.document as TestDocument

  // create empty thought
  windowEvent('keydown', { key: 'Enter' })
  document.wrapper.update()

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
  document.wrapper.update()
  const editable = document.wrapper.find('div.editable')
  expect(editable.text()).toBe('a')

})
