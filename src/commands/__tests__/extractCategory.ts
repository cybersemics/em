import { screen } from '@testing-library/react'
import { act } from 'react'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import { extractCategoryActionCreator as extractCategory } from '../../actions/extractCategory'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import initStore from '../../test-helpers/initStore'
import findCursor from '../../test-helpers/queries/findCursor'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import selectRange from '../../test-helpers/selectRange'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import extractCategoryCommand from '../extractCategory'

/**
 * Set range selection.
 */
const setSelection = (element: HTMLElement, selectionStart: number, selectionEnd: number) => {
  const range = document.createRange()
  const sel = window.getSelection()

  range.setStart(element.childNodes[0], selectionStart)
  range.setEnd(element.childNodes[0], selectionEnd)

  sel?.removeAllRanges()
  sel?.addRange(range)

  return range.toString()
}

/**
 * Moves the browser selection off the thought and onto an input, as the Command Universe's search box does when it
 * takes the focus on open. The document has only one selection, so this is what a command executed from the Command
 * Universe sees instead of the text the user selected.
 */
const moveSelectionToSearchInput = () => {
  const input = document.createElement('input')
  document.body.appendChild(input)
  const range = document.createRange()
  range.selectNodeContents(input)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

beforeEach(initStore)

describe('Extract category', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('an alert should be shown if there is no selection', async () => {
    act(() => {
      store.dispatch([importText({ text: '- this is a thought' }), setCursor(['this is a thought'])])
    })

    await act(vi.runOnlyPendingTimersAsync)

    act(() => {
      store.dispatch(extractCategory())
    })

    expect(await screen.findByText('No text selected to extract')).toBeTruthy()

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - this is a thought`)
  })

  it('the selected part of a thought becomes its new parent', async () => {
    act(() => {
      store.dispatch([importText({ text: '- this is a thought' }), setCursor(['this is a thought'])])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('this is a thought')
    expect(thought).toBeTruthy()
    setSelection(thought!, 10, 17)

    act(() => {
      store.dispatch(extractCategory())
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - thought
    - this is a`)
  })

  it('the extracted thought keeps its subthoughts', async () => {
    act(() => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
              - charlie
          `,
        }),
        setCursor(['alpha bravo']),
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('alpha bravo')
    expect(thought).toBeTruthy()
    setSelection(thought!, 6, 11)

    act(() => {
      store.dispatch(extractCategory())
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
      - charlie`)
  })

  it('the cursor moves to the new category, with the caret at the end of its value', async () => {
    act(() => {
      store.dispatch([newThought({ value: 'alpha bravo' }), setCursor(['alpha bravo'])])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('alpha bravo')
    expect(thought).toBeTruthy()
    setSelection(thought!, 6, 11)

    act(() => {
      store.dispatch(extractCategory())
    })

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['bravo'])
    expect(state.cursorOffset).toBe('bravo'.length)
  })

  describe('multicursor', () => {
    it('moves every selected thought into a category named by the selection', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
              - charlie
              - delta
            `,
          }),
          setCursor(['alpha bravo']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie']), addMulticursor(['delta'])])
      })

      act(() => executeCommandWithMulticursor(extractCategoryCommand, { store }))

      // Only the thought that owns the selection is sliced; the others are categorized as they are.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
    - charlie
    - delta`)
    })

    it('categorizes the selected thoughts when the thought being edited is not one of them', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
              - charlie
            `,
          }),
          setCursor(['alpha bravo']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      // select a thought other than the one being edited, as alt-clicking its bullet does
      act(() => {
        store.dispatch([addMulticursor(['charlie'])])
      })

      act(() => executeCommandWithMulticursor(extractCategoryCommand, { store }))

      // The two halves of the command apply where each is defined: the text is extracted from the thought that owns
      // the selection, and the categorization applies to the selected thoughts, exactly as Categorize would.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
  - bravo
    - charlie`)
    })

    it('an alert should be shown and no text extracted when the selected thoughts have different parents', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
                - charlie
              - delta
            `,
          }),
          setCursor(['alpha bravo', 'charlie']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('charlie')
      expect(thought).toBeTruthy()
      setSelection(thought!, 0, 4)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo', 'charlie']), addMulticursor(['delta'])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      act(() => executeCommandWithMulticursor(extractCategoryCommand, { store }))

      expect(await screen.findByText('Cannot categorize thoughts from different parents.')).toBeTruthy()

      // The selection is left in place rather than extracted into a category that was never created.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
    - charlie
  - delta`)
    })

    it('reverts the extraction on a single undo', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
              - charlie
            `,
          }),
          setCursor(['alpha bravo']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie'])])
      })

      act(() => executeCommandWithMulticursor(extractCategoryCommand, { store }))

      // Precondition: the extraction occurred, otherwise the undo below would have nothing to revert.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
    - charlie`)

      act(() => {
        store.dispatch(undo())
      })

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie`)
    })
  })

  describe('formatting', () => {
    // https://github.com/cybersemics/em/issues/5267
    it('extracts the selection with its formatting intact', async () => {
      // seeded with newThought because importText rewrites the font tag that applyColor produces into a span
      const value = '<font color="#ff573d">Lorem ipsum dolor</font>'
      act(() => {
        store.dispatch([newThought({ value }), setCursor([value])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 0, 11)

      act(() => {
        store.dispatch(extractCategory())
      })

      const state = store.getState()
      const categoryValue = '<font color="#ff573d">Lorem ipsum</font>'
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe(categoryValue)
      expect(getAllChildrenAsThoughtsByContext(state, [categoryValue]).map(child => child.value)).toEqual([
        '<font color="#ff573d">dolor</font>',
      ])
    })
  })

  it('extracts the text that was selected before the Command Universe took the focus', async () => {
    act(() => {
      store.dispatch([importText({ text: '- hello world' }), setCursor(['hello world'])])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('hello world')
    setSelection(thought!, 6, 11)

    // Opening the Command Universe snapshots the selection; its search input then takes it. Executing a command
    // closes the Command Universe first, so the snapshot has to survive the close.
    act(() => {
      store.dispatch(desktopCommandUniverse())
    })
    moveSelectionToSearchInput()
    act(() => {
      store.dispatch([desktopCommandUniverse(), extractCategory()])
    })

    // Let the Command Universe's fade-out complete so that it unmounts before the test ends. Otherwise its animated
    // command icons keep a repeating interval alive, which cleanupTestApp's vi.runAllTimersAsync can never drain.
    await act(vi.runOnlyPendingTimersAsync)

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - world
    - hello`)
  })
})
