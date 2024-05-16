import _ from 'lodash'
import State from '../../@types/State'
import importText, { ImportTextPayload } from '../../actions/importText'
import newThought from '../../actions/newThought'
import { ABSOLUTE_TOKEN, EMPTY_SPACE, EM_TOKEN, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import { getAllChildren } from '../../selectors/getChildren'
import getLexeme from '../../selectors/getLexeme'
import contextToThought from '../../test-helpers/contextToThought'
import editThought from '../../test-helpers/editThoughtByContext'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import hashThought from '../../util/hashThought'
import initialState from '../../util/initialState'
import never from '../../util/never'
import reducerFlow from '../../util/reducerFlow'
import removeHome from '../../util/removeHome'
import timestamp from '../../util/timestamp'

/** Helper function that imports html and exports it as plaintext. */
const importExport = (text: string, isHTML = true) => {
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], isHTML ? 'text/html' : 'text/plain')

  return removeHome(exported)
}

/**
 * Import text reducer that imports on given unranked path first matched.
 */
const importTextAtFirstMatch = _.curryRight(
  (state: State, payload: Omit<ImportTextPayload, 'path'> & { at: string[] }) => {
    const path = contextToPath(state, payload.at)

    if (!path) throw new Error(`Path not found for ${payload.at}`)
    return importText(state, {
      ...payload,
      path,
    })
  },
)
it('basic import with proper thought structure', () => {
  const text = `
    - a
      - b
  `

  const now = timestamp()

  const stateNew = importText(initialState(now), { text, lastUpdated: now })
  const { thoughtIndex, lexemeIndex } = stateNew.thoughts

  const childAId = getAllChildrenByContext(stateNew, [HOME_TOKEN])[0]
  const childBId = getAllChildrenByContext(stateNew, ['a'])[0]

  expect(thoughtIndex).toMatchObject({
    [contextToThoughtId(stateNew, [EM_TOKEN])!]: {
      id: EM_TOKEN,
      childrenMap: {},
      lastUpdated: never(),
      // TODO: Is this expected?
      pending: true,
      rank: 0,
    },
    [contextToThoughtId(stateNew, [HOME_TOKEN])!]: {
      childrenMap: { [childAId]: childAId },
    },
    [contextToThoughtId(stateNew, [ABSOLUTE_TOKEN])!]: {
      id: ABSOLUTE_TOKEN,
      childrenMap: {},
      lastUpdated: never(),
      pending: true,
    },
    [contextToThoughtId(stateNew, ['a'])!]: {
      id: childAId,
      value: 'a',
      rank: 0,
      childrenMap: { [childBId]: childBId },
    },
    [contextToThoughtId(stateNew, ['a', 'b'])!]: {
      id: childBId,
      value: 'b',
      rank: 0,
      childrenMap: {},
    },
  })

  expect(thoughtIndex[contextToThoughtId(stateNew, ['a'])!].lastUpdated >= now).toBeTruthy()

  expect(lexemeIndex).toMatchObject({
    [hashThought(HOME_TOKEN)]: {
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought(EM_TOKEN)]: {
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought(ABSOLUTE_TOKEN)]: {
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought('a')]: {
      contexts: [childAId],
      created: now,
    },
    [hashThought('b')]: {
      contexts: [childBId],
      created: now,
    },
  })

  // Note: Jest doesn't have lexicographic string comparison yet :(
  expect(lexemeIndex[hashThought('a')].lastUpdated >= now).toBeTruthy()
  expect(lexemeIndex[hashThought('b')].lastUpdated >= now).toBeTruthy()
})

it('simple duplicate', () => {
  const text = `
    - a
    - a
  `

  const expectedExport = `
- a
- a`
  const exported = importExport(text, false)

  expect(exported.trim()).toBe(expectedExport.trim())
})

it('multiple duplicates', () => {
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
  const exported = importExport(text, false)

  expect(exported.trim()).toBe(expectedExport.trim())
})

