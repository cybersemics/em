import { screen } from '@testing-library/dom'
import newThought from '../../action-creators/newThought'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import testTimer from '../../test-helpers/testTimer'

const fakeTimer = testTimer()

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('split thought after non-word character', async () => {
  fakeTimer.useFakeTimer()

  store.dispatch([
    newThought({
      value: '*test',
    }),
  ])

  await fakeTimer.runAllAsync()

  store.dispatch({
    type: 'splitThought',
    splitResult: {
      left: '*',
      right: 'test',
    },
  })

  await fakeTimer.runAllAsync()

  await fakeTimer.useRealTimer()

  // ensure that the Lexeme is not duplicated since it is the same as the source thought
  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})
