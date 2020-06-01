import { store } from '../../store'
import { Provider } from 'react-redux'
import { getThoughtsRanked } from '../../selectors'
import { createTestApp, windowEvent } from '../../setupTests'
import { RANKED_ROOT } from '../../constants'
import { pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Subthoughts from '../Subthoughts'
import Thought from '../Thought'

beforeEach(async () => {
  createTestApp()
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
