import importText from '../../actions/importText'
import newThought from '../../actions/newThought'
import { EMPTY_SPACE, HOME_TOKEN } from '../../constants'
import editThought from '../../test-helpers/editThoughtByContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import exportContext from '../exportContext'

it('meta and archived thoughts are included by default', () => {
  const text = `
    - a
      - =archive
        - c
      - =pin
        - true
      - b
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain')

  expect(exported).toBe(`- a
  - =archive
    - c
  - =pin
    - true
  - b`)
})

it('exclude archived thoughts', () => {
  const text = `
    - a
      - =archive
        - c
      - =pin
        - true
      - b
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeArchived: true })

  expect(exported).toBe(`- a
  - =pin
    - true
  - b`)
})

it('exclude meta attributes but not archived thoughts', () => {
  const text = `
    - a
      - =archive
        - c
      - =pin
        - true
      - b
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- a
  - =archive
    - c
  - b`)
})

it('exclude all meta attributes, including archived thoughts', () => {
  const text = `
    - a
      - =archive
        - c
      - =pin
        - true
      - b
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true, excludeArchived: true })

  expect(exported).toBe(`- a
  - b`)
})

it('exported as plain text with no formatting', () => {
  const text = `
    - a
      - Hello <b>world</b>
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMarkdownFormatting: true })

  expect(exported).toBe(`- a
  - Hello world`)
})

it('exported as html', () => {
  const text = `
    - a
      - Hello <b>world</b>
  `

  const steps = [importText({ text }), setCursor(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/html')

  expect(exported).toBe(`<ul>
  <li>a${EMPTY_SPACE}
    <ul>
      <li>Hello <b>world</b></li>
    </ul>
  </li>
</ul>`)
})

// This should never happen (newlines are converted to new thoughts on import) but guard against newlines just in case.
// Otherwise re-importing is disastrous (text after the newline are moved to the root)
it('export multi-line thoughts as separate thoughts', () => {
  const text = `
    - a
      - b
        - Hello
  `

  const steps = [importText({ text }), editThought(['a', 'b', 'Hello'], 'Hello\nworld')]
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - Hello
      - world`)
})

it('export as markdown', () => {
  const text = `Hello <b>wor<i>ld</i></b>`

  const steps = [importText({ text }), setCursor([text])]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [text], 'text/plain')

  expect(exported).toBe(`Hello **wor*ld***`)
})

it('export as markdown without escaping metaprogramming attributes', () => {
  const text = `
    - Hello <b>wor<i>ld</i></b>
      - =readonly
  `

  const steps = [importText({ text }), setCursor([text])]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, ['Hello <b>wor<i>ld</i></b>'], 'text/plain')

  expect(exported).toBe(`- Hello **wor*ld***
  - =readonly`)
})

it('export as plain and markdown text replacing html tags only from thoughts and not from the whole exported content.', () => {
  const text = `
    - a
    - <
    - b
    - />
    - c
  `

  const steps = [importText({ text }), setCursor([text])]

  const stateNew = reducerFlow(steps)(initialState())
  const exportedPlain = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exportedPlain).toBe(`- ${HOME_TOKEN}
  - a
  - <
  - b
  - />
  - c`)

  const exportedMarkdown = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exportedMarkdown).toBe(`- ${HOME_TOKEN}
  - a
  - <
  - b
  - />
  - c`)
})

it('decode character entities when exporting as plain text', () => {
  const steps = [
    newThought('a'),
    setCursor(['a']),
    // use newThought to insert &amp; because importText decodes character entities
    newThought({ value: 'one &amp; two', insertNewSubthought: true }),
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain')

  expect(exported).toBe(`- a
  - one & two`)
})
