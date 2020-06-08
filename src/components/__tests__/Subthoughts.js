import { store } from '../../store'
import { createTestApp } from '../../setupTests'
import { RANKED_ROOT } from '../../constants'
import { equalArrays, pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Editable from '../Editable'
import Thought from '../Thought'
import Subthoughts from '../Subthoughts'

// const debug = wrapper => wrapper.map(node => ({
//   name: node.name(),
//   context: node.props().thoughtsRanked.map(child => child.value),
//   contextChain: JSON.stringify(node.props().contextChain),
//   props: node.props(),
//   html: node.html(),
// }))

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
  expect(pathToContext(thoughtsWrapper.first().props().thoughtsRanked))
    .toMatchObject(['a', 'b'])
  expect(pathToContext(thoughtsWrapper.at(1).props().thoughtsRanked))
    .toMatchObject(['a', 'c'])

})

describe('context view', () => {

  it('render contexts of cursor thought when context view is enabled', async () => {

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

    // assert context view container
    const subthoughtsWrapper = document.wrapper.find('.children .children')
    const thoughtsWrapper = subthoughtsWrapper.find(Thought)
    const contextViewSubthoughtsWrapper = thoughtsWrapper.first().find('.children')
    expect(contextViewSubthoughtsWrapper).toHaveLength(1)

    // assert contexts
    const contextsWrapper = contextViewSubthoughtsWrapper.find(Thought)
    expect(contextsWrapper).toHaveLength(2)
    expect(contextsWrapper.first().props())
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

  it('render context children of contexts that have different lexeme instances', async () => {

    // import thoughts
    await store.dispatch(importText(RANKED_ROOT, `- a
    - one
      - x
  - b
    - ones
      - y`))

    // enable Context View on /a/one
    store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }] })
    store.dispatch({ type: 'toggleContextView' })

    // update DOM
    document.wrapper.update()

    /** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
    const whereContext = context => node => equalArrays(pathToContext(node.props().thoughtsRanked), context)

    /** Select /a/one Subthoughts component. Call function after re-render to use new DOM. */
    const subthoughtsAOne = () => document.wrapper
      .find(Subthoughts)
      .filterWhere(whereContext(['a', 'one']))
    const subthoughtsAOne1 = subthoughtsAOne()
    expect(subthoughtsAOne1).toHaveLength(2)

    // select first context (a)
    // use childAt to get passed Connected HOC
    const editableAOneA = subthoughtsAOne1.find(Editable).at(0).childAt(0)
    expect(editableAOneA).toHaveLength(1)

    // focus on a/one~/a to get it to expand
    editableAOneA.simulate('focus')
    document.wrapper.update()

    // select a/one~/a Subthoughts component
    const subthoughtsAOneA = subthoughtsAOne()
      .find(Subthoughts)
      .filterWhere(whereContext(['a', 'one']))
      .filterWhere(node => node.props().contextChain.length > 0)
    expect(subthoughtsAOneA).toHaveLength(1)

    // assert that child of context is rendered
    const thoughtsAOneA = subthoughtsAOneA.find(Thought)
    expect(thoughtsAOneA).toHaveLength(1)
    expect(thoughtsAOneA.first().props())
      .toMatchObject({
        thoughtsRanked: [{ value: 'a' }, { value: 'one' }, { value: 'x' }],
      })

    // select second context (b)
    // focus on a/one~/b to get it to expand
    const editableAOneB = subthoughtsAOne1.find(Editable).at(1).childAt(0)
    expect(editableAOneB).toHaveLength(1)
    editableAOneB.simulate('focus')
    document.wrapper.update()

    // select a/one~/b Subthoughts component
    const subthoughtsAOneB = subthoughtsAOne()
      .find(Subthoughts)
      .filterWhere(whereContext(['b', 'ones']))
      .filterWhere(node => node.props().contextChain.length > 0)
    expect(subthoughtsAOneB).toHaveLength(1)

    // assert that child of context is rendered
    const thoughtsAOneB = subthoughtsAOneB.find(Thought)
    expect(thoughtsAOneB).toHaveLength(1)
    expect(thoughtsAOneB.first().props())
      .toMatchObject({
        thoughtsRanked: [{ value: 'b' }, { value: 'ones' }, { value: 'y' }],
      })
  })

})
