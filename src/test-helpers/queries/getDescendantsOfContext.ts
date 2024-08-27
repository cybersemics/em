import { screen } from '@testing-library/dom'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'

/** Get a list of descendant thoughts of a context. */
export function getDescendantsOfContext(context: string[]) {
  const pathOfThoughtA = contextToPath(store.getState(), context)
  const matcherThoughtA = new RegExp(`thought-${pathOfThoughtA}[^"]+`)
  const subthoughtsOfA = screen.getAllByTestId(matcherThoughtA)
  return subthoughtsOfA
}
