import { fireEvent } from '@testing-library/dom'
import { render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import * as selection from '../../device/selection'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import Editable from '../Editable'

// The focus retarget that follows iOS autocomplete (#4467) is only installed on Mobile Safari.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

beforeEach(initStore)

// Only the DOM half of the scenario can be emulated here: typing the next word depends on the caret that
// selection.set restores, and jsdom does not move focus with the selection. The space surviving in the editable is
// what the next keystroke lands after, so it is the observable that regressed.
it('keeps the space that commits an iOS autocorrect in the editable (#4828)', async () => {
  await dispatch([importText({ text: '- Adf' }), setCursor(['Adf'])])

  const simplePath = contextToPath(store.getState(), ['Adf']) as SimplePath
  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(Editable, {
        isEditing: true,
        isVisible: true,
        path: simplePath,
        rank: 0,
        simplePath,
      }),
    }),
  )
  const editable = container.querySelector('[data-editable]') as HTMLElement
  editable.focus()

  // Pressing space on a misspelled word makes iOS replace the word...
  editable.innerHTML = 'All'
  selection.set(editable, { offset: 'All'.length })
  fireEvent.input(editable, { inputType: 'insertReplacementText' })

  // ...and then insert the space that committed the correction.
  editable.innerHTML = 'All '
  selection.set(editable, { offset: 'All '.length })
  fireEvent.input(editable, { inputType: 'insertText', data: ' ' })

  // the focus retarget blurs and refocuses the editable on the next animation frame
  await act(vi.runAllTimersAsync)

  // The editable the user is typing into must keep the space, otherwise the next word they type is appended
  // directly to the corrected word ("Allthings").
  expect(editable.textContent).toBe('All ')

  // The value committed to Redux is trimmed. It is the divergence between the two that regressed: the retarget's
  // blur used to resync the editable to this trimmed value.
  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - All`)
})
