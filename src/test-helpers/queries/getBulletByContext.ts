import { screen } from '@testing-library/dom'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import hashPath from '../../util/hashPath'

/** Get the bullet of a thought with the context. */
export const getBulletByContext = (context: string[]): HTMLElement => {
  const path = contextToPath(store.getState(), context)
  const pathOfThought = hashPath(path)
  const bulletOfThought = screen.getByTestId('bullet-' + pathOfThought)

  return bulletOfThought
}
