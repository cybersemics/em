import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { childIdsToThoughts, exportContext } from '../../selectors'

// reducers
import newThought from '../newThought'
import splitThought from '../splitThought'

it('split thought', () => {
  const steps = [
    newThought('apple'),
    splitThought({
      splitResult: {
        left: 'ap',
        right: 'ple',
      },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ap
  - ple`)
})

it('split thought with formatting', () => {
  const steps = [
    newThought('apple <b>banana</b> cherry'),
    splitThought({
      splitResult: {
        left: 'apple <b>banana</b> ',
        right: 'cherry',
      },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}${'  '}
    <ul>
      <li>apple <b>banana</b></li>
      <li>cherry</li>
    </ul>
  </li>
</ul>`)
})

it('split thought within a formatting tag', () => {
  const steps = [
    newThought('apple <b>banana</b> cherry'),
    splitThought({
      splitResult: {
        left: 'apple <b>ban</b>',
        right: '<b>ana</b> cherry',
      },
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}${'  '}
    <ul>
      <li>apple <b>ban</b></li>
      <li><b>ana</b> cherry</li>
    </ul>
  </li>
</ul>`)
})

it('cursor moves to second thought', () => {
  const steps = [
    newThought('apple'),
    splitThought({
      splitResult: {
        left: 'ap',
        right: 'ple',
      },
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(cursorThoughts).toMatchObject([{ value: 'ple', rank: 1 }])
})