it('two root thoughts', () => {
  const text = `- a
  - b
- c
  - d`
  const exported = importExport(text, false)
  expect(exported.trim()).toBe(text)
})

it('skip root token', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`)
})

it('skip em token', () => {
  const text = `- ${EM_TOKEN}
  - a
    - b
  - c
    - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`)
})

it('duplicate thoughts', () => {
  const text = `
    - a
      - m
    - b
      - m
  `

  const now = timestamp()
  const imported = importText(initialState(), { text, lastUpdated: now })
  const lexeme = imported.thoughts.lexemeIndex[hashThought('m')]

  const childAId = lexeme.contexts[0]
  const childBId = lexeme.contexts[1]

  expect(lexeme).toMatchObject({
    contexts: [childAId, childBId],
    created: now,
  })

  expect(lexeme.lastUpdated >= now).toBeTruthy()
})

it('imports Roam json', () => {
  const roamString = JSON.stringify([
    {
      title: 'Fruits',
      children: [
        {
          string: 'Apple',
          'create-email': 'test_create@gmail.com',
          'edit-email': 'test_edit@gmail.com',
          'create-time': 1600111381583,
          'edit-time': 1600111381580,
          uid: 'UK11200',
        },
        {
          string: 'Orange',
          'create-email': 'test_create@yahoo.com',
          'edit-email': 'test_edit@yahoo.com',
          'create-time': 1600111383054,
          'edit-time': 1600111383050,
          uid: 'UK11233',
        },
        {
          string: 'Banana',
          'create-email': 'test_create@icloud.com',
          'edit-email': 'test_edit@icloud.com',
          'create-time': 1600111383911,
          'edit-time': 1600111383910,
          uid: 'HMN_YQtZZ',
        },
      ],
    },
    {
      title: 'Veggies',
      children: [
        {
          string: 'Broccoli',
          'create-email': 'test_create@gmail.com',
          'edit-email': 'test_edit@gmail.com',
          'create-time': 1600111381600,
          'edit-time': 1600111381599,
          uid: 'BK11200',
        },
        {
          string: 'Spinach',
          'create-email': 'test_create@icloud.com',
          'edit-email': 'test_edit@icloud.com',
          'create-time': 1600111389054,
          'edit-time': 1600111389050,
          uid: 'BK11233',
        },
      ],
    },
  ])

  const exported = importExport(roamString, false)
  expect(exported).toBe(`
- Fruits
  - Apple
    - =create-email
      - test_create@gmail.com
    - =edit-email
      - test_edit@gmail.com
  - Orange
    - =create-email
      - test_create@yahoo.com
    - =edit-email
      - test_edit@yahoo.com
  - Banana
    - =create-email
      - test_create@icloud.com
    - =edit-email
      - test_edit@icloud.com
- Veggies
  - Broccoli
    - =create-email
      - test_create@gmail.com
    - =edit-email
      - test_edit@gmail.com
  - Spinach
    - =create-email
      - test_create@icloud.com
    - =edit-email
      - test_edit@icloud.com
`)
})

it('replace empty cursor', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
  `

  const paste = `
  - x
  - y
  `

  const stateNew = reducerFlow([
    importText({ text }),
    // manually change `b` to empty thought since importText skips empty thoughts
    editThought(['a', 'b'], ''),
    importTextAtFirstMatch({
      at: ['a', ''],
      text: paste,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - x
    - y`)
})

it('replace empty cursor without affecting siblings', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
    - c
    - d
  `

  const paste = `
  - x
  - y
  `

  const stateNew = reducerFlow([
    importText({ text }),
    // manually change `c` to empty thought since importText skips empty thoughts
    editThought(['a', 'c'], ''),
    importTextAtFirstMatch({
      at: ['a', ''],
      text: paste,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - x
    - y
    - d`)

  expect(stateNew.cursor).toMatchObject([contextToThoughtId(stateNew, ['a']), contextToThoughtId(stateNew, ['a', 'y'])])
})

it(`remove empty cursor from thoughtIndex and lexemeIndex`, () => {
  const text = `
    - a
      - b
        - c
  `

  const now = timestamp()
  const stateNew = reducerFlow([
    newThought(''),
    importTextAtFirstMatch({
      at: [''],
      text,
      lastUpdated: now,
    }),
  ])(initialState(now))

  const { thoughtIndex, lexemeIndex } = stateNew.thoughts

  const emptyThought = Object.values(thoughtIndex).find(thought => thought.value === '')
  expect(emptyThought).toBeUndefined()
  expect(lexemeIndex).not.toHaveProperty(hashThought(''))
})

it('import as subthoughts of non-empty cursor', () => {
  const paste = `
    - x
    - y
  `

  const stateNew = reducerFlow([
    newThought('a'),
    importTextAtFirstMatch({
      at: ['a'],
      text: paste,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - x
    - y`)
})

it('set cursor to last imported subthought at first level', () => {
  const paste = `
    - x
    - y
  `

  const stateNew = reducerFlow([
    newThought('a'),
    importTextAtFirstMatch({
      at: ['a'],
      text: paste,
    }),
  ])(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a', 'y'])!)
})

it('set cursor to last imported subthought in the root', () => {
  const text = `
    - a
    - b
    - c
  `

  // import directly into the root
  const stateNew = reducerFlow([importText({ text })])(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['c'])!)
})

it('do not move cursor when importing only meta attributes', () => {
  const paste = `
    - =style
      - color
        - black
    - =styleAnnotation
      - backgroundColor
        - tomato
  `

  const stateNew = reducerFlow([
    newThought('a'),
    importTextAtFirstMatch({
      at: ['a'],
      text: paste,
    }),
  ])(initialState())

  expect(stateNew.cursor).toMatchObject(contextToPath(stateNew, ['a'])!)
})

it('decode HTML entities', () => {
  const paste = `
    - one &amp; two
    - three &lt; four
  `

  const stateNew = importText({ text: paste })(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - one & two
  - three < four`)
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
      false,
    ),
  ).toBe(
    `
- a
  - b
  - c
`,
  )
})

it('single-line nested html tags', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b
  `

  const paste = '<b><i>A</i></b>'

  const stateNew = reducerFlow([
    // importing single-line needs an existing thought
    importText({ text }),

    // manually change `b` to empty thought to not see 'b' end of the new value.
    editThought(['a', 'b'], ''),
    importTextAtFirstMatch({
      at: ['a', ''],
      text: paste,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}${EMPTY_SPACE}
    <ul>
      <li>a${EMPTY_SPACE}${EMPTY_SPACE}${EMPTY_SPACE}
        <ul>
          <li><b><i>A</i></b></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`)
})

it('multi-line nested html tags', () => {
  const paste = `
  <li><i><b>A</b></i></li>
  <li><i><b>B</b></i></li>
  <li><i><b>C</b></i></li>
  `
  const actual = importExport(paste)

  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><i><b>A</b></i></li>
      <li><i><b>B</b></i></li>
      <li><i><b>C</b></i></li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('export note as a normal thought if lossless not selected', () => {
  const text = `- ${HOME_TOKEN}
  - a
    - =note
      - b
    - c
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - c`)
})

it('text that contains em tag', () => {
  const text = `
    - a
      - b
      - <em>c</em>
  `
  const exported = importExport(text)
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

it('text that contains non closed span tag', () => {
  const paste = `
    - a
    - b
    - <span>c
    - d
  `
  const actual = importExport(paste, false)
  expect(actual).toBe(
    `
- a
- b
- c
- d
`,
  )
})

it('text that contains br tag that does not have children', () => {
  const text = `
    - a
    - b
    - c<br>
  `
  const exported = importExport(text, false)
  expect(exported.trim()).toBe(
    `- a
- b
- c`,
  )
})

it('text that contains br tag that has note children', () => {
  const text = `
    - a
    - b
    - c<br><span class="note">This is c!</span>
  `
  const exported = importExport(text, false)
  expect(exported.trim()).toBe(
    `- a
- b
- c
  - =note
    - This is c!`,
  )
})

it('text that contains one or more than one not allowed formattting tags', () => {
  const text = `
    - a
    - b <sup>c</sup>
    - c (<sub>d</sub>)
      - d <pre>123</pre>
  `
  const exported = importExport(text, false)
  const expected = `
- a
- b c
- c (d)
  - d 123
  `
  expect(exported.trim()).toBe(expected.trim())
})

describe('HTML content', () => {
  it('should paste plain text that contains formatting', () => {
    const paste = `<b>a</b>
<b>b</b>`
    const actual = importExport(paste)
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
    const actual = importExport(paste)
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

  it('should paste text properly that is copied from OSX Notes.app', () => {
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

    const actual = importExport(paste)
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
    /* eslint-disable no-irregular-whitespace */
    const paste = `<html>
       <head>
          <meta http-equiv="content-type" content="text/html; charset=UTF-8">
       </head>
       <body>
          <pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;">A<br>&#32;-B<br>&#32;-C<br></pre>
       </body>
    </html>`
    /* eslint-enable no-irregular-whitespace */

    const actual = importExport(paste)
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
    /* eslint-disable no-irregular-whitespace */
    const paste =
      '<meta charset="UTF-8"><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;">A</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- B</span></p><p class="p1" style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;"><span class="s1" style="font-weight: normal; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>- C</span></p>'
    /* eslint-enable no-irregular-whitespace */

    const actual = importExport(paste)
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

  it('should paste text that contains li tags properly that is copied from OSX Notes.app', () => {
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
<p class="p1"><span class="Apple-converted-space">  </span>&lt;li&gt;&lt;i&gt;&lt;b&gt;A&lt;/b&gt;&lt;/i&gt;&lt;/li&gt;</p>
<p class="p1"><span class="Apple-converted-space">  </span>&lt;li&gt;&lt;i&gt;&lt;b&gt;B&lt;/b&gt;&lt;/i&gt;&lt;/li&gt;</p>
<p class="p1"><span class="Apple-converted-space">  </span>&lt;li&gt;&lt;i&gt;&lt;b&gt;C&lt;/b&gt;&lt;/i&gt;&lt;/li&gt;</p>
</body>
</html>`
    /* eslint-enable no-irregular-whitespace */

    const actual = importExport(paste)
    const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><i><b>A</b></i></li>
      <li><i><b>B</b></i></li>
      <li><i><b>C</b></i></li>
    </ul>
  </li>
</ul>`
    expect(actual).toBe(expectedOutput)
  })

  it('should paste text that contains formatting properly that is copied from OSX Notes.app', () => {
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

    const actual = importExport(paste)
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

  it('should paste text that contains multiple formatting properly that is copied from OSX Notes.app', () => {
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

    const actual = importExport(paste)
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

  it('should paste text that contains formatting that is copied from iOS notes.app', () => {
    /* eslint-disable no-irregular-whitespace */
    const paste = `<meta charset="UTF-8"><p class="p1"
                         style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;">A</span></p><p class="p1"
                                                                                                    style="margin: 0px; font-style: normal; font-variant-caps: normal; font-weight: normal; font-stretch: normal; font-size: 14px; line-height: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none;">
    <span class="s1" style="font-weight: bold; font-style: normal; font-size: 14px;"><span class="Apple-converted-space"> </span>B</span></p>`
    /* eslint-enable no-irregular-whitespace */

    const actual = importExport(paste)
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
})

it('should paste text with an improperly nested meta tag', () => {
  const text = `
  - a
    - b
      - c
        - d
      - <li><meta><span>x</li>
        - e
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
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

it('should strip tags whose font weight is less than or equal to 400', () => {
  const paste = `<span style="font-weight:400;">Hello world. </span> <span style="font-weight:100;">This is a test </span>`
  const actual = importExport(paste)
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>Hello world.  This is a test</li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('should convert font weight to 700 if the font weight in a tag is greater than or equal to 500', () => {
  const paste = `<span style="font-weight: 500;">Hello world. </span><span style="font-weight: 800;">This is a test </span>`
  const actual = importExport(paste)
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><span style="font-weight: 700;">Hello world. </span><span style="font-weight: 700;">This is a test </span></li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('should not strip whole tag unless other style apart from font-weight should be preserved', () => {
  const paste = `<span style="font-weight: 400; font-style: italic;">a</span>`
  const actual = importExport(paste)
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><span style="font-style: italic;">a</span></li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('allow formatting tags', () => {
  const text = `
    - guardians <b>of the </b><b>galaxy </b>
    - guardians <i>of the </i><i>universe </i>
    - guardians <u>of the </u><u>sandbox </u>
    - guardians <strong>of the </strong><strong>teacup </strong>
    - guardians <em>of the </em><em>pricky pear </em>
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>guardians <b>of the </b><b>galaxy </b></li>
      <li>guardians <i>of the </i><i>universe </i></li>
      <li>guardians <u>of the </u><u>sandbox </u></li>
      <li>guardians <strong>of the </strong><strong>teacup </strong></li>
      <li>guardians <em>of the </em><em>pricky pear </em></li>
    </ul>
  </li>
</ul>`
  expect(exported).toBe(expectedOutput)
})

it('import single thought into empty home context', () => {
  const text = 'a'

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})

it('import single thought with markdown into the home context', () => {
  const text = 'This is **bold** text!'

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN])

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}  
    <ul>
      <li>This is <b>bold</b> text!</li>
    </ul>
  </li>
</ul>`)
})

it('import multiple thoughts with markdown into the home context', () => {
  // Note: Markdown replacing should not span over multiple lines
  const text = `- *This is a reference to a footnote.
- This is *italic* text!`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN])

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}  
    <ul>
      <li>*This is a reference to a footnote.</li>
      <li>This is <i>italic</i> text!</li>
    </ul>
  </li>
</ul>`)
})

it('import single thought with invalid markdown into the home context', () => {
  // No change in text should be observed.
  const text = 'What?!?**'

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN])

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}  
    <ul>
      <li>What?!?**</li>
    </ul>
  </li>
</ul>`)
})

it('import multiple thoughts to empty home context', () => {
  const text = `
    - a
      - b
    - c
      - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`)
})

it('import multiple thoughts to end of home context with other thoughts', () => {
  const text = `
    - a
      - b
    - c
      - d
  `

  const stateNew = reducerFlow([importText({ text }), importText({ text: 'e' })])(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e`)
})

it('imported single line paragraph should be treated as a single thought, it shoud not be splitted.', () => {
  const text = `<ul>
  <li><i><b>The New Criterion</b></i><span style="font-weight: 400;">is a</span>New York<span style="font-weight: 400;">-based monthly</span>literary magazine<span style="font-weight: 400;">and journal of artistic and</span>cultural criticism<span style="font-weight: 400;">, 
edited by</span>Roger Kimball<span style="font-weight: 400;">(editor and publisher) and</span>James Panero<span style="font-weight: 400;">(executive editor). 
It has sections for criticism of poetry, theater, art, music, the media, and books. It was founded in 1982 by</span>Hilton Kramer<span style="font-weight: 400;">, former art critic for</span><i>The New York Times</i><span style="font-weight: 400;">, and Samuel Lipman, a pianist and music critic.</span>  </li>
</ul>`

  const stateNew = importText(initialState(), { text })

  const rootChildren = getAllChildren(stateNew, HOME_TOKEN)

  expect(rootChildren.length).toBe(1)
})

it('import single line with style attributes', () => {
  const text = `<span style="caret-color:rgb(255, 255, 255);color:rgb(255, 255, 255);font-family:Helvetica;font-size:13px;font-style:normal;font-variant-caps:normal;font-weight:bold;letter-spacing:normal;orphans:auto;text-align:left;text-indent:0px;text-transform:none;white-space:pre-wrap;widows:auto;word-spacing:0px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);-webkit-text-size-adjust:none;-webkit-text-stroke-width:0px;background-color:rgb(0, 0, 0);text-decoration:none;display:inline;float:none">Atonement</span>`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  expect(exported).toBe(`<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><span style="font-weight: bold;">Atonement</span></li>
    </ul>
  </li>
</ul>`)
})

it('import single line with style attributes and a single br tag', () => {
  const text = `<br><span style="color: pink;">Marcel Duchamp: The Art of the Possible</span>`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/html')

  expect(exported).toBe(`<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li>Marcel Duchamp: The Art of the Possible</li>
    </ul>
  </li>
</ul>`)
})

it('import plaintext + list as nested list', () => {
  const html = `<div>
  A
  <ul>
    <li>B</li>
  </ul>
  <ul>
    <li>C</li>
  </ul>
</div>`
  const stateNew = importText(initialState(), { text: html })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - B
    - C`)
})

it('properly add lexeme entries for multiple thoughts with same value on import', () => {
  const text = `
    - a
      - m
        - x
    - m
     - y
  `

  const stateNew = reducerFlow([importText({ text })])(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  const thoughtMFirst = contextToThought(stateNew, ['a', 'm'])
  const thoughtMSecond = contextToThought(stateNew, ['m'])

  const lexemeM = getLexeme(stateNew, 'm')

  expect(lexemeM?.contexts).toMatchObject([thoughtMFirst?.id, thoughtMSecond?.id])
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - m
    - y`)
})

it(`import "${HOME_TOKEN}"`, () => {
  const text = HOME_TOKEN

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)
})

it(`import "- ${HOME_TOKEN}"`, () => {
  const text = `- ${HOME_TOKEN}`
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)
})

it(`import HOME token with children`, () => {
  const text = `- ${HOME_TOKEN}
  - a
    - b`
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it(`import HTML with "${HOME_TOKEN}"`, () => {
  const text = `<ul>
  <li>${HOME_TOKEN}</li>
</ul>`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)
})

it(`import HTML with untrimmed "${HOME_TOKEN}  "`, () => {
  const text = `<ul>
  <li>${HOME_TOKEN}  </li>
</ul>`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}`)
})

it(`remove nested HOME token but keep descendants`, () => {
  const text = `
  - a
    - b
      - c
    - ${HOME_TOKEN}
      - d
  `
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
    - d`)
})

it(`import sibling empty thoughts`, () => {
  const text = `
    <ul>
      <li>a</li>
      <li></li>
      <li></li>
      <li>b</li>
    </ul>
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it(`mixed html with whitespaces as a new line`, () => {
  const text = `- a\n<li>b</li>`

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
})

it('set cursor correctly after duplicate merge', () => {
  const text = '- a\n  - b'

  const stateNew = reducerFlow([
    newThought('a'),
    newThought(''),
    importTextAtFirstMatch({
      at: [''],
      text,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it(`import bold thoughts with bold descendants`, () => {
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

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
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
  - i`)
})

it('import a parent and child with single asterisks', () => {
  const text = `
  - *a
    - *b
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - *a
    - *b`)
})

it('encode single closing angled bracket', () => {
  const text = `
- a
  - >b
    - c
  - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - >b
      - c
    - d`)
})

// TODO
it.skip('encode single open angled bracket', () => {
  const text = `
- a
  - <b
    - c
      - d
  - e
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - <b
      - c
        - d
    - e`)
})

it('import plaintext with embedded <li>', () => {
  const text = `
  - a
    - b
      - <li>c</li>
    - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
    - d`)
})

it('import plaintext with embedded <li> mixed with text', () => {
  const text = `
  - a
    - b
      - x <li>c</li> y
    - d
  `

  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - c
      - y
    - d`)
})
