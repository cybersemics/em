import MimeType from '../../@types/MimeType'
import { EMPTY_SPACE, EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import removeHome from '../../util/removeHome'
import importDataActionCreator from '../importData'
import { newThoughtActionCreator as newThought } from '../newThought'

/** Helper function that initializes the store, imports html into the root, and exports it as plaintext to make easily readable assertions. This is async because importFiles is async. */
const importExport = async (html: string, outputFormat: MimeType = 'text/plain') => {
  vi.useFakeTimers()
  const { cleanup } = await initialize()
  store.dispatch(importDataActionCreator({ html }))
  await vi.runOnlyPendingTimersAsync()
  const exported = exportContext(store.getState(), HOME_PATH, outputFormat)
  cleanup()
  return removeHome(exported)
}

beforeEach(initStore)

it('nested lists without whitespace', async () => {
  const actual = await importExport(`<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>`)
  expect(actual).toBe(`
- a
  - b
    - c
`)
})

it('alternating nested lists', async () => {
  const actual = await importExport(`
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
      
`)

  expect(actual).toBe(`
- a
  - b
- c
  - d
`)
})

// TODO
it.skip('multi-line nested html tags', async () => {
  const paste = `
  <li><i><b>A</b></i></li>
  <li><i><b>B</b></i></li>
  <li><i><b>C</b></i></li>
  `
  const actual = await importExport(paste, 'text/html')

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
it.skip('text that contains non-closed span tag', async () => {
  const paste = `
    <li>a</li>
    <li>b</li>
    <li><span>c</li>
    <li>d</li>
  `
  const actual = await importExport(paste)
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
it.skip('text that contains em tag', async () => {
  const text = `
    <li>a<ul>
      <li>b</li>
      <li><em>c</em></li>
    </ul></li>
  `
  const exported = await importExport(text, 'text/html')
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
it.skip('text that contains br tag that does not have children', async () => {
  const text = `
    <li>a</li>
    <li>b</li>
    <li>c<br></li>
  `
  const exported = await importExport(text)
  expect(exported.trim()).toBe(
    `- a
- b
- c`,
  )
})

// TODO
it.skip('text that contains br tag that has note children', async () => {
  const text = `
    <li>a</li>
    <li>b</li>
    <li>c<br><span aria-label="note">This is c!</span></li>
  `
  const exported = await importExport(text)
  expect(exported.trim()).toBe(
    `- a
- b
- c
  - =note
    - This is c!`,
  )
})

// TODO
it.skip('text that contains one or more than one not allowed formattting tags', async () => {
  const text = `
    <li>a</li>
    <li>b <sup>c</sup></li>
    <li>c (<sub>d</sub>)<ul>
      <li>d <pre>123</pre></li>
    </ul></li>
  `
  const exported = await importExport(text)
  const expected = `
- a
- b c
- c (d)
  - d 123
  `
  expect(exported.trim()).toBe(expected.trim())
})

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste plain text that contains formatting', async () => {
  const paste = `<b>a</b>
<b>b</b>`
  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste plain text that contains formatting and bullet indicator is inside of formatting tags', async () => {
  const paste = `<b>a</b>
<b> -b</b>`
  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste text properly that is copied from OSX Notes.app', async () => {
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

  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste text properly that is copied from WebStorm', async () => {
  const paste = `<html>
       <head>
          <meta http-equiv="content-type" content="text/html; charset=UTF-8">
       </head>
       <body>
          <pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;">A<br>&#32;-B<br>&#32;-C<br></pre>
       </body>
    </html>`

  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste text properly that is copied from iOS notes.app', async () => {
  const paste =
    '<meta charset="UTF-8"><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;">A</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- B</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- C</span></p>'

  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste text that contains formatting properly that is copied from OSX Notes.app', async () => {
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

  const actual = await importExport(paste, 'text/html')
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should paste text that contains multiple formatting properly that is copied from OSX Notes.app', async () => {
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

  const actual = await importExport(paste, 'text/html')
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

// TODO: Formatting should not be stripped out
it.skip('should paste text that contains formatting that is copied from iOS notes.app', async () => {
  const paste = `<meta charset="UTF-8"><p class="p1"
                         style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;">A</span></p><p class="p1"
                                                                                                    style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>B</span></p>`

  const actual = await importExport(paste, 'text/html')
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

it('should paste text with an improperly nested meta tag', async () => {
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

  expect(await importExport(html)).toBe(`
- a
  - b
    - c
      - d
    - x
      - e
`)
})

// TODO: Should be imported as siblings, not parent-child
it.skip('simple duplicate', async () => {
  const text = `
    - a
    - a
  `

  const expectedExport = `
- a
- a`
  const exported = await importExport(text)

  expect(exported.trim()).toBe(expectedExport.trim())
})

// TODO: No longer working as it did in importText. What should we expect?
it.skip('multiple duplicates', async () => {
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
  const exported = await importExport(text)

  expect(exported.trim()).toBe(expectedExport.trim())
})

it('two root thoughts', async () => {
  const text = `- a
  - b
- c
  - d`
  const exported = await importExport(text)
  expect(exported.trim()).toBe(text)
})

it('skip root token', async () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  `

  expect(await importExport(text)).toBe(`
- a
  - b
- c
  - d
`)
})

it('skip em token', async () => {
  const text = `- ${EM_TOKEN}
  - a
    - b
  - c
    - d
  `

  expect(await importExport(text)).toBe(`
- a
  - b
- c
  - d
`)
})

it("multiple li's", async () => {
  expect(
    await importExport(
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
it.skip('nested lines separated by <br>', async () => {
  expect(
    await importExport(
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

it("nested li's", async () => {
  expect(
    await importExport(
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

it("<i> with nested li's", async () => {
  expect(
    await importExport(
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

it("<span> with nested li's", async () => {
  expect(
    await importExport(
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
it.skip("empty thought with nested li's", async () => {
  expect(
    await importExport(
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
it.skip("do not add empty parent thought when empty li node has no nested li's", async () => {
  expect(
    await importExport(
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

it('strip inline tag in nested list', async () => {
  expect(
    await importExport(
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
it.skip('blank thoughts with subthoughts', async () => {
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

it('import markdown', async () => {
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

  expect(await importExport(text)).toBe(`
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
it.skip(`import bold thoughts with bold descendants`, async () => {
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

  expect(await importExport(text)).toBe(`
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

it('import a parent and child with single asterisks', async () => {
  const text = `
  - *a
    - *b
  `

  expect(await importExport(text)).toBe(`
- *a
  - *b
`)
})

it('encode single closing angled bracket', async () => {
  const text = `
- a
  - >b
    - c
  - d
  `

  expect(await importExport(text)).toBe(`
- a
  - >b
    - c
  - d
`)
})

it('ChatGPT output', async () => {
  const text = `
<html>
  <body>
    <p class="p1">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">Foam</span>
    </p>
    <p class="p2">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">::</span><span class="s1"> (Archival or More Stable Options)</span>
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">Ethafoam</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Durable, closed-cell polyethylene
        foam</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Used in conservation and
        sculpture</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Resistant to crumbling and
        degradation</span
      >
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">XPS Foam (Extruded Polystyrene, e.g., Dow Blue Board, Owens Corning Foamular)</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Finer cell structure than standard
        Styrofoam</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Carves cleanly and holds detail
        well</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>More stable over time</span
      >
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">Gatorboard</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Rigid foam board with
        archival-quality facing</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Good for structural elements or
        mixed-media sculpture</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Does not warp easily</span
      >
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">HDU Foam (High-Density Urethane, e.g., Precision Board, Sign Foam)</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Fine-detail carving foam used in
        signage and sculpture</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>More stable and archival than
        standard polystyrene foams</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Can be painted and coated without
        heavy priming</span
      >
    </p>
    <p class="p2">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">✗</span><span class="s1"> (Non-Archival or Less Stable Options)</span>
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">Styrofoam (Expanded Polystyrene, EPS)</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Degrades over time</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Can off-gas chemicals</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Sensitive to light and heat</span
      >
    </p>
    <p class="p3">
      <span class="s1"><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span></span
      ><span class="s2">Standard Polyurethane Foam</span>
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Prone to yellowing and breaking
        down</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Can release VOCs over time</span
      >
    </p>
    <p class="p4">
      <span class="s1"
        ><span class="Apple-tab-span"> </span>•<span class="Apple-tab-span"> </span>Not ideal for long-term sculpture
        preservation</span
      >
    </p>
  </body>
</html>
  `

  // TODO
  // ChatGPT may include text at the end, after the bulleted list

  /*
    <p class="p5"><span class="s1"></span><br /></p>
    <p class="p6">
      <span class="s1">For a </span><span class="s2">cheap but stable</span
      ><span class="s1"> option, XPS Foam is a good choice. If </span><span class="s2">archival quality</span
      ><span class="s1"> is a priority, Ethafoam or HDU Foam is better.</span>
    </p>
  */

  expect(await importExport(text)).toBe(`
- Foam
  - :: (Archival or More Stable Options)
    - Ethafoam
      - Durable, closed-cell polyethylene foam
      - Used in conservation and sculpture
      - Resistant to crumbling and degradation
    - XPS Foam (Extruded Polystyrene, e.g., Dow Blue Board, Owens Corning Foamular)
      - Finer cell structure than standard Styrofoam
      - Carves cleanly and holds detail well
      - More stable over time
    - Gatorboard
      - Rigid foam board with archival-quality facing
      - Good for structural elements or mixed-media sculpture
      - Does not warp easily
    - HDU Foam (High-Density Urethane, e.g., Precision Board, Sign Foam)
      - Fine-detail carving foam used in signage and sculpture
      - More stable and archival than standard polystyrene foams
      - Can be painted and coated without heavy priming
  - ✗ (Non-Archival or Less Stable Options)
    - Styrofoam (Expanded Polystyrene, EPS)
      - Degrades over time
      - Can off-gas chemicals
      - Sensitive to light and heat
    - Standard Polyurethane Foam
      - Prone to yellowing and breaking down
      - Can release VOCs over time
      - Not ideal for long-term sculpture preservation
`)
})

it('ChatGPT output saved to an HTML file and copied from the browser', async () => {
  // eslint-disable-next-line no-irregular-whitespace
  const text = `<meta charset='utf-8'><p class="p1" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1">•<span class="Apple-tab-span"><span> </span></span></span><span class="s2">Foam</span></p><p class="p2" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span></span><span class="s2">::</span><span class="s1"><span> </span>(Archival or More Stable Options)</span></p><p class="p3" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span></span><span class="s2">Ethafoam</span></p><p class="p4" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span>Durable, closed-cell polyethylene foam</span></p><p class="p4" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span>Used in conservation and sculpture</span></p><p class="p4" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span>Resistant to crumbling and degradation</span></p><p class="p3" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span></span><span class="s2">XPS Foam (Extruded Polystyrene, e.g., Dow Blue Board, Owens Corning Foamular)</span></p><p class="p4" style="color: rgb(0, 0, 0); font-family: Times; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="s1"><span class="Apple-tab-span"></span>•<span class="Apple-tab-span"><span> </span></span>Finer cell structure than standard Styrofoam</span></p>`

  // TODO: Why the extra space after :: ?

  expect(await importExport(text)).toBe(`
- Foam
  - ::  (Archival or More Stable Options)
    - Ethafoam
      - Durable, closed-cell polyethylene foam
      - Used in conservation and sculpture
      - Resistant to crumbling and degradation
    - XPS Foam (Extruded Polystyrene, e.g., Dow Blue Board, Owens Corning Foamular)
      - Finer cell structure than standard Styrofoam
`)
})

it('strip <style>...</style>', async () => {
  const actual =
    await importExport(`<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
  <head>
  <style>
  p {color: #000000}
  </style>
  </head>
<body>
  test
</body>
</html>`)
  expect(actual).toBe(`
- test
`)
})

it('strip <style type="text/css">...</style>', async () => {
  const actual =
    await importExport(`<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
  <head>
  <style type="text/css">
  p {color: #000000}
  </style>
  </head>
<body>
  test
</body>
</html>`)
  expect(actual).toBe(`
- test
`)
})

it('empty parent', async () => {
  const text = `- ${''}
  - x`

  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({}),
    (dispatch, getState) => dispatch(importDataActionCreator({ path: contextToPath(getState(), [''])!, text })),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - x`)
})

// TODO: Why does foo not appear in the export?
// Confirmed that the input is being detected as a single line and editThought is called in the importText reducer.
// Works as expected in the browser.
it.skip('insert single-line HTML at end of thought', async () => {
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="2575.4">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 9.0px Helvetica; color: #000000}
</style>
</head>
<body>
<p class="p1"><i>foo</i></p>
</body>
</html>
`
  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({ value: 'a' }),
    (dispatch, getState) => dispatch(importDataActionCreator({ path: contextToPath(getState(), ['a'])!, html })),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a*foo*`)
})

it('paste em text with browser-injected meta charset as inline, not subthought', async () => {
  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({ value: 'a' }),
    (dispatch, getState) =>
      dispatch(
        importDataActionCreator({
          path: contextToPath(getState(), ['a'])!,
          html: `<meta charset='utf-8'>Hello`,
          text: 'Hello',
          isEmText: true,
        }),
      ),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aHello`)
})

it('paste em text with formatted html and meta charset as inline', async () => {
  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({ value: 'a' }),
    (dispatch, getState) =>
      dispatch(
        importDataActionCreator({
          path: contextToPath(getState(), ['a'])!,
          html: `<meta charset='utf-8'><b>Hello</b>`,
          text: 'Hello',
          isEmText: true,
        }),
      ),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/html')

  cleanup()

  expect(exported).toContain('<b>Hello</b>')
  expect(exported).not.toContain('<meta')
})

it('do not insert html with newlines as a single-line', async () => {
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="2575.4">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 9.0px Helvetica; color: #000000}
</style>
</head>
<body>
<p class="p1"><i>foo
bar</i></p>
</body>
</html>
`
  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({ value: 'a' }),
    (dispatch, getState) => dispatch(importDataActionCreator({ path: contextToPath(getState(), ['a'])!, html })),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - *foo bar*`)
})

it('do not insert html with list items as a single-line', async () => {
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="Content-Style-Type" content="text/css">
<title></title>
<meta name="Generator" content="Cocoa HTML Writer">
<meta name="CocoaVersion" content="2575.4">
<style type="text/css">
p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 9.0px Helvetica; color: #000000}
</style>
</head>
<body>
<ul><li>a</li><li>b</li><li>c</li></ul>
</body>
</html>
`
  vi.useFakeTimers()
  const { cleanup } = await initialize()

  store.dispatch([
    newThought({ value: 'x' }),
    (dispatch, getState) => dispatch(importDataActionCreator({ path: contextToPath(getState(), ['x'])!, html })),
  ])

  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
    - a
    - b
    - c`)
})
