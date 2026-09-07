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
import selectRange from '../../test-helpers/selectRange'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import extractSubthoughtCommand from '../extractSubthought'

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
    act(() => {
      store.dispatch([
        newThought({ value: thoughtValue }),
        newThought({ value: 'sub-thought', insertNewSubthought: true }),
        setCursor([thoughtValue]),
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    act(() => {
      store.dispatch(extractSubthought())
    })

    const alert = await screen.findByText('No text selected to extract')
    expect(alert).toBeTruthy()

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()
  })

  it('the selected part of a thought is extracted as a child thought', async () => {
    const thoughtValue = 'this is a thought'
    act(() => {
      store.dispatch([
        newThought({ value: thoughtValue }),
        newThought({ value: 'sub-thought', insertNewSubthought: true }),
        setCursor([thoughtValue]),
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = selectRange(thought!, 10, 17)
    act(() => {
      store.dispatch([extractSubthought()])
    })

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
    act(() => {
      store.dispatch([newThought({ value: thoughtValue }), setCursor([thoughtValue])])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const selectedText = selectRange(thought!, 10, 22)
    act(() => {
      store.dispatch([extractSubthought()])
    })

    const createdThought = await findThoughtByText(selectedText)
    expect(createdThought).toBeTruthy()

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: thoughtValue.slice(0, 9) }])
  })

  describe('formatting', () => {
    it('extracts the selection with its formatting intact', async () => {
      act(() => {
        store.dispatch([importText({ text: '- <b>Lorem ipsum dolor</b>' }), setCursor(['<b>Lorem ipsum dolor</b>'])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 6, 12)

      act(() => {
        store.dispatch(extractSubthought())
      })

      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<b>Lorem dolor</b>')
      expect(getAllChildrenAsThoughtsByContext(state, ['<b>Lorem dolor</b>']).map(child => child.value)).toEqual([
        '<b>ipsum</b>',
      ])
    })

    it('merges the tags that become adjacent at every level of nesting', async () => {
      act(() => {
        store.dispatch([
          importText({ text: '- <b>Lorem <i>ipsum dolor sit</i> amet</b>' }),
          setCursor(['<b>Lorem <i>ipsum dolor sit</i> amet</b>']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 12, 17)

      act(() => {
        store.dispatch(extractSubthought())
      })

      // Both halves of the split carry the whole enclosing chain, so re-joining them duplicates <b> at the top level
      // and <i> one level down, the latter only becoming adjacent once the <b>s have merged.
      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<b>Lorem <i>ipsum  sit</i> amet</b>')
      expect(
        getAllChildrenAsThoughtsByContext(state, ['<b>Lorem <i>ipsum  sit</i> amet</b>']).map(child => child.value),
      ).toEqual(['<b><i>dolor</i></b>'])
    })

    it('keeps each color when the selection spans two of them', async () => {
      const value = '<span style="color: red;">Lorem ipsum </span><span style="color: green;">dolor sit</span>'
      act(() => {
        store.dispatch([importText({ text: `- ${value}` }), setCursor([value])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      // "ipsum dolor", which starts in the red half and ends in the green half
      selectRange(thought!, 6, 17)

      act(() => {
        store.dispatch(extractSubthought())
      })

      // The space on either side of the selection is left in place, as it is for an unformatted thought.
      const state = store.getState()
      const newValue = '<span style="color: red;">Lorem </span><span style="color: green;"> sit</span>'
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe(newValue)
      expect(getAllChildrenAsThoughtsByContext(state, [newValue]).map(child => child.value)).toEqual([
        '<span style="color: red;">ipsum </span><span style="color: green;">dolor</span>',
      ])
    })

    it('extracts a selection that starts in the second text node', async () => {
      act(() => {
        store.dispatch([importText({ text: '- one <b>two</b> three' }), setCursor(['one <b>two</b> three'])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 4, 7)

      act(() => {
        store.dispatch(extractSubthought())
      })

      // The space on either side of the selection is left in place, as it is for an unformatted thought, and the <b>
      // the split empties is dropped rather than left in the value.
      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('one  three')
      expect(getAllChildrenAsThoughtsByContext(state, ['one  three']).map(child => child.value)).toEqual(['<b>two</b>'])
    })

    it('extracts a selection that starts in the third text node', async () => {
      act(() => {
        store.dispatch([importText({ text: '- one <b>two</b> three' }), setCursor(['one <b>two</b> three'])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 8, 13)

      act(() => {
        store.dispatch(extractSubthought())
      })

      const state = store.getState()
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe('one <b>two</b>')
      expect(getAllChildrenAsThoughtsByContext(state, ['one <b>two</b>']).map(child => child.value)).toEqual(['three'])
    })

    it('extracts text that has a background color', async () => {
      // seeded with newThought because importText rewrites the font tag that applyColor produces into a span
      const value =
        '<font color="#000000" style="background-color: rgb(0, 214, 136);">Lorem ipsum dolor sit amet</font>'
      act(() => {
        store.dispatch([newThought({ value }), setCursor([value])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findCursor()
      expect(thought).toBeTruthy()
      selectRange(thought!, 0, 11)

      act(() => {
        store.dispatch(extractSubthought())
      })

      const state = store.getState()
      const newValue = '<font color="#000000" style="background-color: rgb(0, 214, 136);">dolor sit amet</font>'
      expect(getThoughtById(state, head(state.cursor!))!.value).toBe(newValue)
      expect(getAllChildrenAsThoughtsByContext(state, [newValue]).map(child => child.value)).toEqual([
        '<font color="#000000" style="background-color: rgb(0, 214, 136);">Lorem ipsum</font>',
      ])
    })
  })

  describe('multicursor', () => {
    it('extracts from the thought being edited when several thoughts are selected', async () => {
      act(() => {
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
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      selectRange(thought!, 6, 11)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])
      })

      act(() => executeCommandWithMulticursor(extractSubthoughtCommand, { store }))

      // The other selected thoughts keep their values. Slicing them at the selection's offsets would have left
      // "charlita" with the child "e del", and "echo" with an empty child.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta
  - echo`)
    })

    it('extracts from the thought being edited when a different thought is selected', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
              - charlie delta
            `,
          }),
          setCursor(['alpha bravo']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      selectRange(thought!, 6, 11)

      // select a thought other than the one being edited, as alt-clicking its bullet does
      act(() => {
        store.dispatch([addMulticursor(['charlie delta'])])
      })

      act(() => executeCommandWithMulticursor(extractSubthoughtCommand, { store }))

      // The extraction applies to the thought that owns the selection, not to the selected thought.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta`)
    })

    it('leaves the cursor and the selected thoughts selected', async () => {
      act(() => {
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
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      selectRange(thought!, 6, 11)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])
      })

      act(() => executeCommandWithMulticursor(extractSubthoughtCommand, { store }))

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
      act(() => {
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
      })

      // Flush the throttled "2 thoughts selected" alert from the multiselect so that it cannot overwrite the alert
      // raised by the command below.
      await act(vi.runOnlyPendingTimersAsync)

      act(() => executeCommandWithMulticursor(extractSubthoughtCommand, { store }))

      expect(await screen.findByText('No text selected to extract')).toBeTruthy()

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta`)
    })

    it('reverts the extraction on a single undo', async () => {
      act(() => {
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
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      expect(thought).toBeTruthy()
      selectRange(thought!, 6, 11)

      act(() => {
        store.dispatch([addMulticursor(['alpha bravo']), addMulticursor(['charlie delta']), addMulticursor(['echo'])])
      })

      act(() => executeCommandWithMulticursor(extractSubthoughtCommand, { store }))

      // Precondition: the extraction occurred, otherwise the undo below would have nothing to revert.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha
    - bravo
  - charlie delta
  - echo`)

      act(() => {
        store.dispatch(undo())
      })

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta
  - echo`)
    })
  })

  describe('Command Universe', () => {
    it('extracts the text that was selected before the Command Universe took the focus', async () => {
      act(() => {
        store.dispatch([importText({ text: '- hello world' }), setCursor(['hello world'])])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('hello world')
      selectRange(thought!, 6, 11)

      // Opening the Command Universe snapshots the selection; its search input then takes it. Executing a command
      // closes the Command Universe first, so the snapshot has to survive the close.
      act(() => {
        store.dispatch(desktopCommandUniverse())
      })
      moveSelectionToSearchInput()
      act(() => {
        store.dispatch([desktopCommandUniverse(), extractSubthought()])
      })

      // Let the Command Universe's fade-out complete so that it unmounts before the test ends. Otherwise its animated
      // command icons keep a repeating interval alive, which cleanupTestApp's vi.runAllTimersAsync can never drain.
      await act(vi.runOnlyPendingTimersAsync)

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - hello
    - world`)
    })

    it('does not apply the snapshot to a thought other than the one it was taken on', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - alpha bravo
              - charlie delta
            `,
          }),
          setCursor(['alpha bravo']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      const thought = await findThoughtByText('alpha bravo')
      selectRange(thought!, 6, 11)

      act(() => {
        store.dispatch(desktopCommandUniverse())
      })
      moveSelectionToSearchInput()

      // A command executed from the Command Universe can move the cursor. Slicing the thought it lands on at offsets
      // that index into the thought the snapshot came from would mangle its value.
      act(() => {
        store.dispatch([desktopCommandUniverse(), setCursor(['charlie delta']), extractSubthought()])
      })

      // Let the Command Universe's fade-out complete so that it unmounts before the test ends. Otherwise its animated
      // command icons keep a repeating interval alive, which cleanupTestApp's vi.runAllTimersAsync can never drain.
      await act(vi.runOnlyPendingTimersAsync)

      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - alpha bravo
  - charlie delta`)
    })
  })
})
