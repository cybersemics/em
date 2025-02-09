import MimeType from '../../@types/MimeType'
import { EMPTY_SPACE, EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import removeHome from '../../util/removeHome'
import importDataActionCreator from '../importData'

/** Helper function that imports html into the root and exports it as plaintext to make easily readable assertions. */
const importExport = (html: string, outputFormat: MimeType = 'text/plain') => {
  store.dispatch(importDataActionCreator({ html }))
  const exported = exportContext(store.getState(), HOME_PATH, outputFormat)
  return removeHome(exported)
}

beforeEach(initStore)

it('multiple nested lists', async () => {
  expect(
    importExport(`
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
      
`),
  ).toBe(`
- a
  - b
- c
  - d
`)
})

// related: https://github.com/cybersemics/em/issues/1008
it('do not parse as html when value has tags inside indented text', () => {
  expect(
    importExport(
      `
  - a
    - b
    - <li>c</li>
  `,
    ),
  ).toBe(
    `
- a
  - b
  - c
`,
  )
})

// TODO
it.skip('multi-line nested html tags', () => {
  const paste = `
  <li><i><b>A</b></i></li>
  <li><i><b>B</b></i></li>
  <li><i><b>C</b></i></li>
  `
  const actual = importExport(paste, 'text/html')

  const expectedOutput = `<ul>
  <li>__ROOT__${'  '}
    <ul>
      <li><i><b>A</b></i></li>
      <li><i><b>B</b></i></li>
      <li><i><b>C</b></i></li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

// TODO
it.skip('text that contains non-closed span tag', () => {
  const paste = `
    <li>a</li>
    <li>b</li>
    <li><span>c</li>
    <li>d</li>
  `
  const actual = importExport(paste)
  expect(actual).toBe(
    `
- a
- b
- c
- d
`,
  )
})

// TODO
it.skip('text that contains em tag', () => {
  const text = `
    <li>a<ul>
      <li>b</li>
      <li><em>c</em></li>
    </ul></li>
  `
  const exported = importExport(text, 'text/html')
  expect(exported.trim()).toBe(
    `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>a${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li>b</li>
          <li><em>c</em></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`,
  )
})

// TODO
it.skip('text that contains br tag that does not have children', () => {
  const text = `
    <li>a</li>
    <li>b</li>
    <li>c<br></li>
  `
  const exported = importExport(text)
  expect(exported.trim()).toBe(
    `- a
- b
- c`,
  )
})

// TODO
it.skip('text that contains br tag that has note children', () => {
  const text = `
    <li>a</li>
    <li>b</li>
    <li>c<br><span aria-label="note">This is c!</span></li>
  `
  const exported = importExport(text)
  expect(exported.trim()).toBe(
    `- a
- b
- c
  - =note
    - This is c!`,
  )
})

// TODO
it.skip('text that contains one or more than one not allowed formattting tags', () => {
  const text = `
    <li>a</li>
    <li>b <sup>c</sup></li>
    <li>c (<sub>d</sub>)<ul>
      <li>d <pre>123</pre></li>
    </ul></li>
  `
  const exported = importExport(text)
  const expected = `
- a
- b c
- c (d)
  - d 123
  `
  expect(exported.trim()).toBe(expected.trim())
})

it('should paste plain text that contains formatting', () => {
  const paste = `<b>a</b>
<b>b</b>`
  const actual = importExport(paste, 'text/html')
  expect(actual).toBe(
    `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><b>a</b></li>
      <li><b>b</b></li>
    </ul>
  </li>
</ul>`,
  )
})

it('should paste plain text that contains formatting and bullet indicator is inside of formatting tags', () => {
  const paste = `<b>a</b>
<b> -b</b>`
  const actual = importExport(paste, 'text/html')
  const expectedHTML = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><b>a</b>${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li><b>b</b></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedHTML)
})

// TODO
it.skip('should paste text properly that is copied from OSX Notes.app', () => {
  /* eslint-disable no-irregular-whitespace */
  const paste = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="1894.6">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px 'Helvetica Neue'}
</style>
</head>
<body>
<p class="p1">A</p>
<p class="p1"><span class="Apple-converted-space"> </span>- B</p>
<p class="p1"><span class="Apple-converted-space"> </span>- C</p>
</body>
</html>
`
  /* eslint-enable no-irregular-whitespace */

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>A${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li>B</li>
          <li>C</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('should paste text properly that is copied from WebStorm', () => {
  const paste = `<html>
       <head>
          <meta http-equiv="content-type" content="text/html; charset=UTF-8">
       </head>
       <body>
          <pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;">A<br>&#32;-B<br>&#32;-C<br></pre>
       </body>
    </html>`

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>A${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li>B</li>
          <li>C</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('should paste text properly that is copied from iOS notes.app', () => {
  const paste =
    '<meta charset="UTF-8"><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;">A</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- B</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- C</span></p>'

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>A${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li>B</li>
          <li>C</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

// TODO
it.skip('should paste text that contains formatting properly that is copied from OSX Notes.app', () => {
  /* eslint-disable no-irregular-whitespace */
  const paste = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="1894.6">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px 'Helvetica Neue'}
</style>
</head>
<body>
<p class="p1"><b><i>A</i></b></p>
<p class="p1"><span class="Apple-converted-space">  </span>- <b>B</b></p>
<p class="p1"><span class="Apple-converted-space">  </span>- <i>C</i></p>
</body>
</html>
`
  /* eslint-enable no-irregular-whitespace */

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><b><i>A</i></b>${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li><b>B</b></li>
          <li><i>C</i></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

// TODO
it.skip('should paste text that contains multiple formatting properly that is copied from OSX Notes.app', () => {
  /* eslint-disable no-irregular-whitespace */
  const paste = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="1894.6">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px 'Helvetica Neue'}
</style>
</head>
<body>
<p class="p1"><b>A</b></p>
<p class="p1"><span class="Apple-converted-space"> </span>- <b><i>B</i></b></p>
<p class="p1"><span class="Apple-converted-space"> </span>- <b>C</b></p>
</body>
</html>

`
  /* eslint-enable no-irregular-whitespace */

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><b>A</b>${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li><b><i>B</i></b></li>
          <li><b>C</b></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

// TODO
it.skip('should paste text that contains formatting that is copied from iOS notes.app', () => {
  const paste = `<meta charset="UTF-8"><p class="p1"
                         style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;">A</span></p><p class="p1"
                                                                                                    style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>B</span></p>`

  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><span style="font-weight: bold;">A</span>${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li><span style="font-weight: bold;"> B</span></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

// TODO
it.skip('should paste text with an improperly nested meta tag', () => {
  const html = `
  <li>a<ul>
    <li>b<ul>
      <li>c<ul>
        <li>d</li>
      </ul></li>
      <li><li><meta><span>x</li>
        <li>e</li>
      </ul></li>
    </ul></li>
  </ul></li>
  `

  expect(importExport(html, 'text/html')).toBe(`- a
    - b
      - c
        - d
        - x
      - e`)

  // TODO: Might be better as:
  // expect(exported).toBe(`- ${HOME_TOKEN}
  // - a
  //   - b
  //     - c
  //       - d
  //     - x
  //       - e`)
})

// TODO: Should be imported as siblings, not parent-child
it.skip('simple duplicate', () => {
  const text = `
    - a
    - a
  `

  const expectedExport = `
- a
- a`
  const exported = importExport(text)

  expect(exported.trim()).toBe(expectedExport.trim())
})

// TODO: No longer working as it did in importText. What should we expect?
it.skip('multiple duplicates', () => {
  const text = `
    - a
      - b
        - c
        - c
        - d
      - b
    - a
      - b
        - d
        - e
    `

  const expectedExport = `
- a
  - b
    - c
    - c
    - d
  - b
- a
  - b
    - d
    - e`
  const exported = importExport(text)

  expect(exported.trim()).toBe(expectedExport.trim())
})

it('two root thoughts', () => {
  const text = `- a
  - b
- c
  - d`
  const exported = importExport(text)
  expect(exported.trim()).toBe(text)
})

it('skip root token', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  `

  expect(importExport(text)).toBe(`
- a
  - b
- c
  - d
`)
})

it('skip em token', () => {
  const text = `- ${EM_TOKEN}
  - a
    - b
  - c
    - d
  `

  expect(importExport(text)).toBe(`
- a
  - b
- c
  - d
`)
})

it("multiple li's", () => {
  expect(
    importExport(
      `
<li>one</li>
<li>two</li>
`,
    ),
  ).toBe(`
- one
- two
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
    ),
  ).toBe(`
- *a*
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
    ),
  ).toBe(`
  - x
  - y
`)
})

// TODO: Indentation is off
it.skip("do not add empty parent thought when empty li node has no nested li's", () => {
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
    ),
  ).toBe(`
- a
  - b
  - **c**
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
    ),
  ).toBe(`
- afterword
  - one and two
  - y
`)
})

// TODO: Broken after switch from importText to importData
it.skip('blank thoughts with subthoughts', () => {
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

it('import markdown', () => {
  const text = `
# H1 
a
## H2
b
### H3
c
#### H4
d
##### H5
e
###### H6
f
  `

  expect(importExport(text)).toBe(`
- H1
  - a
  - H2
    - b
    - H3
      - c
      - H4
        - d
        - H5
          - e
          - H6
            - f
`)
})

// TODO: Indentation broke when switching from importText to importData
it.skip(`import bold thoughts with bold descendants`, () => {
  const text = `
    - a
    - c
      - d
        - **d1**
          - e
            - f
              - **g**
        - d2
        - d3
      - h
    - i
  `

  expect(importExport(text)).toBe(`
- a
- c
  - d
    - **d1**
      - e
        - f
          - **g**
    - d2
    - d3
  - h
- i
`)
})

it('import a parent and child with single asterisks', () => {
  const text = `
  - *a
    - *b
  `

  expect(importExport(text)).toBe(`
- *a
  - *b
`)
})

it('encode single closing angled bracket', () => {
  const text = `
- a
  - >b
    - c
  - d
  `

  expect(importExport(text)).toBe(`
- a
  - >b
    - c
  - d
`)
})
