import { hashContext, initialState, reducerFlow } from '../../util'
import { editThought, importText, setCursor } from '../../reducers'
import { EMPTY_SPACE, HOME_TOKEN } from '../../constants'
import { SimplePath } from '../../@types'
import exportContext from '../exportContext'

it('meta and archived thoughts are included', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

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

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

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

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

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

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- a
  - b`)
})

it('exported as plain text', () => {
  const text = `- a
  - Hello <b>world</b>`

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- a
  - Hello world`)
})

it('exported as html', () => {
  const text = `- a
  - Hello <b>world</b>`

  const steps = [importText({ text }), setCursor({ path: [{ id: hashContext(['a']), value: 'a', rank: 0 }] })]

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
    editThought({
      oldValue: 'Hello',
      newValue: 'Hello\nworld',
      context: ['a', 'b'],
      path: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 0 },
      ] as SimplePath,
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
