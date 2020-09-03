import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

import { newThought, splitSentences } from '../../reducers'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

it('split sentences with only one thought', () => {
  const steps = [
    newThought('One. Two. Three.'),
    setCursorFirstMatch(['One. Two. Three.']),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - One.
  - Two.
  - Three.`)
})

it('split sentences with other thoughts nearby', () => {
  const steps = [
    newThought('a'),
    newThought('One. Two. Three.'),
    newThought('b'),
    setCursorFirstMatch(['One. Two. Three.']),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - One.
  - Two.
  - Three.
  - b`)
})
