import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
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

  const stateNew = reducerFlow(steps)(initialState())

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(cursorThoughts).toMatchObject([{ value: 'ple', rank: 1 }])
})

it('move children to the correct sibling in a sorted context', () => {
  const steps = [
    importText({
      text: `
      - Louisiana
        - =sort
          - Alphabetical
            - Asc
        - Baton Rouge
          - A
          - B
          - C
        - New Orleans
      `,
    }),
    setCursor(['Louisiana', 'Baton Rouge']),
    splitThought({
      splitResult: {
        left: 'Baton ',
        right: 'Rouge',
      },
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Louisiana
    - =sort
      - Alphabetical
        - Asc
    - Baton
    - New Orleans
    - Rouge
      - A
      - B
      - C`)
})
