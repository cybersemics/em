import { findAllByLabelText, screen } from '@testing-library/react'
import { act } from 'react'
import { extractSubthoughtActionCreator as extractSubthought } from '../../actions/extractSubthought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import extractSubthoughtCommand from '../extractSubthought'

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

describe('Extract Subthought', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('an alert should be shown if there is no selection', async () => {
    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    store.dispatch(extractSubthought())

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {
    const thoughtValue = 'this is a thought'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursor([thoughtValue]),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 17)
    store.dispatch([extractSubthought()])

    const updatedThought = await findThoughtByText(thoughtValue.slice(0, 9))
    expect(updatedThought?.textContent).toBeTruthy()

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    // created thought gets appended to the end
    const thoughtChildrenWrapper = thought!.closest('div[aria-label=tree-node]')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByLabelText(thoughtChildrenWrapper, 'thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['this is a'])
  })

  it('the cursor does not get updated on child creation', async () => {
    const thoughtValue = 'this is a test thought'
    store.dispatch([newThought({ value: thoughtValue }), setCursor([thoughtValue])])

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = setSelection(thought!, 10, 22)
    store.dispatch([extractSubthought()])

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: thoughtValue.slice(0, 9) }])
  })

  describe('multicursor', () => {
    it('extracts from the thought being edited when several thoughts are selected', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie delta
            - echo
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])

      executeCommandWithMulticursor(extractSubthoughtCommand, { store })

      // The other selected thoughts keep their values. Slicing them at the selection's offsets would have left
      // "charlita" with the child "e del", and "echo" with an empty child.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta
  - echo`)
    })

    it('extracts from the thought being edited when a different thought is selected', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie delta
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      // select a thought other than the one being edited, as alt-clicking its bullet does
      store.dispatch([addMulticursor(['charlie delta'])])

      executeCommandWithMulticursor(extractSubthoughtCommand, { store })

      // The extraction applies to the thought that owns the selection, not to the selected thought.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta`)
    })

    it('leaves the cursor and the selected thoughts selected', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie delta
            - echo
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])

      executeCommandWithMulticursor(extractSubthoughtCommand, { store })

      // Precondition: the extraction occurred, otherwise the assertions below would hold vacuously.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta
  - echo`)

      const state = store.getState()

      expectPathToEqual(state, state.cursor, ['alpha'])
      expect(
        Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
      ).toEqual([['alpha'], ['charlie delta'], ['echo']])
    })

    it('an alert should be shown if there is no selection and several thoughts are selected', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie delta
          `,
        }),
        setCursor(['alpha bravo']),
        addMulticursor(['alpha bravo']),
        addMulticursor(['charlie delta']),
      ])

      // Flush the throttled "2 thoughts selected" alert from the multiselect so that it cannot overwrite the alert
      // raised by the command below.
      await act(vi.runOnlyPendingTimersAsync)

      executeCommandWithMulticursor(extractSubthoughtCommand, { store })

      expect(await screen.findByText('No text selected to extract')).toBeTruthy()

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta`)
    })

    it('reverts the extraction on a single undo', async () => {
      store.dispatch([
        importText({
          text: `
            - alpha bravo
            - charlie delta
            - echo
          `,
        }),
        setCursor(['alpha bravo']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 11)

      store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])

      executeCommandWithMulticursor(extractSubthoughtCommand, { store })

      // Precondition: the extraction occurred, otherwise the undo below would have nothing to revert.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta
  - echo`)

      store.dispatch(undo())

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta
  - echo`)
    })
  })
})
