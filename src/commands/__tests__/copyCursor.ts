import { importTextActionCreator as importText } from '../../actions/importText'
import * as copyModule from '../../device/copy'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { executeCommandWithMulticursor } from '../../util/executeCommand'
import copyCursorCommand from '../copyCursor'

vi.mock('../../device/copy')

describe('copyCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies a single thought and its descendants', async () => {
    const store = createTestStore()

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
    )
  })

  describe('multicursor', () => {
    it('copies multiple thoughts and their descendants', async () => {
      const store = createTestStore()

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
      )
    })

    it('only copies ancestors when both ancestor and descendant are selected', async () => {
      const store = createTestStore()

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
      )
    })

    it('handles mixed scenarios correctly', async () => {
      const store = createTestStore()

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
      )
    })
  })
})
