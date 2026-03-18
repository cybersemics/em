import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import splitSentencesCommand from '../splitSentences'

beforeEach(initStore)

describe('splitSentences', () => {
  it('splits a thought with multiple sentences', () => {
    store.dispatch([
      importText({
        text: `
          - This is sentence one. This is sentence two. This is sentence three.
        `,
      }),
      setCursor(['This is sentence one. This is sentence two. This is sentence three.']),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - This is sentence one.
  - This is sentence two.
  - This is sentence three.`)
  })

  it('splits a thought with multiple sentences all wrapped in a single bold tag', () => {
    store.dispatch([
      newThought({ value: '' }),
      setCursor(['']),
      editThought([''], '<b>This is sentence one. This is sentence two. This is sentence three.</b>'),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - **This is sentence one.**
  - **This is sentence two.**
  - **This is sentence three.**`)
  })

  it('does not split a thought with a single sentence and a font tag', () => {
    store.dispatch([
      newThought({ value: '' }),
      setCursor(['']),
      editThought([''], `<font color="#000000" style="background-color: rgb(0, 214, 136);">font</font>`),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exported).toBe(`<ul>
  <li>__ROOT__  
    <ul>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">font</font></li>
    </ul>
  </li>
</ul>`)
  })

  it('splits a thought with a multiple comma-delimited sentences plus a font tag', () => {
    store.dispatch([
      newThought({ value: '' }),
      setCursor(['']),
      editThought(
        [''],
        `<font color="#000000" style="background-color: rgb(0, 214, 136);">comma one, comma two</font></li>`,
      ),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
    expect(exported).toBe(`<ul>
  <li>__ROOT__  
    <ul>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">comma one</font></li>
      <li><font color="#000000" style="background-color: rgb(0, 214, 136);">comma two</font></li>
    </ul>
  </li>
</ul>`)
  })

  it('does not split a thought with a single sentence', () => {
    store.dispatch([
      importText({
        text: `
          - This is a single sentence.
        `,
      }),
      setCursor(['This is a single sentence.']),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - This is a single sentence.`)
  })

  it('handles sentences with punctuation and special characters', () => {
    store.dispatch([
      importText({
        text: `
          - Hello, world! How are you? I'm fine, thanks.
        `,
      }),
      setCursor(["Hello, world! How are you? I'm fine, thanks."]),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - Hello, world!
  - How are you?
  - I'm fine, thanks.`)
  })

  it('splits by comma if have only one sentence', () => {
    store.dispatch([
      importText({
        text: `
          - Gödel, Escher, Bach
        `,
      }),
      setCursor(['Gödel, Escher, Bach']),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - Gödel
  - Escher
  - Bach`)
  })

  it('splits by "and" also, if have only one sentence', () => {
    store.dispatch([
      importText({
        text: `
          - me, you, he and she, them, thus, and, me
        `,
      }),
      setCursor(['me, you, he and she, them, thus, and, me']),
    ])

    executeCommand(splitSentencesCommand, { store })

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

  it('splits thought with dash into main thought and child', () => {
    store.dispatch([
      importText({
        text: `
          - one - 1
        `,
      }),
      setCursor(['one - 1']),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - one
    - 1`)
  })

  it('splits by sentences when both dash and multiple sentences are present', () => {
    store.dispatch([
      importText({
        text: `
          - one - 1. two. three.
        `,
      }),
      setCursor(['one - 1. two. three.']),
    ])

    executeCommand(splitSentencesCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- __ROOT__
  - one - 1.
  - two.
  - three.`)
  })

  describe('multicursor', () => {
    it('splits sentences in multiple thoughts', async () => {
      store.dispatch([
        importText({
          text: `
            - A. This is A. More A.
            - B. This is B.
            - C. This is C. More C.
          `,
        }),
        setCursor(['A. This is A. More A.']),
        addMulticursor(['A. This is A. More A.']),
        addMulticursor(['C. This is C. More C.']),
      ])

      executeCommandWithMulticursor(splitSentencesCommand, { store })

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
      store.dispatch([
        importText({
          text: `
            - One sentence only.
            - Two sentences here. And the second one.
            - Three now. Middle sentence. Last one.
          `,
        }),
        setCursor(['One sentence only.']),
        addMulticursor(['One sentence only.']),
        addMulticursor(['Two sentences here. And the second one.']),
        addMulticursor(['Three now. Middle sentence. Last one.']),
      ])

      executeCommandWithMulticursor(splitSentencesCommand, { store })

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
