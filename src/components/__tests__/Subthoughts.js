import { store } from '../../store'
import { createTestApp } from '../../setupTests'
import { RANKED_ROOT } from '../../constants'
import { pathToContext } from '../../util'
import { importText } from '../../action-creators'
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

it('context view', async () => {

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `- a
  - one
    - x
- b
  - ones
    - y`))

  // enable Context View on /a/one and navigate to /a/one/a~
  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }] })
  store.dispatch({ type: 'toggleContextView' })
  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }, { value: 'a', rank: 0 }] })

  // update DOM
  document.wrapper.update()

  // TODO: Can't seem to get it to work using nested Component selectors
  /** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
  // const whereContext = context => node => equalArrays(pathToContext(node.props().thoughtsRanked), context)

  // select elements
  const subthoughtsWrapper = document.wrapper.find('.children .children .children')
  const thoughtsWrapper = subthoughtsWrapper.find(Thought)
  const contextViewSubthoughtsWrapper = thoughtsWrapper.at(0).find('.children')

  // assert context view container
  expect(contextViewSubthoughtsWrapper).toHaveLength(1)
  const contextsWrapper = contextViewSubthoughtsWrapper.find(Thought)

  // assert contexts
  expect(contextsWrapper).toHaveLength(1)
  expect(contextsWrapper.at(0).props())
    .toMatchObject({
      thoughtsRanked: [{ value: 'a' }, { value: 'one' }, { value: 'x', rank: 2 }],
    })

  // navigate to /a/one/b~
  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }, { value: 'b', rank: 3 }] })

  // update DOM
  document.wrapper.update()

  // select elements
  const subthoughtsWrapper2 = document.wrapper.find('.children .children .children')
  const thoughtsWrapper2 = subthoughtsWrapper2.find(Thought)
  const contextViewSubthoughtsWrapper2 = thoughtsWrapper2.at(1).find('.children')

  // assert context view container
  expect(contextViewSubthoughtsWrapper2).toHaveLength(1)
  const contextsWrapper2 = contextViewSubthoughtsWrapper2.find(Thought)

  // assert contexts
  expect(contextsWrapper2).toHaveLength(1)
  expect(contextsWrapper2.at(0).props())
    .toMatchObject({
      thoughtsRanked: [{ value: 'b' }, { value: 'ones' }, { value: 'y', rank: 7 }],
    })
})
