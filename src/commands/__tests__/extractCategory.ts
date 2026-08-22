import { screen } from '@testing-library/react'
import { act } from 'react'
import { extractCategoryActionCreator as extractCategory } from '../../actions/extractCategory'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
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

beforeEach(initStore)

describe('Extract category', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('an alert should be shown if there is no selection', async () => {
    store.dispatch([importText({ text: '- this is a thought' }), setCursor(['this is a thought'])])

    await act(vi.runOnlyPendingTimersAsync)

    store.dispatch(extractCategory())

    expect(await screen.findByText('No text selected to extract')).toBeTruthy()

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - this is a thought`)
  })

  it('the selected part of a thought becomes its new parent', async () => {
    store.dispatch([importText({ text: '- this is a thought' }), setCursor(['this is a thought'])])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('this is a thought')
    expect(thought).toBeTruthy()
    setSelection(thought!, 10, 17)

    store.dispatch(extractCategory())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - thought
    - this is a`)
  })

  it('the extracted thought keeps its subthoughts', async () => {
    store.dispatch([
      importText({
        text: `
          - alpha bravo
            - charlie
        `,
      }),
      setCursor(['alpha bravo']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('alpha bravo')
    expect(thought).toBeTruthy()
    setSelection(thought!, 6, 11)

    store.dispatch(extractCategory())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
      - charlie`)
  })

  it('the cursor moves to the new category, with the caret at the end of its value', async () => {
    store.dispatch([newThought({ value: 'alpha bravo' }), setCursor(['alpha bravo'])])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText('alpha bravo')
    expect(thought).toBeTruthy()
    setSelection(thought!, 6, 11)

    store.dispatch(extractCategory())

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['bravo'])
    expect(state.cursorOffset).toBe('bravo'.length)
  })

  describe('multicursor', () => {
    it('moves every selected thought into a category named by the selection', async () => {
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

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie']), addMulticursor(['delta'])])

      executeCommandWithMulticursor(extractCategoryCommand, { store })

      // Only the thought that owns the selection is sliced; the others are categorized as they are.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
    - charlie
    - delta`)
    })

    it('categorizes the selected thoughts when the thought being edited is not one of them', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      // select a thought other than the one being edited, as alt-clicking its bullet does
      store.dispatch([addMulticursor(['charlie'])])

      executeCommandWithMulticursor(extractCategoryCommand, { store })

      // The two halves of the command apply where each is defined: the text is extracted from the thought that owns
      // the selection, and the categorization applies to the selected thoughts, exactly as Categorize would.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
  - bravo
    - charlie`)
    })

    it('an alert should be shown and no text extracted when the selected thoughts have different parents', async () => {
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

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('charlie')
      expect(thought).toBeTruthy()
      setSelection(thought!, 0, 4)

      store.dispatch([addMulticursor(['alpha bravo', 'charlie']), addMulticursor(['delta'])])

      await act(vi.runOnlyPendingTimersAsync)

      executeCommandWithMulticursor(extractCategoryCommand, { store })

      expect(await screen.findByText('Cannot categorize thoughts from different parents.')).toBeTruthy()

      // The selection is left in place rather than extracted into a category that was never created.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
    - charlie
  - delta`)
    })

    it('reverts the extraction on a single undo', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie'])])

      executeCommandWithMulticursor(extractCategoryCommand, { store })

      // Precondition: the extraction occurred, otherwise the undo below would have nothing to revert.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - bravo
    - alpha
    - charlie`)

      store.dispatch(undo())

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie`)
    })
  })
})
