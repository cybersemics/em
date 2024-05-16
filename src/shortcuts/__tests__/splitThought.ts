import { screen } from '@testing-library/dom'
import { act } from '@testing-library/react'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('split thought after non-word character', async () => {
  await act(async () => {
    store.dispatch([
      newThought({
        value: '*test',
      }),
      {
        type: 'splitThought',
        splitResult: {
          left: '*',
          right: 'test',
        },
      },
    ])
  })

  // ensure that the Lexeme is not duplicated since it is the same as the source thought
  expect(() => screen.getByText('2')).toThrow('Unable to find an element')
})
