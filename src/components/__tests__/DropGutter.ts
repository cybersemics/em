import { render, screen } from '@testing-library/react'
import { Fragment, createElement } from 'react'
import { Provider } from 'react-redux'
import DragThoughtZone from '../../@types/DragThoughtZone'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { LongPressState } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import Alert from '../Alert'
import DropGutter from '../DropGutter'

// jsdom cannot drive react-dnd's hover detection, so useDrop reports a hover over the DropGutter from a favorite.
vi.mock('react-dnd', async importOriginal => {
  const actual = await importOriginal<typeof import('react-dnd')>()
  return {
    ...actual,
    useDrop: () => [{ isDragInProgress: true, zone: 'Favorites', isHovering: true }, vi.fn()],
  }
})

beforeEach(initStore)

it('shows the whole dragged thought in the hover alert, with its markup stripped', async () => {
  const value = '<b>A long thought</b> that does not fit in sixteen characters'
  await dispatch(importText({ text: `- ${value}` }))
  const simplePath = contextToPath(store.getState(), [value]) as SimplePath
  await dispatch(
    longPress({
      value: LongPressState.DragInProgress,
      draggingThoughts: [simplePath],
      sourceZone: DragThoughtZone.Favorites,
    }),
  )

  render(
    createElement(Provider, {
      store,
      children: createElement(Fragment, null, createElement(DropGutter), createElement(Alert)),
    }),
  )

  expect(screen.getByTestId('alert-content').textContent).toBe(
    'Drop to remove A long thought that does not fit in sixteen characters from favorites',
  )
})
