import { importText } from '../../actions'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import * as getChildren from '../getChildren'
import linearizeTree from '../linearizeTree'

afterEach(vi.restoreAllMocks)

it('reads cursor children once to calculate autofocus for a traversal', () => {
  const state = reducerFlow([importText({ text: '- a\n  - b\n  - c' }), setCursor(['a'])])(initialState())
  const path = contextToPathOrThrow(state, ['a'], 'linearizeTree')
  const hasChildren = vi.spyOn(getChildren, 'hasChildren')

  const tree = linearizeTree(state, { basePath: path, depth: 0, indexDescendant: 0 })

  expect(tree.map(node => node.autofocus)).toEqual(['show', 'show'])
  expect(hasChildren.mock.calls.filter(([, id]) => id === path[0])).toHaveLength(1)
})
