import { screen } from '@testing-library/dom'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import hashPath from '../../util/hashPath'

/** Get a thought with the context. */
export const getThoughtByContext = (context: string[]): HTMLElement => {
  const path = contextToPath(store.getState(), context)
  const pathOfThought = hashPath(path)
  const thought = screen.getByTestId('thought-' + pathOfThought)

  return thought
}
