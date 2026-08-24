import { findAllByLabelText, screen } from '@testing-library/react'
import { act } from 'react'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import { extractSubthoughtActionCreator as extractSubthought } from '../../actions/extractSubthought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
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
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import extractSubthoughtCommand from '../extractSubthought'

/**
 * Set range selection at the given plain text offsets, walking across any nested formatting nodes.
 */
const setSelection = (element: HTMLElement, selectionStart: number, selectionEnd: number) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let start: { node: Node; offset: number } | null = null
  let end: { node: Node; offset: number } | null = null
  let offset = 0

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent!.length
    if (!start && selectionStart <= offset + length) start = { node, offset: selectionStart - offset }
    if (start && selectionEnd <= offset + length) {
      end = { node, offset: selectionEnd - offset }
      break
    }
    offset += length
  }

  if (!start || !end)
    throw new Error(`No text at offsets ${selectionStart}-${selectionEnd} of "${element.textContent}"`)

  const range = document.createRange()
  const sel = window.getSelection()

  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)

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

  describe('formatting', () => {
    it('extracts the selection with its formatting intact', async () => {
      store.dispatch([importText({ text: '- <b>Lorem ipsum dolor</b>' }), setCursor(['<b>Lorem ipsum dolor</b>'])])

      await act(vi.runOnlyPendingTimersAsync)

      // findThoughtByText matches a thought's direct text children, of which a formatted thought has none
      const thought = await findCursor()
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 12)

      store.dispatch(extractSubthought())

      // The offsets are plain text offsets, so slicing the value by them would land in the middle of the <b> tag and
      // mangle the markup (#4103).
      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<b>Lorem dolor</b>')
      expect(getAllChildrenAsThoughtsByContext(state, ['<b>Lorem dolor</b>']).map(child => child.value)).toEqual([
        '<b>ipsum</b>',
      ])
    })

    it('merges the tags that become adjacent at every level of nesting', async () => {
      // The tags are nested around a single text node because selectionOffsets measures from the start of the text
      // node the selection begins in, so offsets into a later one would not line up with the value.
      store.dispatch([
        importText({ text: '- <b><i>Lorem ipsum dolor</i></b>' }),
        setCursor(['<b><i>Lorem ipsum dolor</i></b>']),
      ])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      setSelection(thought!, 6, 12)

      store.dispatch(extractSubthought())

      // Both halves of the split carry the whole enclosing chain, so re-joining them duplicates <b> at the top level
      // and <i> one level down, the latter only becoming adjacent once the <b>s have merged.
      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<b><i>Lorem dolor</i></b>')
      expect(getAllChildrenAsThoughtsByContext(state, ['<b><i>Lorem dolor</i></b>']).map(child => child.value)).toEqual(
        ['<b><i>ipsum</i></b>'],
      )
    })

    it('keeps each color when the selection spans two of them', async () => {
      const value = '<span style="color: red;">Lorem ipsum </span><span style="color: green;">dolor sit</span>'
      store.dispatch([importText({ text: `- ${value}` }), setCursor([value])])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      // "ipsum dolor", which starts in the red half and ends in the green half
      setSelection(thought!, 6, 17)

      store.dispatch(extractSubthought())

      // The duplicate space that preceeded "sit" has been trimmed.
      const state = store.getState()
      const newValue = '<span style="color: red;">Lorem </span><span style="color: green;">sit</span>'
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe(newValue)
      expect(getAllChildrenAsThoughtsByContext(state, [newValue]).map(child => child.value)).toEqual([
        '<span style="color: red;">ipsum </span><span style="color: green;">dolor</span>',
      ])
    })
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

  describe('Command Universe', () => {
    it('extracts the text that was selected before the Command Universe took the focus', async () => {
      store.dispatch([importText({ text: '- hello world' }), setCursor(['hello world'])])

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('hello world')
      setSelection(thought!, 6, 11)

      // Opening the Command Universe snapshots the selection; its search input then takes it. Executing a command
      // closes the Command Universe first, so the snapshot has to survive the close.
      store.dispatch(desktopCommandUniverse())
      moveSelectionToSearchInput()
      store.dispatch([desktopCommandUniverse(), extractSubthought()])

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - hello
    - world`)
    })

    it('does not apply the snapshot to a thought other than the one it was taken on', async () => {
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
      setSelection(thought!, 6, 11)

      store.dispatch(desktopCommandUniverse())
      moveSelectionToSearchInput()

      // A command executed from the Command Universe can move the cursor. Slicing the thought it lands on at offsets
      // that index into the thought the snapshot came from would mangle its value.
      store.dispatch([desktopCommandUniverse(), setCursor(['charlie delta']), extractSubthought()])

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta`)
    })
  })
})
