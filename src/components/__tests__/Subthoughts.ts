import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { HOME_PATH } from '../../constants'
import { equalArrays, pathToContext, timestamp } from '../../util'
import { importText, setCursor, toggleAttribute } from '../../action-creators'
import Editable from '../Editable'
import Thought from '../Thought'
import Subthoughts from '../Subthoughts'
import { Context, Path, SimplePath } from '../../types'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { getAllChildren } from '../../selectors'

// type for Thoughts or Subthoughts component that has a simplePath prop
interface ThoughtOrSubthoughtsComponent {
  props: () => {
    path?: Path,
    simplePath: SimplePath,
    showContexts?: boolean,
  },
}

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given thoughts path. */
const whereSimplePath = (context: Context) => (node: ThoughtOrSubthoughtsComponent) =>
  !!node.props().simplePath && equalArrays(pathToContext(node.props().simplePath), context)

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given thoughts path. */
const wherePath = (context: Context) => (node: ThoughtOrSubthoughtsComponent) => {
  const path = node.props().path ?? node.props().simplePath
  return !!path && equalArrays(pathToContext(path), context)
}

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

it('normal view', () => {

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `- a
        - b
        - c`
    }),
    // set the cursor to expand the subthoughts
    setCursor({ path: [{ value: 'a', rank: 0 }] }),
  ])

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

  it('render contexts of cursor thought when context view is enabled', () => {

    const now = timestamp()

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
        lastUpdated: now,
      }),
      setCursorFirstMatchActionCreator(['a', 'm']),
      { type: 'toggleContextView' },
    ])

    // update DOM
    wrapper.update()

    // assert context view container
    const subthoughtsWrapper = wrapper
      .find(Subthoughts)
      .filterWhere(whereSimplePath(['a', 'm']))
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
          value: 'b',
          rank: 1,
        }, {
          value: 'm',
          rank: 0,
        }],
      })

  })

  it('render context children of contexts that have different lexeme instances', () => {

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - one
              - x
          - b
            - ones
              - y`
      }),
      // enable Context View on /a/one
      setCursorFirstMatchActionCreator(['a', 'one']),
      { type: 'toggleContextView' }
    ])

    // update DOM
    wrapper.update()

    /** Select /a/one Subthoughts component. Call function after re-render to use new DOM. */
    const subthoughtsAOne = () => wrapper
      .find(Subthoughts)
      .filterWhere(whereSimplePath(['a', 'one']))
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

  it('calculate proper resolved path for a children inside context view with duplicate lexeme', () => {

    // Explaination: https://github.com/cybersemics/em/pull/878#issuecomment-717057916

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - b
              - c
                - d
                  - c`
      }),
      // enable Context View on /a/b/c/d/c
      setCursorFirstMatchActionCreator(['a', 'b', 'c', 'd', 'c']),
      { type: 'toggleContextView' },
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

    const childrenPathArray = subthoughtsContextViewChildren.map(node => pathToContext(node.props().path!))
    expect(childrenPathArray[0]).toEqual(['a', 'b', 'c', 'd', 'c', 'b'])
    expect(childrenPathArray[1]).toEqual(['a', 'b', 'c', 'd', 'c', 'd'])

  })

})

