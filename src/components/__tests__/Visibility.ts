import { ReactWrapper } from 'enzyme'
import Context from '../../@types/Context'
import Path from '../../@types/Path'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import importText from '../../action-creators/importText'
import setCursor from '../../action-creators/setCursor'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import equalArrays from '../../util/equalArrays'
import pathToContext from '../../util/pathToContext'
import Subthoughts from '../Subthoughts'

// type for Thoughts or Subthoughts component that has a simplePath prop
interface ThoughtOrSubthoughtsComponent {
  props: () => {
    path?: Path
    simplePath: SimplePath
    showContexts?: boolean
  }
}

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given thoughts path. */
const wherePath = (state: State, context: Context) => (node: ThoughtOrSubthoughtsComponent) => {
  const path = node.props().path ?? node.props().simplePath
  return !!path && equalArrays(pathToContext(state, path), context)
}

/** Returns the children component inside the Subthoughts for the given context. */
const getChildrenComponent = (state: State, context: Context) => {
  const subthoughtsWrapper = wrapper.find(Subthoughts).filterWhere(wherePath(state, context)).first()

  return subthoughtsWrapper.find('.children').at(0)
}

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

/*
  The following properties is assumed to be applied to the immediate childrens of the context with given class.

  distance-from-cursor-0 fully visible
  distance-from-cursor-1 dimmed
  distance-from-cursor-2 shifted left and hidden
  distance-from-cursor-3 shiifted left and hidden

  Note: This doesn't fully account for the visibility. There are other factors that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
*/

it('ancestors should be visible only up to allowed distance from cursor', () => {
  const text = `
  - a
    - b
      - c
        - d
          - e
            - f`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c', 'd']),
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(store.getState(), ['a', 'b', 'c'])
  const childrenB = getChildrenComponent(store.getState(), ['a', 'b'])
  const childrenA = getChildrenComponent(store.getState(), ['a'])

  expect(childrenC.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenB.hasClass('distance-from-cursor-2')).toBe(true)
  expect(childrenA.hasClass('distance-from-cursor-3')).toBe(true)
})

it('descendants of hidden ancestor must be hidden too', () => {
  const text = `
  - a
    - =pinChildren
      - true
    - b
      - c
        - d
    - e
      - f
        - g`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c']),
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(store.getState(), ['a', 'b'])
  const childrenE = getChildrenComponent(store.getState(), ['a', 'e'])
  const childrenF = getChildrenComponent(store.getState(), ['a', 'e', 'f'])

  expect(childrenC.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenE.hasClass('distance-from-cursor-2')).toBe(true)
  expect(childrenF.hasClass('distance-from-cursor-2')).toBe(true)
})

it('when the cursor is on a table grandchild leaf (column 2), other grandchildren of the table should be visible and dimmed', () => {
  const text = `
  - a
    - =view
      - Table
    - b
      - c
    - k
      - m
    - e
      - f`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'e', 'f']),
  ])

  // update DOM
  wrapper.update()

  const childrenB = getChildrenComponent(store.getState(), ['a', 'b'])
  const childrenK = getChildrenComponent(store.getState(), ['a', 'k'])

  expect(childrenB.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenK.hasClass('distance-from-cursor-1')).toBe(true)
})

it('when the cursor is null, all thoughts should be visible and not dimmed', () => {
  const text = `
  - a
    - b
      - c
        - d
          - e
            - f`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursor({ path: null }),
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(store.getState(), ['a', 'b', 'c'])
  const childrenB = getChildrenComponent(store.getState(), ['a', 'b'])
  const childrenA = getChildrenComponent(store.getState(), ['a'])

  expect(childrenC.hasClass('distance-from-cursor-0')).toBe(true)
  expect(childrenB.hasClass('distance-from-cursor-0')).toBe(true)
  expect(childrenA.hasClass('distance-from-cursor-0')).toBe(true)
})

it('siblings of the leaf cursor should not be dimmed', () => {
  const text = `
  - a
    - b
    - c
    - d
      - e`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b']),
  ])

  // update DOM
  wrapper.update()

  const childrenA = getChildrenComponent(store.getState(), ['a'])

  expect(childrenA.hasClass('distance-from-cursor-0')).toBe(true)
})

it('siblings of the non leaf cursor should be dimmed', () => {
  const text = `
  - a
    - b
      - 1
    - c
    - d
      - e`

  // import thoughts
  store.dispatch([
    importText({
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b']),
  ])

  // update DOM
  wrapper.update()

  const childrenA = getChildrenComponent(store.getState(), ['a'])

  expect(childrenA.hasClass('distance-from-cursor-1')).toBe(true)
})
