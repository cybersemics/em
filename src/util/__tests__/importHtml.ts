import Path from '../../@types/Path'
import importText from '../../actions/importText'
import { EMPTY_SPACE, HOME_PATH, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import removeHome from '../../util/removeHome'

/** Imports the given html and exports it as plaintext. */
const importExport = (html: string, isHTML = true) => {
  const state = initialState()
  const stateNew = importText(state, { path: HOME_PATH, text: html })
  const exported = exportContext(stateNew, [HOME_TOKEN], isHTML ? 'text/html' : 'text/plain', {
    excludeMarkdownFormatting: true,
  })

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

// TODO
it.skip('nested lines separated by <br>', () => {
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

// TODO
it.skip("empty thought with nested li's", () => {
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

// TODO
it.skip('WorkFlowy import with notes', () => {
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

  const initialHtml = `
<li>a<ul>
  <li>b</li>
</ul></li>
`

  const importedHtml = `
<li>x</li>
<li>y</li>
`

  const state1 = importText(initialState(), { path: HOME_PATH, text: initialHtml })

  const simplePath: Path = contextToPath(state1, ['a', 'b'])!

  const state2 = importText(state1, { path: simplePath, text: importedHtml })

  const exported = exportContext(state2, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y`)
})

it('set cursor on last thought after importing multiple thoughts in non-empty cursor', () => {
  const initialHtml = `
<li>a<ul>
  <li>b</li>
</ul></li>
`

  const importedHtml = `
<li>x</li>
<li>y</li>
`

  const state1 = importText(initialState(), { path: HOME_PATH, text: initialHtml })

  const simplePath = contextToPath(state1, ['a', 'b'])!
  const state2 = importText(state1, { path: simplePath, text: importedHtml })

  const exported = exportContext(state2, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y`)
})
