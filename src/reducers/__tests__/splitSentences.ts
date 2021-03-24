import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

import { newThought, splitSentences } from '../../reducers'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

it('split single thought by sentences', () => {
  const steps = [
    newThought('One. Two. Three.'),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two.
  - Three.`)
})

it('split single thought on comma when there are no periods', () => {
  const steps = [
    newThought('One, Two, Three'),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three`)
})

it('split single thought on period when there is a combination of periods and commas.', () => {
  const steps = [
    newThought('One.Two, Three'),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two, Three.`)
})

it('split single thought on comma if a thought with a mix of commas and periods has only one period and it\'s the last character', () => {
  const steps = [
    newThought('One, Two, Three.'),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three.`)
})

it('split single thought on main split characters if thought has only one period at the end but has other split characters too. ', () => {
  const steps = [
    newThought('One,Seven?Two!Three.'),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - One,Seven.
  - Two.
  - Three.`)
})

it('split thought by sentences surrounded by siblings', () => {
  const steps = [
    newThought('a'),
    newThought('One. Two. Three.'),
    newThought('b'),
    setCursorFirstMatch(['One. Two. Three.']),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - One.
  - Two.
  - Three.
  - b`)
})
