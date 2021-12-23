import { initialState, reducerFlow } from '../../util'
import { importText } from '../../reducers'
import { EMPTY_SPACE, HOME_TOKEN } from '../../constants'
import exportContext from '../exportContext'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'
import editThoughtAtFirstMatch from '../../test-helpers/editThoughtAtFirstMatch'

it('meta and archived thoughts are included', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain')

  expect(exported).toBe(`- a
  - =archive
    - c
  - =pin
    - true
  - b`)
})

it('meta is included but archived thoughts are excluded', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeArchived: true })

  expect(exported).toBe(`- a
  - =pin
    - true
  - b`)
})

it('meta is excluded', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', {
    excludeMeta: true,
    excludeArchived: true,
  })

  expect(exported).toBe(`- a
  - b`)
})

it('meta is excluded but archived is included', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- a
  - b`)
})

it('exported as plain text with no formatting', () => {
  const text = `- a
  - Hello <b>world</b>`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true, excludeMarkdownFormatting: true })

  expect(exported).toBe(`- a
  - Hello world`)
})

it('exported as html', () => {
  const text = `- a
  - Hello <b>world</b>`

  const steps = [importText({ text }), setCursorFirstMatch(['a'])]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/html', { excludeMeta: true })

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
  const text = `- a
  - b
    - Hello`

  const steps = [
    importText({ text }),
    editThoughtAtFirstMatch({
      oldValue: 'Hello',
      newValue: 'Hello\nworld',
      at: ['a', 'b', 'hello'],
    }),
  ]
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

  const steps = [importText({ text }), setCursorFirstMatch([text])]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [text], 'text/plain')

  expect(exported).toBe(`Hello **wor*ld***`)
})

it('export as markdown without escaping metaprogramming attributes', () => {
  const text = `- Hello <b>wor<i>ld</i></b>
  - =readonly`

  const steps = [importText({ text }), setCursorFirstMatch([text])]

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

  const steps = [importText({ text }), setCursorFirstMatch([text])]

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
