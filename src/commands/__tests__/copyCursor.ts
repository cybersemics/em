import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import * as copyModule from '../../device/copy'
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

    expect(copyModule.default).toHaveBeenCalledWith('a')
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

      expect(copyModule.default).toHaveBeenCalledWith('a')
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
      )
    })
  })
})
