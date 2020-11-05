import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { RANKED_ROOT } from '../../constants'
import { equalArrays, pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Editable from '../Editable'
import Thought from '../Thought'
import Subthoughts from '../Subthoughts'

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = context => node => equalArrays(pathToContext(node.props().simplePath), context)

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given thoughts resolved path. */
const wherePath = context => node => node.props().path && equalArrays(pathToContext(node.props().path), context)

// const debugThoughtWrapper = wrapper => wrapper.map(node => ({
//   name: node.name(),
//   context: node.props().simplePath.map(child => child.value),
//   contextChain: JSON.stringify(node.props().contextChain),
//   props: node.props(),
//   html: node.html(),
// }))

let wrapper = null // eslint-disable-line fp/no-let

// cannot figure out how to unmount and reset after each test so that we can use beforeEach
beforeEach(async () => {
  wrapper = await createTestApp()
  // set url back to home
})

afterEach(async () => {
  await cleanupTestApp()
  wrapper = null
})

it('normal view', async () => {

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `- a
  - b
  - c`))

  // set the cursor to expand the subthoughts
  store.dispatch({ type: 'setCursor', path: [{ value: 'a', rank: 0 }] })

  // update DOM
  wrapper.update()

  // select elements
  const subthoughtsWrapper = wrapper.find('.children .children')
  const thoughtsWrapper = subthoughtsWrapper.find(Thought)

  // assert
  expect(thoughtsWrapper).toHaveLength(2)
  expect(pathToContext(thoughtsWrapper.first().props().simplePath))
    .toMatchObject(['a', 'b'])
  expect(pathToContext(thoughtsWrapper.at(1).props().simplePath))
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

    store.dispatch({ type: 'setCursor', path: [{ value: 'a', rank: 0 }, { value: 'm', rank: 1 }] })
    store.dispatch({ type: 'toggleContextView' })

    // update DOM
    wrapper.update()

    // assert context view container
    const subthoughtsWrapper = wrapper
      .find(Subthoughts)
      .filterWhere(whereContext(['a', 'm']))
      .first() // have to select first node, as second node is empty-children with contextChain (?)

    // assert contexts
    const contextsWrapper = subthoughtsWrapper.find(Thought)
    expect(contextsWrapper).toHaveLength(2)
    expect(contextsWrapper.at(0).props())
      .toMatchObject({
        showContexts: true,
        simplePath: [{ value: 'a' }, { value: 'm' }],
      })
    expect(contextsWrapper.at(1).props())
      .toMatchObject({
        showContexts: true,
        simplePath: [{ value: 'b' }, { value: 'm' }],
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
    store.dispatch({ type: 'setCursor', path: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }] })
    store.dispatch({ type: 'toggleContextView' })

    // update DOM
    wrapper.update()

    /** Select /a/one Subthoughts component. Call function after re-render to use new DOM. */
    const subthoughtsAOne = () => wrapper
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
    wrapper.update()

    // select a/one~/a Subthoughts component
    const subthoughtsAOneA = subthoughtsAOne()
      .find(Subthoughts)
      .filterWhere(wherePath(['a', 'one', 'a']))
    expect(subthoughtsAOneA).toHaveLength(1)

    // assert that child of context is rendered
    const thoughtsAOneA = subthoughtsAOneA.find(Thought)
    expect(thoughtsAOneA).toHaveLength(1)
    expect(thoughtsAOneA.first().props())
      .toMatchObject({
        simplePath: [{ value: 'a' }, { value: 'one' }, { value: 'x' }],
      })

    // select second context (b)
    // focus on a/one~/b to get it to expand
    const editableAOneB = subthoughtsAOne1.find(Editable).at(1).childAt(0)
    expect(editableAOneB).toHaveLength(1)
    editableAOneB.simulate('focus')
    wrapper.update()

    // select a/one~/b Subthoughts component
    const subthoughtsAOneB = subthoughtsAOne()
      .find(Subthoughts)
      .filterWhere(wherePath(['a', 'one', 'b']))
    expect(subthoughtsAOneB).toHaveLength(1)

    // assert that child of context is rendered
    const thoughtsAOneB = subthoughtsAOneB.find(Thought)
    expect(thoughtsAOneB).toHaveLength(1)
    expect(thoughtsAOneB.first().props())
      .toMatchObject({
        simplePath: [{ value: 'b' }, { value: 'ones' }, { value: 'y' }],
      })
  })

  it('calculate proper resolved path for a children inside context view with duplicate lexeme', async () => {

    // Explaination: https://github.com/cybersemics/em/pull/878#issuecomment-717057916

    // import thoughts
    await store.dispatch(importText(RANKED_ROOT, `
    - a
      - b
        - c
          - d
            - c`))

    // enable Context View on /a/b/c/d/c
    store.dispatch([
      {
        type: 'setCursor', path: [
          { value: 'a', rank: 0 },
          { value: 'b', rank: 0 },
          { value: 'c', rank: 0 },
          { value: 'd', rank: 0 },
          { value: 'c', rank: 0 },
        ]
      },
      { type: 'toggleContextView' }
    ])

    /*
    Expected structure after activating context view.
    - a
      - b
        - c
          - d
            - c ~
              - a.b.c (first)
              - a.b.c.d.c (second)
    */

    // update DOM
    wrapper.update()

    const subthoughtsContextViewChildren = wrapper.find(Subthoughts)
      .filterWhere(wherePath(['a', 'b', 'c', 'd', 'c'])).childAt(0).find(Subthoughts)

    expect(subthoughtsContextViewChildren).toHaveLength(2)

    const childrenPathArray = subthoughtsContextViewChildren.map(node => pathToContext(node.props().path))
    expect(childrenPathArray[0]).toEqual(['a', 'b', 'c', 'd', 'c', 'b'])
    expect(childrenPathArray[1]).toEqual(['a', 'b', 'c', 'd', 'c', 'd'])

  })

})
