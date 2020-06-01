import { store } from '../../store'
import { Provider } from 'react-redux'
import { getThoughtsRanked } from '../../selectors'
import { createTestApp, windowEvent } from '../../setupTests'
import { RANKED_ROOT } from '../../constants'
import { pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Subthoughts from '../Subthoughts'
import Thought from '../Thought'

// cannot figure out how to unmount and reset after each test so that we can use beforeEach
beforeAll(async () => {
  createTestApp()
})

afterEach(async () => {
  store.dispatch({ type: 'clear' })
})

it('normal view', async () => {

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `- a
  - b
  - c`))

  // set the cursor to expand the subthoughts
  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }] })

  // update DOM
  document.wrapper.update()

  // select elements
  const subthoughtsWrapper = document.wrapper.find('.children .children')
  const thoughtsWrapper = subthoughtsWrapper.find(Thought)

  // assert
  expect(thoughtsWrapper).toHaveLength(2)
  expect(pathToContext(thoughtsWrapper.at(0).props().thoughtsRanked))
    .toMatchObject(['a', 'b'])
  expect(pathToContext(thoughtsWrapper.at(1).props().thoughtsRanked))
    .toMatchObject(['a', 'c'])

})

it('context view', async () => {

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `- a
  - m
    - x
- b
  - m
    - y`))

  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] })
  store.dispatch({ type: 'toggleContextView' })

  // update DOM
  document.wrapper.update()

  // select elements
  const subthoughtsWrapper = document.wrapper.find('.children .children')
  const thoughtsWrapper = subthoughtsWrapper.find(Thought)
  const contextViewSubthoughtsWrapper = thoughtsWrapper.at(0).find('.children')

  // assert context view container
  expect(contextViewSubthoughtsWrapper).toHaveLength(1)
  const contextsWrapper = contextViewSubthoughtsWrapper.find(Thought)

  // assert contexts
  expect(contextsWrapper).toHaveLength(2)
  expect(contextsWrapper.at(0).props())
    .toMatchObject({
      showContexts: true,
      thoughtsRanked: [{ value: 'a' }, { value: 'm' }],
    })
  expect(contextsWrapper.at(1).props())
    .toMatchObject({
      showContexts: true,
      thoughtsRanked: [{ value: 'b' }, { value: 'm' }],
    })

})
