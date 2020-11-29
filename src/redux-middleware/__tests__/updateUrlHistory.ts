import { store } from '../../store'
import { cursorBack, deleteThought, newThought } from '../../action-creators'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { Index } from '../../types'

// mock debounce and throttle so debounced updateUrlHistory will trigger
// fake timers cause an infinite loop on _.debounce
// Jest v26 contains a 'modern' option for useFakeTimers (https://github.com/facebook/jest/pull/7776), but I am getting a "TypeError: Cannot read property 'useFakeTimers' of undefined" error when I call jest.useFakeTimers('modern'). The same error does not occor when I use 'legacy' or omit the argument (react-scripts v4.0.0-next.64).
// https://github.com/facebook/jest/issues/3465#issuecomment-504908570
jest.mock('lodash', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { debounce, throttle } = require('../../test-helpers/mock-debounce-throttle')
  return {
    ...jest.requireActual('lodash') as Index<any>,
    debounce,
    throttle,
  }
})

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('set url to cursor', () => {

  store.dispatch(newThought({ value: 'a' }))
  expect(window.location.pathname).toBe('/~/a')

  store.dispatch(newThought({ value: 'b', insertNewSubthought: true }))
  expect(window.location.pathname).toBe('/~/a/b')

  store.dispatch(cursorBack())
  expect(window.location.pathname).toBe('/~/a')

  store.dispatch(cursorBack())
  expect(window.location.pathname).toBe('/')

})

it('set url to home after deleting last empty thought', () => {

  store.dispatch(newThought({}))
  expect(window.location.pathname).toBe('/~/')

  store.dispatch(deleteThought())
  expect(window.location.pathname).toBe('/')

})