describe('hidden thoughts', () => {

  it('do not hide invisible thought if it lies within cursor path', () => {

    // import thoughts
    store.dispatch(importText({
      path: HOME_PATH,
      preventSetCursor: true,
      text: `
        - a
          - d
            - =meta2
              - e
        - b
        - =meta1
          - c`,
    }))

    // update DOM
    wrapper.update()

    /* eslint-disable jsdoc/require-jsdoc */
    const metaThought1 = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['=meta1']))

    /* eslint-disable jsdoc/require-jsdoc */
    const metaThought1Child = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['=meta1', 'c']))

    // meta thoughts should not be visible when it doesn't lie in cursor path and showHiddenThoughts is false
    // expect(metaThought1()).toHaveLength(0)
    expect(metaThought1Child()).toHaveLength(0)

    store.dispatch(setCursorFirstMatchActionCreator(['=meta1']))

    // update DOM
    wrapper.update()

    // for root context
    // meta thoughts should be visible when it lies in cursor path
    expect(metaThought1()).toHaveLength(1)
    expect(metaThought1Child()).toHaveLength(1)

    store.dispatch(setCursorFirstMatchActionCreator(['a', 'd']))

    // update DOM
    wrapper.update()

    const metaThought2 = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['a', 'd', '=meta2']))

    const metaThought2Child = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['a', 'd', '=meta2', 'e']))

    // meta thoughts should not be visible when it doesn't lie in cursor path and showHiddenThoughts is false
    expect(metaThought2()).toHaveLength(0)
    expect(metaThought2Child()).toHaveLength(0)

    store.dispatch(setCursorFirstMatchActionCreator(['a', 'd', '=meta2', 'e']))

    // update DOM
    wrapper.update()

    // meta thoughts should be visible when it lies in cursor path
    expect(metaThought2()).toHaveLength(1)
    expect(metaThought2Child()).toHaveLength(1)
  })

  it('do not hide invisible thought if it lies within cursor path (Context View)', () => {

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - d
              - =meta2
                - e
          - b
            - d`
      }),
      setCursorFirstMatchActionCreator(['b', 'd']),
      { type: 'toggleContextView' },
      setCursorFirstMatchActionCreator(['b', 'd', 'a']),
    ])

    // update DOM
    wrapper.update()

    /*
    Expected structure after activating context view.

    - a
      - d
        =meta2
          - e
    - b
      - d (~)
       - b.d
       - a.d (cursor)
        - =meta2 (expecting =meta2 and e to be hidden)
         - e
    */

    const nestedMetaThought2 = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['b', 'd', 'a', '=meta2']))

    const nestedMetaThought2Child = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['b', 'd', 'a', '=meta2', 'e']))

    // meta thoughts should not be visible when it doesn't lie in cursor path and showHiddenThoughts is false
    expect(nestedMetaThought2()).toHaveLength(0)
    expect(nestedMetaThought2Child()).toHaveLength(0)

    // set cursor at a.d.a.=meta2.e
    store.dispatch(setCursorFirstMatchActionCreator(['b', 'd', 'a', '=meta2', 'e']))

    /*
    Expected structure
    - a
      - d
        =meta2
          - e
    - b
      - d (~)
       - b.d
       - a.d
        - =meta2 (cursor) (expecting =meta2 and e to be visible)
         - e
    */

    // update DOM
    wrapper.update()

    // meta thoughts should be visible when it lies in cursor path
    expect(nestedMetaThought2()).toHaveLength(1)
    expect(nestedMetaThought2Child()).toHaveLength(1)
  })

  it('do not hide meta attribute thought when it is the descendant of the meta cursor.', () => {

    // import thoughts
    store.dispatch(importText({
      path: HOME_PATH,
      preventSetCursor: true,
      text: `
        - a
          - =meta1
            - =meta2`,
    }))

    // update DOM
    wrapper.update()

    /* eslint-disable jsdoc/require-jsdoc */
    const metaThought2 = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['a', '=meta1', '=meta2']))

    // meta2 should should not be visible when it doesn't lie in cursor path or is not descendant of meta cursor
    expect(metaThought2()).toHaveLength(0)

    store.dispatch(setCursorFirstMatchActionCreator(['a', '=meta1']))

    wrapper.update()

    // meta2 should should be visible when it is descendant of the meta cursor
    expect(metaThought2()).toHaveLength(1)
  })

  it('do not hide meta attribute thought when it is the descendant of the meta cursor (Context View).', () => {

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        preventSetCursor: true,
        text: `
        - a
          - d
            - e
              - =meta1
                - =meta2
        - b
          - d`,
      }),
      setCursorFirstMatchActionCreator(['b', 'd']),
      { type: 'toggleContextView' },
      setCursorFirstMatchActionCreator(['b', 'd', 'a'])
    ])

    /*
    Expected structure after activating context view.

    - a
      - d
        - e
          - =meta1
            - =meta2
    - b
      - d (~)
       - b.d
       - a.d (cursor)
        - e
         - =meta1 (expecting =meta1 and =meta2 be hidden)
          - =meta2
    */

    // update DOM
    wrapper.update()

    /* eslint-disable jsdoc/require-jsdoc */
    const metaThought2 = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['b', 'd', 'a', 'e', '=meta1', '=meta2']))

    // meta2 should should not be visible when it doesn't lie in cursor path or is not descendant of meta cursor
    expect(metaThought2()).toHaveLength(0)

    store.dispatch(setCursorFirstMatchActionCreator(['b', 'd', 'a', 'e', '=meta1']))

    wrapper.update()

    /*
    Expected structure

    - a
      - d
        - e
          - =meta1
            - =meta2
    - b
      - d (~)
       - b.d
       - a.d
        - e
         - =meta1 (meta cursor)
          - =meta2 (expecting =meta2 to be visible too)
    */

    // meta2 should should be visible when it is descendant of the meta cursor
    expect(metaThought2()).toHaveLength(1)
  })
})

describe('expand thoughts', () => {

  it('re-render Subthought if it is expanded', () => {

    /* Note: Sometimes children of a Subthought is updated first and then expanded property is updated later.
      This test checks if the Subthought re-renders in this scenario. https://github.com/cybersemics/em/pull/951
    */

    // import thoughts
    store.dispatch([
      importText({
        path: HOME_PATH,
        preventSetCursor: true,
        text: `
        - a
          - b
        - c`,
      }),
      // Note: initially setting =pin attribute to false so that on toogling to true children of ['a'] doesn't change
      toggleAttribute({
        context: ['a'],
        key: '=pin',
        value: 'false',
      })
    ])

    // update DOM
    wrapper.update()

    const childrenContextA = getAllChildren(store.getState(), ['a'])

    /** */
    const thoughtB = () => wrapper
      .find(Subthoughts)
      .filterWhere(wherePath(['a', 'b']))

    // context ['a'] is not yet expanded yet
    expect(thoughtB()).toHaveLength(0)

    store.dispatch(toggleAttribute({
      context: ['a'],
      key: '=pin',
      value: 'true',
    }))

    const updatedChildrenContextA = getAllChildren(store.getState(), ['a'])

    // children of context ['a'] shouldn't change as this test requires Subthought to rerender due to change in expanded
    expect(updatedChildrenContextA).toBe(childrenContextA)

    wrapper.update()

    // on change of isExpanded the Subthought should re-render and render it's children
    expect(thoughtB()).toHaveLength(1)

  })
})
