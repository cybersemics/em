import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import commandStateStore from '../../stores/commandStateStore'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import boldCommand from '../bold'

beforeEach(initStore)

describe('bold', () => {
  // Regression test for #3995: applying bold to the cursor thought must update the command state store so the toolbar
  // button highlights as active. formatWithTag edits the value directly (no document.execCommand selectionchange), so it
  // must refresh the command state explicitly.
  it('updates the command state so the toolbar button reflects the active formatting', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
    ])

    executeCommand(boldCommand, { store })

    expect(commandStateStore.getState().bold).toBe(true)

    // toggling again removes the formatting and deactivates the button state
    executeCommand(boldCommand, { store })

    expect(commandStateStore.getState().bold).toBe(false)
  })

  describe('multicursor', () => {
    // Regression test for #3995: applying a text formatting command to a multiselection (e.g. from the Command Center
    // on mobile) must format every selected thought. Formatting previously relied on document.execCommand, which is a
    // no-op when no editable is focused (real iOS WebKit, and JSDOM in tests), so no formatting was applied.
    it('applies bold formatting to all selected thoughts', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(boldCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - **a**
  - **b**
  - c`)

      // the toolbar button must reflect the active formatting after a multicursor command (#3995)
      expect(commandStateStore.getState().bold).toBe(true)
    })

    // Regression test for #3995: when the cursor is on a thought that is NOT part of the multiselection (e.g. the
    // selected thoughts are scrolled out of view and an unrelated thought holds the cursor), executeCommandWithMulticursor
    // restores the original cursor after formatting. The cursor-change command state update must not run during multicursor
    // execution, otherwise it reads the unselected cursor thought's value and deactivates the toolbar button.
    it('keeps the command state active when the cursor is on an unselected thought', () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        // cursor on c, which is not part of the multiselection {a, b}
        setCursor(['c']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(boldCommand, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - **a**
  - **b**
  - c`)

      // the toolbar button must remain active even though the restored cursor (c) is not bold (#3995)
      expect(commandStateStore.getState().bold).toBe(true)
    })
  })
})
