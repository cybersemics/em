import { render } from '@testing-library/react'
import { createElement } from 'react'
import { Provider } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import MoveThoughtAlert from '../../components/MoveThoughtAlert'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import parentOf from '../../util/parentOf'

beforeEach(initStore)

it('renders home as the destination when a thought is moved to the root', async () => {
  await dispatch(
    importText({
      text: `
        - a
        - b
      `,
    }),
  )

  // the destination path that the drop handler computes when the drop target is a root-level thought
  const toPath = parentOf(contextToPath(store.getState(), ['a']) as SimplePath)

  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(MoveThoughtAlert, { from: 'b', toPath }),
    }),
  )

  expect(container.textContent).toBe('"b" moved to home.')
})
