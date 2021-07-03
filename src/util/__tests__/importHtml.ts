import { HOME_PATH, HOME_TOKEN, EMPTY_SPACE } from '../../constants'
import { importHtml, mergeUpdates, removeHome } from '../../util'
import { exportContext } from '../../selectors'
import { initialState, State } from '../../util/initialState'
import { SimplePath } from '../../types'

/** Imports the given html and exports it as plaintext. */
const importExport = (html: string, isHTML = true) => {
  const state = initialState()
  const { contextIndexUpdates: contextIndex, thoughtIndexUpdates: thoughtIndex } = importHtml(state, HOME_PATH, html)
  const stateNew = {
    ...state,
    thoughts: {
      ...state.thoughts,
      contextIndex,
      thoughtIndex,
    },
  }
  const exported = exportContext(stateNew, [HOME_TOKEN], isHTML ? 'text/html' : 'text/plain')

  // remove root, de-indent (trim), and append newline to make tests cleaner
  return removeHome(exported)
}

it('simple', () => {
  expect(importExport('test', false)).toBe(`
- test
`)
})

it('simple li', () => {
  expect(importExport('<li>test</li>', false)).toBe(`
- test
`)
})

it('simple ul', () => {
  expect(importExport('<ul><li>test</li></ul>', false)).toBe(`
- test
`)
})

it('whitespace', () => {
  expect(importExport('  test  ', false)).toBe(`
- test
`)
})

it("multiple li's", () => {
  expect(
    importExport(
      `
<li>one</li>
<li>two</li>
`,
      false,
    ),
  ).toBe(`
- one
- two
`)
})

it('items separated by <br>', () => {
  expect(importExport('<p>a<br>b<br>c<br></p>', false)).toBe(`
- a
- b
- c
`)
})

it('nested lines separated by <br>', () => {
  expect(
    importExport(
      `
<li>x
  <ul>
    <li>a<br>b<br>c<br></li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- x
  - a
  - b
  - c
`)
})

it("nested li's", () => {
  expect(
    importExport(
      `
<li>a<ul>
  <li>x</li>
  <li>y</li>
</ul></li>
`,
      false,
    ),
  ).toBe(`
- a
  - x
  - y
`)
})

it("<i> with nested li's", () => {
  expect(
    importExport(
      `
<li><i>a</i>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- a
  - x
  - y
`)
})

it("<span> with nested li's", () => {
  expect(
    importExport(
      `
<li><span>a</span>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- a
  - x
  - y
`)
})

it("empty thought with nested li's", () => {
  expect(
    importExport(
      `
<li>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- ${'' /* prevent trim_trailing_whitespace */}
  - x
  - y
`)
})

it("do not add empty parent thought when empty li node has no nested li's", () => {
  expect(
    importExport(
      `
<li>
  a
  <ul>
    <li>b</li>
    <li>
      <b>c</b>
    </li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- a
  - b
  - c
`)
})

it('multiple nested lists', () => {
  expect(
    importExport(
      `
<li>a
  <ul>
    <li>b</li>
  </ul>
</li>
<li>c
  <ul>
    <li>d</li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- a
  - b
- c
  - d
`)
})

it('strip wrapping tag', () => {
  expect(importExport('<span>test</span>', false)).toBe(`
- test
`)
})

it('strip inline tag', () => {
  expect(importExport('a <span>b</span> c', false)).toBe(`
- a b c
`)
})

it('strip inline tag in nested list', () => {
  expect(
    importExport(
      `
<li>a<span>fter</span>word<ul>
  <li>one <span>and</span> two</li>
  <li>y</li>
</ul></li>
`,
      false,
    ),
  ).toBe(`
- afterword
  - one and two
  - y
`)
})

it('preserve formatting tags', () => {
  const expectedText = `<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li><b>one</b> and <i>two</i></li>
    </ul>
  </li>
</ul>`
  expect(importExport('<b>one</b> and <i>two</i>')).toBe(expectedText)
})

it('WorkFlowy import with notes', () => {
  expect(
    importExport(
      `
z
<ul>
  <li>a<br>
    <span class="note">Note</span>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c<br>
    <span class="note">Other Note</span>
    <ul>
      <li>d</li>
    </ul>
  </li>
</ul>`,
      false,
    ),
  ).toBe(`
- z
  - a
    - =note
      - Note
    - b
  - c
    - =note
      - Other Note
    - d
`)
})

it('blank thoughts with subthoughts', () => {
  expect(
    importExport(
      `<li>a
  <ul>
    <li>b
      <ul>
        <li>2019
          <ul>
            <li>7/27</li>
            <li>7/21</li>
            <li>7/17</li>
          </ul>
        </li>

        <li>
          <ul>
            <li>Integral Living Room</li>
            <li>Maitri 5</li>
            <li>DevCon</li>
          </ul>
        </li>

        <li>...
          <ul>
            <li>2018</li>
            <li>2017</li>
            <li>2016</code></pre>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</li>
`,
      false,
    ),
  ).toBe(`
- a
  - b
    - 2019
      - 7/27
      - 7/21
      - 7/17
    - ${'' /* prevent trim_trailing_whitespace */}
      - Integral Living Room
      - Maitri 5
      - DevCon
    - ...
      - 2018
      - 2017
      - 2016
`)
})

it('paste multiple thoughts in non-empty cursor', () => {
  /** Import HTML and merge into state. */
  const importHtmlReducer = (state: State, insertionPath: SimplePath, html: string): State => {
    const { contextIndexUpdates, thoughtIndexUpdates } = importHtml(state, insertionPath, html)
    const contextIndex = mergeUpdates(state.thoughts.contextIndex, contextIndexUpdates)
    const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)

    return {
      ...state,
      thoughts: {
        ...state.thoughts,
        contextIndex,
        thoughtIndex,
      },
    }
  }

  const initialHtml = `
<li>a<ul>
  <li>b</li>
</ul></li>
`

  const importedHtml = `
<li>x</li>
<li>y</li>
`

  const state1 = importHtmlReducer(initialState(), HOME_PATH, initialHtml)

  const simplePath = [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
  ] as SimplePath
  const state2 = importHtmlReducer(state1, simplePath, importedHtml)

  const exported = exportContext(state2, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y`)
})

it('set cursor on last thought after importing multiple thoughts in non-empty cursor', () => {
  /** Import HTML and merge into state. */
  const importHtmlReducer = (state: State, insertionPath: SimplePath, html: string): State => {
    const { contextIndexUpdates, thoughtIndexUpdates } = importHtml(state, insertionPath, html)
    const contextIndex = mergeUpdates(state.thoughts.contextIndex, contextIndexUpdates)
    const thoughtIndex = mergeUpdates(state.thoughts.thoughtIndex, thoughtIndexUpdates)

    return {
      ...state,
      thoughts: {
        ...state.thoughts,
        contextIndex,
        thoughtIndex,
      },
    }
  }

  const initialHtml = `
<li>a<ul>
  <li>b</li>
</ul></li>
`

  const importedHtml = `
<li>x</li>
<li>y</li>
`

  const state1 = importHtmlReducer(initialState(), HOME_PATH, initialHtml)

  const simplePath = [
    { value: 'a', rank: 0 },
    { value: 'b', rank: 0 },
  ] as SimplePath
  const state2 = importHtmlReducer(state1, simplePath, importedHtml)

  const exported = exportContext(state2, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y`)
})
