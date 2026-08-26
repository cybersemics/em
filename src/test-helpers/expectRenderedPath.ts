import Path from '../@types/Path'
import State from '../@types/State'
import linearizeTree from '../selectors/linearizeTree'
import equalPath from '../util/equalPath'
import prettyPath from './prettyPath'

/**
 * Asserts that a Path addresses a thought that is actually rendered.
 *
 * Worth asserting separately from the Path's values, because the context view makes the two come apart: a step that
 * should have crossed a context view but was built as an ordinary child step converts to the same Context, so an
 * assertion on values alone passes while the cursor names a row that is not on screen.
 */
const expectRenderedPath = (state: State, path: Path | null) => {
  expect(path).not.toBeNull()
  const rendered = linearizeTree(state).map(node => node.path)
  if (!rendered.some(renderedPath => equalPath(renderedPath, path))) {
    throw new Error(
      `Expected ${prettyPath(state, path)} to be rendered, but the rendered thoughts are:\n${rendered
        .map(renderedPath => `  ${prettyPath(state, renderedPath)}`)
        .join('\n')}`,
    )
  }
}

export default expectRenderedPath
