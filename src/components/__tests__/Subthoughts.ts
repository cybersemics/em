import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { RANKED_ROOT } from '../../constants'
import { equalArrays, pathToContext, timestamp } from '../../util'
import Editable from '../Editable'
import Thought from '../Thought'
import Subthoughts from '../Subthoughts'
import { Await, Context, SimplePath } from '../../types'

type ReactWrapper = Await<ReturnType<typeof createTestApp>>

// type for Thoughts or Subthoughts component that has a simplePath prop
interface ThoughtOrSubthoughtsComponent {
  props: () => {
    simplePath: SimplePath,
    contextChain?: SimplePath[],
  },
}

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = (context: Context) => (node: ThoughtOrSubthoughtsComponent) =>
  equalArrays(pathToContext(node.props().simplePath), context)

let wrapper: Await<ReturnType<typeof createTestApp>> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
})

it('normal view', async () => {

  // import thoughts
  store.dispatch({
    type: 'importText',
    path: RANKED_ROOT,
    text: `- a
      - b
      - c
  ` })

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

    const now = timestamp()

    // import thoughts
    store.dispatch({
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
      `,
      lastUpdated: now,
    })

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
        simplePath: [{
          value: 'a',
          rank: 0,
        }, {
          value: 'm',
          rank: 0,
        }],
      })
    expect(contextsWrapper.at(1).props())
      .toMatchObject({
        showContexts: true,
        simplePath: [{
          id: '',
          value: 'b',
          rank: 1,
        }, {
          value: 'm',
          rank: 0,
          lastUpdated: now,
        }],
      })

  })

  it('render context children of contexts that have different lexeme instances', () => {

    // import thoughts
    store.dispatch({
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - one
            - x
        - b
          - ones
            - y
    ` })

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
      .filterWhere(whereContext(['a', 'one']))
      .filterWhere(node => (node.props().contextChain || []).length > 0)
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
      .filterWhere(whereContext(['b', 'ones']))
      .filterWhere(node => (node.props().contextChain || []).length > 0)
    expect(subthoughtsAOneB).toHaveLength(1)

    // assert that child of context is rendered
    const thoughtsAOneB = subthoughtsAOneB.find(Thought)
    expect(thoughtsAOneB).toHaveLength(1)
    expect(thoughtsAOneB.first().props())
      .toMatchObject({
        simplePath: [{ value: 'b' }, { value: 'ones' }, { value: 'y' }],
      })
  })

})
