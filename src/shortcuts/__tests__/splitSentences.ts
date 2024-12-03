import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestStore from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import executeShortcut, { executeShortcutWithMulticursor } from '../../util/executeShortcut'
import splitSentencesShortcut from '../splitSentences'

describe('splitSentences', () => {
  it('splits a thought with multiple sentences', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - This is sentence one. This is sentence two. This is sentence three.
        `,
      }),
      setCursor(['This is sentence one. This is sentence two. This is sentence three.']),
    ])

    executeShortcut(splitSentencesShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - This is sentence one.
  - This is sentence two.
  - This is sentence three.`)
  })

  it('does not split a thought with a single sentence', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - This is a single sentence.
        `,
      }),
      setCursor(['This is a single sentence.']),
    ])

    executeShortcut(splitSentencesShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - This is a single sentence.`)
  })

  it('handles sentences with punctuation and special characters', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - Hello, world! How are you? I'm fine, thanks.
        `,
      }),
      setCursor(["Hello, world! How are you? I'm fine, thanks."]),
    ])

    executeShortcut(splitSentencesShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - Hello, world!
  - How are you?
  - I'm fine, thanks.`)
  })

  it('splits by comma if have only one sentence', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - Gödel, Escher, Bach
        `,
      }),
      setCursor(['Gödel, Escher, Bach']),
    ])

    executeShortcut(splitSentencesShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - Gödel
  - Escher
  - Bach`)
  })

  it('splits by "and" also, if have only one sentence', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - me, you, he and she, them, thus, and, me
        `,
      }),
      setCursor(['me, you, he and she, them, thus, and, me']),
    ])

    executeShortcut(splitSentencesShortcut, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - me
  - you
  - he
  - she
  - them
  - thus
  - me`)
  })

  describe('multicursor', () => {
    it('splits sentences in multiple thoughts', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - A. This is A. More A.
            - B. This is B.
            - C. This is C. More C.
          `,
        }),
        setCursor(['A. This is A. More A.']),
        addMulticursor(['C. This is C. More C.']),
      ])

      executeShortcutWithMulticursor(splitSentencesShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - A.
  - This is A.
  - More A.
  - B. This is B.
  - C.
  - This is C.
  - More C.`)
    })

    it('handles mixed scenarios with single and multiple sentences', async () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - One sentence only.
            - Two sentences here. And the second one.
            - Three now. Middle sentence. Last one.
          `,
        }),
        setCursor(['One sentence only.']),
        addMulticursor(['Two sentences here. And the second one.']),
        addMulticursor(['Three now. Middle sentence. Last one.']),
      ])

      executeShortcutWithMulticursor(splitSentencesShortcut, { store })

      const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
      expect(exported).toBe(`- __ROOT__
  - One sentence only.
  - Two sentences here.
  - And the second one.
  - Three now.
  - Middle sentence.
  - Last one.`)
    })
  })
})
