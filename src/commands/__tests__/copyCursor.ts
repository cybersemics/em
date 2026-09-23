import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import * as copyModule from '../../device/copy'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import copyCursorCommand from '../copyCursor'

vi.mock('../../device/copy')

beforeEach(initStore)

describe('copyCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies a single thought and its descendants', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - a1
            - a2
          - b
            - b1
            - b2
        `,
      }),
      setCursor(['a']),
    ])

    executeCommandWithMulticursor(copyCursorCommand, { store })

    expect(copyModule.default).toHaveBeenCalledWith(
      `- a
  - a1
  - a2`,
      expect.objectContaining({ html: expect.any(String) }),
    )
  })

  it('omit the bullet "-" when copying a single thought', async () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])

    executeCommandWithMulticursor(copyCursorCommand, { store })

    expect(copyModule.default).toHaveBeenCalledWith('a', expect.objectContaining({ html: expect.any(String) }))
  })

  it('does not add an undo step', async () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
      newThought({ value: 'c' }),
      setCursor(['a']),
    ])

    executeCommandWithMulticursor(copyCursorCommand, { store })
    await vi.runAllTimersAsync()

    store.dispatch(undo())

    // Undo reverts the thought created before the copy, not the copy.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - b`)
  })

  describe('multicursor', () => {
    it('copies multiple thoughts and their descendants', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
              - a2
            - b
              - b1
              - b2
            - c
              - c1
              - c2
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(copyCursorCommand, { store })

      expect(copyModule.default).toHaveBeenCalledWith(
        `- a
  - a1
  - a2
- c
  - c1
  - c2`,
        expect.objectContaining({ html: expect.any(String) }),
      )
    })

    it('omit the bullet "-" when copying a single thought', async () => {
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
      ])

      executeCommandWithMulticursor(copyCursorCommand, { store })

      expect(copyModule.default).toHaveBeenCalledWith('a', expect.objectContaining({ html: expect.any(String) }))
    })

    it('only copies ancestors when both ancestor and descendant are selected', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
                - a1a
              - a2
            - b
              - b1
              - b2
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['a', 'a1']),
      ])

      executeCommandWithMulticursor(copyCursorCommand, { store })

      expect(copyModule.default).toHaveBeenCalledWith(
        `- a
  - a1
    - a1a
  - a2`,
        expect.objectContaining({ html: expect.any(String) }),
      )
    })

    it('handles mixed scenarios correctly', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - a1
                - a1a
              - a2
            - b
              - b1
              - b2
            - c
              - c1
              - c2
          `,
        }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['a', 'a1']),
        addMulticursor(['b', 'b1']),
        addMulticursor(['c']),
      ])

      executeCommandWithMulticursor(copyCursorCommand, { store })

      expect(copyModule.default).toHaveBeenCalledWith(
        `- a
  - a1
    - a1a
  - a2
- b1
- c
  - c1
  - c2`,
        expect.objectContaining({ html: expect.any(String) }),
      )
    })

    it('does not move the cursor or multicursors when copying in context view', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - m
                - x
                - y
                - z
            - b
              - m
                - x
                - y
                - z
          `,
        }),
        setCursor(['a', 'm']),
        toggleContextView(),
        setCursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'a']),
        addMulticursor(['a', 'm', 'b']),
      ])

      const stateBefore = store.getState()
      const cursorBefore = stateBefore.cursor
      const multicursorsBefore = stateBefore.multicursors

      executeCommandWithMulticursor(copyCursorCommand, { store })

      const stateAfter = store.getState()
      expect(stateAfter.cursor).toEqual(cursorBefore)
      expect(stateAfter.multicursors).toEqual(multicursorsBefore)
    })

    it('does not move the cursor or multicursors when copying a descendant in context view', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - m
                - x
                - y
                - z
            - b
              - m
                - x
                - y
                - z
          `,
        }),
        setCursor(['a', 'm']),
        toggleContextView(),
        setCursor(['a', 'm', 'a', 'x']),
        addMulticursor(['a', 'm', 'a', 'x']),
        addMulticursor(['a', 'm', 'a', 'y']),
      ])

      const stateBefore = store.getState()
      const cursorBefore = stateBefore.cursor
      const multicursorsBefore = stateBefore.multicursors

      executeCommandWithMulticursor(copyCursorCommand, { store })

      const stateAfter = store.getState()
      expect(stateAfter.cursor).toEqual(cursorBefore)
      expect(stateAfter.multicursors).toEqual(multicursorsBefore)
    })

    it('does not add an undo step', async () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
          `,
        }),
        setCursor(['a']),
        newThought({ value: 'c' }),
        setCursor(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
      ])

      executeCommandWithMulticursor(copyCursorCommand, { store })
      await vi.runAllTimersAsync()

      store.dispatch(undo())

      // Undo reverts the thought created before the copy, not the copy.
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - b`)
    })
  })
})
