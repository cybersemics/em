
// constants
import {
  ROOT_TOKEN,
} from '../../constants'

// util
import {
  exportContext,
  hashContext,
  hashThought,
  importHtml,
} from '../../util'

const RANKED_ROOT = [{ value: ROOT_TOKEN, rank: 0 }]
const initialState = {
  thoughtIndex: {
    [hashThought(ROOT_TOKEN)]: {
      value: ROOT_TOKEN,
      contexts: [],
    },
  },
  contextIndex: {
    [hashContext([ROOT_TOKEN])]: [],
  },
}

/** Imports the given html and exports it as plaintext */
const importExport = html => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importHtml(RANKED_ROOT, html, { state: initialState })
  const state = { contextIndex, thoughtIndex }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext', { state })

  // remote root, de-indent (trim), and append newline to make tests cleaner
  const exportedWithoutRoot = exported.slice(exported.indexOf('\n'))
    .split('\n')
    .map(line => line.slice(2))
    .join('\n')
    + '\n'

  return exportedWithoutRoot
}

it('simple', () => {
  expect(importExport('test'))
    .toBe(`
- test
`)
})

it('simple li', () => {
  expect(importExport('<li>test</li>'))
    .toBe(`
- test
`)
})

it('simple ul', () => {
  expect(importExport('<ul><li>test</li></ul>'))
    .toBe(`
- test
`)
})

it('whitespace', () => {
  expect(importExport('  test  '))
    .toBe(`
- test
`)
})

it('multiple li\'s', () => {
  expect(importExport(`
<li>one</li>
<li>two</li>
`))
    .toBe(`
- one
- two
`)
})

it('nested li\'s', () => {
  expect(importExport(`
<li>a<ul>
  <li>x</li>
  <li>y</li>
</ul></li>
`))
    .toBe(`
- a
  - x
  - y
`)
})

it('<i> with nested li\'s', () => {
  expect(importExport(`
<li><i>a</i>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`))
    .toBe(`
- <i>a</i>
  - x
  - y
`)
})

it('<span> with nested li\'s', () => {
  expect(importExport(`
<li><span>a</span>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`))
    .toBe(`
- a
  - x
  - y
`)
})

// conflicts with "simple ul" test in current implementation
it.skip('empty thought with nested li\'s', () => {
  expect(importExport(`
<li>
  <ul>
    <li>x</li>
    <li>y</li>
  </ul>
</li>
`))
    .toBe(`
- ` + `
  - x
  - y
`)
})

it('multiple nested lists', () => {
  expect(importExport(`
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
`))
    .toBe(`
- a
  - b
- c
  - d
`)
})

it('strip wrapping tag', () => {
  expect(importExport('<span>test</span>'))
    .toBe(`
- test
`)
})

it('strip inline tag', () => {
  expect(importExport('a <span>b</span> c'))
    .toBe(`
- a b c
`)
})

it('strip inline tag in nested list', () => {
  expect(importExport(`
<li>a<span>fter</span>word<ul>
  <li>one <span>and</span> two</li>
  <li>y</li>
</ul></li>
`))
    .toBe(`
- afterword
  - one and two
  - y
`)
})

it('preserve formatting tags', () => {
  expect(importExport('<b>one</b> and <i>two</i>'))
    .toBe(`
- <b>one</b> and <i>two</i>
`)
})

it('WorkFlowy import with notes', () => {
  expect(importExport(`
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
</ul>`))
    .toBe(`
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

  expect(importExport(`<li>a
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
`))
    .toBe(`
- a
  - b
    - 2019
      - 7/27
      - 7/21
      - 7/17
    - ` /* prevent trim_trailing_whitespace */ + `
      - Integral Living Room
      - Maitri 5
      - DevCon
    - ...
      - 2018
      - 2017
      - 2016
`)
})
