import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { RANKED_ROOT } from '../../constants'
import { pathToContext } from '../../util'
import { importText } from '../../action-creators'
import Editable from '../Editable'
import { findNodeByContext, findNodeByResolvedContext, findSubthoughtsByKey } from '../../test-helpers/flatRenderHelper'

// const debugThoughtWrapper = wrapper => wrapper.map(node => ({
//   name: node.name(),
//   context: node.props().thoughtsRanked.map(child => child.value),
//   contextChain: JSON.stringify(node.props().contextChain),
//   props: node.props(),
//   html: node.html(),
// }))

let wrapper = null // eslint-disable-line fp/no-let

// cannot figure out how to unmount and reset after each test so that we can use beforeEach
beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
  wrapper = null
})

it('normal view', async () => {

  // import thoughts
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
    - c`))

  // set the cursor to expand the subthoughts
  store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }] })

  // update DOM
  wrapper.update()

  // select parent node
  const parentNode = findNodeByContext(wrapper, ['a']).at(0)

  // find subthoughts by parent's node key.
  const subthoughtNodes = findSubthoughtsByKey(wrapper, parentNode.props().item.key)

  // assert
  expect(subthoughtNodes).toHaveLength(2)

  expect(pathToContext(subthoughtNodes.first().props().item.thoughtsRanked))
    .toMatchObject(['a', 'b'])
  expect(pathToContext(subthoughtNodes.at(1).props().item.thoughtsRanked))
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
    wrapper.update()

    // assert context view container
    const parentNode = findNodeByContext(wrapper, ['a', 'm']).at(0) // have to select first node, as second node is empty-children with contextChain (?)

    // assert contexts
    const subthoughtNodes = findSubthoughtsByKey(wrapper, parentNode.props().item.key)
    expect(subthoughtNodes).toHaveLength(2)

    expect(subthoughtNodes.at(0).props().item)
      .toMatchObject({
        viewInfo: {
          context: {
            showContextsParent: true
          }
        },
        thoughtsRanked: [{ value: 'a' }, { value: 'm' }],
      })
    expect(subthoughtNodes.at(1).props().item)
      .toMatchObject({
        viewInfo: {
          context: {
            showContextsParent: true
          }
        },
        thoughtsRanked: [{ value: 'b' }, { value: 'm' }],
      })

  })

  it('render context children of contexts that have different lexeme instances', async () => {

    // import thoughts
    await store.dispatch(importText(RANKED_ROOT, `
    - a
      - one
        - x
    - b
      - one
        - y`))

    // enable Context View on /a/one
    store.dispatch({ type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }, { value: 'one', rank: 1 }] })
    store.dispatch({ type: 'toggleContextView' })

    // update DOM
    wrapper.update()

    // select /a/one node.
    const nodeAOne1 = findNodeByContext(wrapper, ['a', 'one'])
    expect(nodeAOne1).toHaveLength(2)

    // check if the context first subthought has been rendered
    const nodeAOneA = findNodeByResolvedContext(wrapper, ['a', 'one', 'a'])
    expect(nodeAOneA).toHaveLength(1)

    // select editable of node a/one~/a to get it to expand
    // use childAt to get passed Connected HOC
    const editableAOneA = nodeAOneA.find(Editable).at(0).childAt(0)
    expect(editableAOneA).toHaveLength(1)
    editableAOneA.simulate('focus')
    wrapper.update()

    /// assert that child of a/one~/a is rendered
    const nodeAOneAX = findNodeByResolvedContext(wrapper, ['a', 'one', 'a', 'x'])
    expect(nodeAOneAX).toHaveLength(1)

    // check if the context first subthought has been rendered
    const nodeAOneB = findNodeByResolvedContext(wrapper, ['a', 'one', 'b'])
    expect(nodeAOneB).toHaveLength(1)

    // select editable of node a/one~/a to get it to expand
    // focus on a/one~/b to get it to expand
    const editableAOneB = nodeAOneB.find(Editable).at(0).childAt(0)
    expect(editableAOneB).toHaveLength(1)
    editableAOneB.simulate('focus')
    wrapper.update()

    /// assert that child of a/one~/a is rendered
    const nodeAOneAY = findNodeByResolvedContext(wrapper, ['a', 'one', 'b', 'y'])
    expect(nodeAOneAY).toHaveLength(1)

  })
})
