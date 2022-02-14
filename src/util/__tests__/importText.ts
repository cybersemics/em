import 'react-native-get-random-values'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_PATH, HOME_TOKEN, EMPTY_SPACE } from '../../constants'
import { getThoughtIdByContext, hashThought, never, reducerFlow, timestamp, removeHome } from '../../util'
import { initialState } from '../../util/initialState'
import { exportContext, getLexeme, getParent, rankThoughtsFirstMatch } from '../../selectors'
import { importText, newThought } from '../../reducers'
import { State } from '../../@types'
import editThoughtAtFirstMatch from '../../test-helpers/editThoughtAtFirstMatch'
import { ImportTextPayload } from '../../reducers/importText'
import _ from 'lodash'

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
    const path = rankThoughtsFirstMatch(state, payload.at)

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
    - b`

  const now = timestamp()

  const stateNew = importText(initialState(now), { text, lastUpdated: now })
  const { contextIndex, thoughtIndex } = stateNew.thoughts

  const childAId = getParent(stateNew, [HOME_TOKEN])?.children[0]
  const childBId = getParent(stateNew, ['a'])?.children[0]

  expect(contextIndex).toMatchObject({
    [getThoughtIdByContext(stateNew, [EM_TOKEN])!]: {
      id: EM_TOKEN,
      children: [],
      lastUpdated: never(),
      // TODO: Is this expected?
      pending: true,
      rank: 0,
    },
    [getThoughtIdByContext(stateNew, [HOME_TOKEN])!]: {
      children: [childAId],
    },
    [getThoughtIdByContext(stateNew, [ABSOLUTE_TOKEN])!]: {
      id: ABSOLUTE_TOKEN,
      children: [],
      lastUpdated: never(),
      pending: true,
    },
    [getThoughtIdByContext(stateNew, ['a'])!]: {
      id: childAId,
      value: 'a',
      rank: 0,
      children: [childBId],
    },
    [getThoughtIdByContext(stateNew, ['a', 'b'])!]: {
      id: childBId,
      value: 'b',
      rank: 0,
      children: [],
    },
  })

  expect(contextIndex[getThoughtIdByContext(stateNew, ['a'])!].lastUpdated >= now).toBeTruthy()

  expect(thoughtIndex).toMatchObject({
    [hashThought(HOME_TOKEN)]: {
      value: HOME_TOKEN,
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought(EM_TOKEN)]: {
      value: EM_TOKEN,
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought(ABSOLUTE_TOKEN)]: {
      value: ABSOLUTE_TOKEN,
      contexts: [],
      created: now,
      lastUpdated: never(),
    },
    [hashThought('a')]: {
      value: 'a',
      contexts: [childAId],
      created: now,
    },
    [hashThought('b')]: {
      value: 'b',
      contexts: [childBId],
      created: now,
    },
  })

  // Note: Jest doesn't have lexicographic string comparison yet :(
  expect(thoughtIndex[hashThought('a')].lastUpdated >= now).toBeTruthy()
  expect(thoughtIndex[hashThought('b')].lastUpdated >= now).toBeTruthy()
})

it('merge descendants', () => {
  const initialText = `
  - a
    - b
      - c
  `

  const mergeText = `
  - a
    - b
      - q
    - x
      - y
  - j
  `

  const now = timestamp()

  const newState = reducerFlow([
    importText({ text: initialText, lastUpdated: now }),
    newThought({ at: HOME_PATH, value: '' }),
    importTextAtFirstMatch({
      at: [''],
      text: mergeText,
      lastUpdated: now,
    }),
  ])(initialState(now))

  const exported = exportContext(newState, [HOME_TOKEN], 'text/plain')

  const expectedExport = `- ${HOME_TOKEN}
  - a
    - b
      - c
      - q
    - x
      - y
  - j`

  expect(exported).toBe(expectedExport)

  const { contextIndex } = newState.thoughts

  const thoughtA = getParent(newState, ['a'])!
  const thoughtB = getParent(newState, ['a', 'b'])!
  const thoughtC = getParent(newState, ['a', 'b', 'c'])!
  const thoughtQ = getParent(newState, ['a', 'b', 'q'])!
  const thoughtX = getParent(newState, ['a', 'x'])!
  const thoughtY = getParent(newState, ['a', 'x', 'y'])!
  const thoughtJ = getParent(newState, ['j'])!

  expect(contextIndex).toMatchObject({
    [getThoughtIdByContext(newState, [HOME_TOKEN])!]: {
      children: [thoughtA.id, thoughtJ.id],
    },
    [thoughtA.id]: {
      children: [thoughtB.id, thoughtX.id],
    },
    [thoughtB.id]: {
      children: [thoughtC.id, thoughtQ.id],
    },
    [thoughtX.id]: {
      children: [thoughtY.id],
    },
  })

  expect(getLexeme(newState, 'a')?.contexts).toMatchObject([thoughtA.id])
  expect(getLexeme(newState, 'b')?.contexts).toMatchObject([thoughtB.id])
})

it('initialSettings', () => {
  expect(
    importExport(
      `
<ul>
  <li>Settings
    <ul>
      <li>=readonly</li>

      <li>Theme
        <ul>
          <li>=readonly</li>
          <li>=options
            <ul>
              <li>Dark</li>
              <li>Light</li>
            </ul>
          </li>
          <li>Dark</li>
        </ul>
      </li>

      <li>Global Sort
        <ul>
          <li>=readonly</li>
          <li>=options
            <ul>
              <li>None</li>
              <li>Alphabetical</li>
            </ul>
          </li>
          <li>None
            <ul>
              <li>=options
                <ul>
                  <li>Asc</li>
                  <li>Desc</li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </li>

    </ul>
  </li>
</ul>
`,
      false,
    ),
  ).toBe(`
- Settings
  - =readonly
  - Theme
    - =readonly
    - =options
      - Dark
      - Light
    - Dark
  - Global Sort
    - =readonly
    - =options
      - None
      - Alphabetical
    - None
      - =options
        - Asc
        - Desc
`)
})

it('increment duplicates', () => {
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
      - e`

  const expectedExport = `
- a
  - b
    - c
    - c(1)
    - d
  - b(1)
- a(1)
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
    - d`

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
    - d`

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
  const lexeme = imported.thoughts.thoughtIndex[hashThought('m')]

  const childAId = lexeme.contexts[0]
  const childBId = lexeme.contexts[1]

  expect(lexeme).toMatchObject({
    value: 'm',
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
    - b`

  const paste = `
  - x
  - y
  `

  const stateNew = reducerFlow([
    importText({ text }),
    // manually change `b` to empty thought since importText skips empty thoughts
    editThoughtAtFirstMatch({
      newValue: '',
      oldValue: 'b',
      at: ['a', 'b'],
    }),
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
    - d`

  const paste = `
  - x
  - y
  `

  const stateNew = reducerFlow([
    importText({ text }),
    // manually change `c` to empty thought since importText skips empty thoughts
    editThoughtAtFirstMatch({
      newValue: '',
      oldValue: 'c',
      at: ['a', 'c'],
    }),
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

  expect(stateNew.cursor).toMatchObject([
    getThoughtIdByContext(stateNew, ['a']),
    getThoughtIdByContext(stateNew, ['a', 'y']),
  ])
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

  expect(stateNew.cursor).toMatchObject(rankThoughtsFirstMatch(stateNew, ['a', 'y'])!)
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
    - b`

  const paste = '<b><i>A</i></b>'

  const stateNew = reducerFlow([
    // importing single-line needs an existing thought
    importText({ text }),

    // manually change `b` to empty thought to not see 'b' end of the new value.
    editThoughtAtFirstMatch({
      newValue: '',
      oldValue: 'b',
      at: ['a', 'b'],
    }),
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
   - c`

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
    - <em>c</em>`
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
  - c<br>`
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
  - c<br><span class="note">This is c!</span>`
  const exported = importExport(text, false)
  expect(exported.trim()).toBe(
    `- a
- b
- c
  - =note
    - This is c!`,
  )
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

  it('should paste text properly that is copied from MacOS Notes.app', () => {
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

  it('should paste text properly that is copied from IOS notes.app', () => {
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

  it('should paste text that contains li tags properly that is copied from macos notes.app', () => {
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

  it('should paste text that contains formatting properly that is copied from macos notes.app', () => {
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

  it('should paste text that contains multiple formatting properly that is copied from macos notes.app', () => {
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

  it('should paste text that contains formatting that is copied from IOS notes.app', () => {
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
    - d`

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
    - d`

  const stateNew = reducerFlow([importText({ text }), importText({ text: 'e' })])(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e`)
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

it('import raw state', () => {
  // raw thought state with two thoughts: a/b
  // most of this is settings, but keep them for completeness
  const text = `{
  "contextIndex": {
    "__ROOT__": {
      "id": "__ROOT__",
      "value": "__ROOT__",
      "parentId": "__ROOT_PARENT_ID__",
      "rank": 0,
      "children": [
        "FYR7M7Blu60NLUmJd2ftn"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": "2021-12-27T17:42:30.485Z"
    },
    "__ABSOLUTE__": {
      "id": "__ABSOLUTE__",
      "value": "__ABSOLUTE__",
      "parentId": "__ROOT_PARENT_ID__",
      "children": [],
      "pending": true,
      "lastUpdated": "",
      "rank": 0,
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "__EM__": {
      "id": "__EM__",
      "value": "__EM__",
      "parentId": "__ROOT_PARENT_ID__",
      "rank": 0,
      "children": [
        "216f7448-46aa-439f-b120-1d22e5d86ca1"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "216f7448-46aa-439f-b120-1d22e5d86ca1": {
      "id": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "value": "Settings",
      "parentId": "__EM__",
      "rank": 0,
      "children": [
        "1e9d559a-ad96-4eab-ba84-6630f6fbc100",
        "3f97deb5-c528-4e2d-9896-dc629e885a5b",
        "b13fea61-348c-4eaf-9ba5-52551ad1f484",
        "81d2d67b-a8a1-46e7-b72b-4057286369f6",
        "a5d38ebb-a363-468f-8ef6-2b31119d5105",
        "66cc458e-de25-4ffa-89be-a849fb3531d7",
        "6904edc7-ed18-40dc-9dc6-75e047cc7879"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "1e9d559a-ad96-4eab-ba84-6630f6fbc100": {
      "id": "1e9d559a-ad96-4eab-ba84-6630f6fbc100",
      "value": "=readonly",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "3f97deb5-c528-4e2d-9896-dc629e885a5b": {
      "id": "3f97deb5-c528-4e2d-9896-dc629e885a5b",
      "value": "Theme",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 1,
      "children": [
        "d0b38ea6-aca6-443f-97a2-7c0cb2d725c5",
        "89855d17-92ee-4e7c-88b4-a60c4e1cc16f",
        "f4fed3d3-7324-49c3-8979-1a2af6f77739"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "b13fea61-348c-4eaf-9ba5-52551ad1f484": {
      "id": "b13fea61-348c-4eaf-9ba5-52551ad1f484",
      "value": "Global Sort",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 2,
      "children": [
        "64023af1-ea6a-4659-be45-f841895ea069",
        "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0",
        "86946b83-e8c6-4c4d-8ace-41535732ca0a"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "81d2d67b-a8a1-46e7-b72b-4057286369f6": {
      "id": "81d2d67b-a8a1-46e7-b72b-4057286369f6",
      "value": "Data Integrity Check",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 3,
      "children": [
        "d30157cf-402e-4aa6-b49a-b761c9aa385f",
        "827d46d7-562e-4139-bc55-2c62119d706f",
        "792242d7-0a7c-4f53-b3a5-9834cc43562a"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "a5d38ebb-a363-468f-8ef6-2b31119d5105": {
      "id": "a5d38ebb-a363-468f-8ef6-2b31119d5105",
      "value": "Tutorial",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 4,
      "children": [
        "1f58cfbb-f1e7-4baa-8244-429dbdd21679",
        "a237c8d8-36f7-41df-8633-4cf6061ad41c",
        "9d37199c-de07-4ab5-9971-f508cb5f0866"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": "2021-12-10T18:57:06.663Z"
    },
    "66cc458e-de25-4ffa-89be-a849fb3531d7": {
      "id": "66cc458e-de25-4ffa-89be-a849fb3531d7",
      "value": "Tutorial Choice",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 5,
      "children": [
        "ebbce1d3-da4a-4f65-9fda-f33c9c64dd64",
        "b25395ed-51f3-4781-bde4-0e3988ff3c83",
        "1c6cb8eb-68e9-4d7c-a357-47e6b167285f"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "6904edc7-ed18-40dc-9dc6-75e047cc7879": {
      "id": "6904edc7-ed18-40dc-9dc6-75e047cc7879",
      "value": "Tutorial Step",
      "parentId": "216f7448-46aa-439f-b120-1d22e5d86ca1",
      "rank": 6,
      "children": [
        "1154f63c-8ef0-4407-85d5-a01e5585b740",
        "58aedeb3-58db-4383-af32-a3790caec700",
        "8c91edf6-ec7d-45f1-ad45-eaf83946f584"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "d0b38ea6-aca6-443f-97a2-7c0cb2d725c5": {
      "id": "d0b38ea6-aca6-443f-97a2-7c0cb2d725c5",
      "value": "=readonly",
      "parentId": "3f97deb5-c528-4e2d-9896-dc629e885a5b",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "89855d17-92ee-4e7c-88b4-a60c4e1cc16f": {
      "id": "89855d17-92ee-4e7c-88b4-a60c4e1cc16f",
      "value": "=options",
      "parentId": "3f97deb5-c528-4e2d-9896-dc629e885a5b",
      "rank": 1,
      "children": [
        "20a223c2-6671-46fa-87a7-ea73184a1dd6",
        "b1ae8462-d4b5-4936-af84-ea9dc00b972f"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "f4fed3d3-7324-49c3-8979-1a2af6f77739": {
      "id": "f4fed3d3-7324-49c3-8979-1a2af6f77739",
      "value": "Dark",
      "parentId": "3f97deb5-c528-4e2d-9896-dc629e885a5b",
      "rank": 2,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "64023af1-ea6a-4659-be45-f841895ea069": {
      "id": "64023af1-ea6a-4659-be45-f841895ea069",
      "value": "=readonly",
      "parentId": "b13fea61-348c-4eaf-9ba5-52551ad1f484",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0": {
      "id": "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0",
      "value": "=options",
      "parentId": "b13fea61-348c-4eaf-9ba5-52551ad1f484",
      "rank": 1,
      "children": [
        "f6ee230a-7720-4143-9a43-a55f5c2f7878",
        "ce009884-6764-43f0-a3d0-42e93badbc44"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "86946b83-e8c6-4c4d-8ace-41535732ca0a": {
      "id": "86946b83-e8c6-4c4d-8ace-41535732ca0a",
      "value": "None",
      "parentId": "b13fea61-348c-4eaf-9ba5-52551ad1f484",
      "rank": 2,
      "children": [
        "d6f5200b-4b5c-480e-915d-9a255d7ec22c"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "d30157cf-402e-4aa6-b49a-b761c9aa385f": {
      "id": "d30157cf-402e-4aa6-b49a-b761c9aa385f",
      "value": "=readonly",
      "parentId": "81d2d67b-a8a1-46e7-b72b-4057286369f6",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "827d46d7-562e-4139-bc55-2c62119d706f": {
      "id": "827d46d7-562e-4139-bc55-2c62119d706f",
      "value": "=options",
      "parentId": "81d2d67b-a8a1-46e7-b72b-4057286369f6",
      "rank": 1,
      "children": [
        "c08d34eb-9573-428c-b85d-073976b4d655",
        "458941a0-e68f-4fb6-8ae9-cdd8a1e99cbb"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "792242d7-0a7c-4f53-b3a5-9834cc43562a": {
      "id": "792242d7-0a7c-4f53-b3a5-9834cc43562a",
      "value": "Off",
      "parentId": "81d2d67b-a8a1-46e7-b72b-4057286369f6",
      "rank": 2,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "1f58cfbb-f1e7-4baa-8244-429dbdd21679": {
      "id": "1f58cfbb-f1e7-4baa-8244-429dbdd21679",
      "value": "=readonly",
      "parentId": "a5d38ebb-a363-468f-8ef6-2b31119d5105",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "a237c8d8-36f7-41df-8633-4cf6061ad41c": {
      "id": "a237c8d8-36f7-41df-8633-4cf6061ad41c",
      "value": "=options",
      "parentId": "a5d38ebb-a363-468f-8ef6-2b31119d5105",
      "rank": 1,
      "children": [
        "69244a64-7da9-40d5-ad56-268cddb5b18d",
        "29b5f513-4163-4875-8977-38b79830992f"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "9d37199c-de07-4ab5-9971-f508cb5f0866": {
      "id": "9d37199c-de07-4ab5-9971-f508cb5f0866",
      "value": "Off",
      "parentId": "a5d38ebb-a363-468f-8ef6-2b31119d5105",
      "rank": 2,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": "2021-12-10T18:57:06.663Z"
    },
    "ebbce1d3-da4a-4f65-9fda-f33c9c64dd64": {
      "id": "ebbce1d3-da4a-4f65-9fda-f33c9c64dd64",
      "value": "=readonly",
      "parentId": "66cc458e-de25-4ffa-89be-a849fb3531d7",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "b25395ed-51f3-4781-bde4-0e3988ff3c83": {
      "id": "b25395ed-51f3-4781-bde4-0e3988ff3c83",
      "value": "=type",
      "parentId": "66cc458e-de25-4ffa-89be-a849fb3531d7",
      "rank": 1,
      "children": [
        "7ddf3199-7704-4684-aac0-2d654e32c9f7"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "1c6cb8eb-68e9-4d7c-a357-47e6b167285f": {
      "id": "1c6cb8eb-68e9-4d7c-a357-47e6b167285f",
      "value": "0",
      "parentId": "66cc458e-de25-4ffa-89be-a849fb3531d7",
      "rank": 2,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "1154f63c-8ef0-4407-85d5-a01e5585b740": {
      "id": "1154f63c-8ef0-4407-85d5-a01e5585b740",
      "value": "=readonly",
      "parentId": "6904edc7-ed18-40dc-9dc6-75e047cc7879",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "58aedeb3-58db-4383-af32-a3790caec700": {
      "id": "58aedeb3-58db-4383-af32-a3790caec700",
      "value": "=type",
      "parentId": "6904edc7-ed18-40dc-9dc6-75e047cc7879",
      "rank": 1,
      "children": [
        "4a2745f9-27cb-41da-9843-8d9b4dece49e"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "8c91edf6-ec7d-45f1-ad45-eaf83946f584": {
      "id": "8c91edf6-ec7d-45f1-ad45-eaf83946f584",
      "value": "1",
      "parentId": "6904edc7-ed18-40dc-9dc6-75e047cc7879",
      "rank": 2,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "20a223c2-6671-46fa-87a7-ea73184a1dd6": {
      "id": "20a223c2-6671-46fa-87a7-ea73184a1dd6",
      "value": "Dark",
      "parentId": "89855d17-92ee-4e7c-88b4-a60c4e1cc16f",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "b1ae8462-d4b5-4936-af84-ea9dc00b972f": {
      "id": "b1ae8462-d4b5-4936-af84-ea9dc00b972f",
      "value": "Light",
      "parentId": "89855d17-92ee-4e7c-88b4-a60c4e1cc16f",
      "rank": 1,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "f6ee230a-7720-4143-9a43-a55f5c2f7878": {
      "id": "f6ee230a-7720-4143-9a43-a55f5c2f7878",
      "value": "None",
      "parentId": "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "ce009884-6764-43f0-a3d0-42e93badbc44": {
      "id": "ce009884-6764-43f0-a3d0-42e93badbc44",
      "value": "Alphabetical",
      "parentId": "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0",
      "rank": 1,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "d6f5200b-4b5c-480e-915d-9a255d7ec22c": {
      "id": "d6f5200b-4b5c-480e-915d-9a255d7ec22c",
      "value": "=options",
      "parentId": "86946b83-e8c6-4c4d-8ace-41535732ca0a",
      "rank": 0,
      "children": [
        "62cf0545-a7c0-44a8-b06b-30ce90bf4892",
        "f8edd363-dedf-41ea-85db-c859af638b6e"
      ],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "c08d34eb-9573-428c-b85d-073976b4d655": {
      "id": "c08d34eb-9573-428c-b85d-073976b4d655",
      "value": "On",
      "parentId": "827d46d7-562e-4139-bc55-2c62119d706f",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "458941a0-e68f-4fb6-8ae9-cdd8a1e99cbb": {
      "id": "458941a0-e68f-4fb6-8ae9-cdd8a1e99cbb",
      "value": "Off",
      "parentId": "827d46d7-562e-4139-bc55-2c62119d706f",
      "rank": 1,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "69244a64-7da9-40d5-ad56-268cddb5b18d": {
      "id": "69244a64-7da9-40d5-ad56-268cddb5b18d",
      "value": "On",
      "parentId": "a237c8d8-36f7-41df-8633-4cf6061ad41c",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "29b5f513-4163-4875-8977-38b79830992f": {
      "id": "29b5f513-4163-4875-8977-38b79830992f",
      "value": "Off",
      "parentId": "a237c8d8-36f7-41df-8633-4cf6061ad41c",
      "rank": 1,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "7ddf3199-7704-4684-aac0-2d654e32c9f7": {
      "id": "7ddf3199-7704-4684-aac0-2d654e32c9f7",
      "value": "Number",
      "parentId": "b25395ed-51f3-4781-bde4-0e3988ff3c83",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "4a2745f9-27cb-41da-9843-8d9b4dece49e": {
      "id": "4a2745f9-27cb-41da-9843-8d9b4dece49e",
      "value": "Number",
      "parentId": "58aedeb3-58db-4383-af32-a3790caec700",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "62cf0545-a7c0-44a8-b06b-30ce90bf4892": {
      "id": "62cf0545-a7c0-44a8-b06b-30ce90bf4892",
      "value": "Desc",
      "parentId": "d6f5200b-4b5c-480e-915d-9a255d7ec22c",
      "rank": 0,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "f8edd363-dedf-41ea-85db-c859af638b6e": {
      "id": "f8edd363-dedf-41ea-85db-c859af638b6e",
      "value": "Asc",
      "parentId": "d6f5200b-4b5c-480e-915d-9a255d7ec22c",
      "rank": 1,
      "children": [],
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "lastUpdated": ""
    },
    "FYR7M7Blu60NLUmJd2ftn": {
      "id": "FYR7M7Blu60NLUmJd2ftn",
      "parentId": "__ROOT__",
      "children": [
        "KTbIjNPpdA3R1zjSMM0LR"
      ],
      "lastUpdated": "2021-12-27T17:42:27.962Z",
      "rank": 0,
      "value": "a",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "sortValue": "a"
    },
    "KTbIjNPpdA3R1zjSMM0LR": {
      "id": "KTbIjNPpdA3R1zjSMM0LR",
      "parentId": "FYR7M7Blu60NLUmJd2ftn",
      "children": [],
      "lastUpdated": "2021-12-27T17:42:25.619Z",
      "rank": 0,
      "value": "b",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "sortValue": "b"
    }
  },
  "thoughtIndex": {
    "323720a6648d6a2272003af034bc823a": {
      "value": "__ROOT__",
      "contexts": [],
      "created": "2021-12-27T17:42:24.101Z",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "36e16b2e5cf62e55e5a97fb45b85f030": {
      "value": "__ABSOLUTE__",
      "contexts": [],
      "created": "2021-12-27T17:42:24.101Z",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "27f1123ea6a031cea0b59c63d4be848f": {
      "value": "__EM__",
      "contexts": [],
      "created": "2021-12-27T17:42:24.101Z",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "5f91c388edbaa147a3faf14281100291": {
      "id": "5f91c388edbaa147a3faf14281100291",
      "value": "Settings",
      "contexts": [
        "216f7448-46aa-439f-b120-1d22e5d86ca1"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "a86ababb5c309af90099d9e84425159a": {
      "id": "a86ababb5c309af90099d9e84425159a",
      "value": "=readonly",
      "contexts": [
        "1e9d559a-ad96-4eab-ba84-6630f6fbc100",
        "d0b38ea6-aca6-443f-97a2-7c0cb2d725c5",
        "64023af1-ea6a-4659-be45-f841895ea069",
        "d30157cf-402e-4aa6-b49a-b761c9aa385f",
        "1f58cfbb-f1e7-4baa-8244-429dbdd21679",
        "ebbce1d3-da4a-4f65-9fda-f33c9c64dd64",
        "1154f63c-8ef0-4407-85d5-a01e5585b740"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "ea8c71e4d5e7af3b546fff23c72e4869": {
      "id": "ea8c71e4d5e7af3b546fff23c72e4869",
      "value": "Theme",
      "contexts": [
        "3f97deb5-c528-4e2d-9896-dc629e885a5b"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "6619061e339875751a22095681333fc1": {
      "id": "6619061e339875751a22095681333fc1",
      "value": "Global Sort",
      "contexts": [
        "b13fea61-348c-4eaf-9ba5-52551ad1f484"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "736ddc5e944b66af77bc3e3278667e5e": {
      "id": "736ddc5e944b66af77bc3e3278667e5e",
      "value": "Data Integrity Check",
      "contexts": [
        "81d2d67b-a8a1-46e7-b72b-4057286369f6"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "cdbc8c25ca68d96971e57db3f38298ad": {
      "id": "cdbc8c25ca68d96971e57db3f38298ad",
      "value": "Tutorial",
      "contexts": [
        "a5d38ebb-a363-468f-8ef6-2b31119d5105"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "52b83f8c68fc29f0f7e3589f260a996a": {
      "id": "52b83f8c68fc29f0f7e3589f260a996a",
      "value": "Tutorial Choice",
      "contexts": [
        "66cc458e-de25-4ffa-89be-a849fb3531d7"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "95fa1f512ce6a54e390f385cdb5f6d0e": {
      "id": "95fa1f512ce6a54e390f385cdb5f6d0e",
      "value": "Tutorial Step",
      "contexts": [
        "6904edc7-ed18-40dc-9dc6-75e047cc7879"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "8ced970148bbcecd81a4da922f0ae557": {
      "id": "8ced970148bbcecd81a4da922f0ae557",
      "value": "=options",
      "contexts": [
        "89855d17-92ee-4e7c-88b4-a60c4e1cc16f",
        "443f0e78-9de5-4e7d-9faa-65eeaa9be6a0",
        "d6f5200b-4b5c-480e-915d-9a255d7ec22c",
        "827d46d7-562e-4139-bc55-2c62119d706f",
        "a237c8d8-36f7-41df-8633-4cf6061ad41c"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "81140ebed7fd304f58ceeb52c57ebf72": {
      "id": "81140ebed7fd304f58ceeb52c57ebf72",
      "value": "Dark",
      "contexts": [
        "f4fed3d3-7324-49c3-8979-1a2af6f77739"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "9bda129680fad936823e86f4a5287da0": {
      "id": "9bda129680fad936823e86f4a5287da0",
      "value": "None",
      "contexts": [
        "86946b83-e8c6-4c4d-8ace-41535732ca0a"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "674313aceb22ee1d8fc128bf141df88d": {
      "id": "674313aceb22ee1d8fc128bf141df88d",
      "value": "Off",
      "contexts": [
        "792242d7-0a7c-4f53-b3a5-9834cc43562a",
        "29b5f513-4163-4875-8977-38b79830992f",
        "9d37199c-de07-4ab5-9971-f508cb5f0866"
      ],
      "created": "2021-12-10T18:57:06.663Z",
      "lastUpdated": "2021-12-10T18:57:06.663Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "1b857164b8d95cb930abf5b8d276d6b9": {
      "id": "1b857164b8d95cb930abf5b8d276d6b9",
      "value": "Type",
      "contexts": [
        "b25395ed-51f3-4781-bde4-0e3988ff3c83",
        "58aedeb3-58db-4383-af32-a3790caec700"
      ],
      "created": "2021-12-13T00:03:22.406Z",
      "lastUpdated": "2021-12-13T00:03:22.406Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "2ac9debed546a3803a8de9e53c875e09": {
      "id": "2ac9debed546a3803a8de9e53c875e09",
      "value": "0",
      "contexts": [
        "1c6cb8eb-68e9-4d7c-a357-47e6b167285f"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "71fbbbfe8a7b7c71942aeb9bf9f0f637": {
      "id": "71fbbbfe8a7b7c71942aeb9bf9f0f637",
      "value": "1",
      "contexts": [
        "8c91edf6-ec7d-45f1-ad45-eaf83946f584"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "f57c77c0ad312328ed297bbdd58ca38a": {
      "id": "f57c77c0ad312328ed297bbdd58ca38a",
      "value": "Light",
      "contexts": [
        "b1ae8462-d4b5-4936-af84-ea9dc00b972f"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "0b5b6691cc9684b976ae3d686f6d4204": {
      "id": "0b5b6691cc9684b976ae3d686f6d4204",
      "value": "Alphabetical",
      "contexts": [
        "ce009884-6764-43f0-a3d0-42e93badbc44"
      ],
      "created": "2021-12-14T15:04:53.239Z",
      "lastUpdated": "2021-12-14T15:04:53.239Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "2dc975ff398a1ab9ff9f676829b78130": {
      "id": "2dc975ff398a1ab9ff9f676829b78130",
      "value": "On",
      "contexts": [
        "c08d34eb-9573-428c-b85d-073976b4d655"
      ],
      "created": "2021-12-10T18:57:06.663Z",
      "lastUpdated": "2021-12-10T18:57:06.663Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "70a876cf710921490472a2cd90e1f1bc": {
      "id": "70a876cf710921490472a2cd90e1f1bc",
      "value": "Number",
      "contexts": [
        "7ddf3199-7704-4684-aac0-2d654e32c9f7",
        "4a2745f9-27cb-41da-9843-8d9b4dece49e"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "1bcabc75221ed756889df851c593c49a": {
      "id": "1bcabc75221ed756889df851c593c49a",
      "value": "Desc",
      "contexts": [
        "62cf0545-a7c0-44a8-b06b-30ce90bf4892"
      ],
      "created": "",
      "lastUpdated": "",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "1f07439ec567055c76d3b069214e50a8": {
      "id": "1f07439ec567055c76d3b069214e50a8",
      "value": "Asc",
      "contexts": [
        "f8edd363-dedf-41ea-85db-c859af638b6e"
      ],
      "created": "2021-12-14T15:04:53.239Z",
      "lastUpdated": "2021-12-14T15:04:53.239Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "85555565f6597889e6b53a48510e895a": {
      "id": "85555565f6597889e6b53a48510e895a",
      "contexts": [
        "FYR7M7Blu60NLUmJd2ftn"
      ],
      "created": "2021-12-25T12:35:37.042Z",
      "lastUpdated": "2021-12-27T17:42:30.484Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "value": "a"
    },
    "00000000000000000000000000000000": {
      "id": "00000000000000000000000000000000",
      "value": "",
      "contexts": [
        "ohIi61s8jpfRMUoMD7KTm"
      ],
      "created": "2021-12-25T12:35:36.438Z",
      "lastUpdated": "2021-12-27T17:42:25.619Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20"
    },
    "7a98a957b1d3d1eefa2e131e544e94e9": {
      "id": "7a98a957b1d3d1eefa2e131e544e94e9",
      "contexts": [
        "KTbIjNPpdA3R1zjSMM0LR"
      ],
      "created": "2021-12-25T12:35:37.436Z",
      "lastUpdated": "2021-12-27T17:42:30.484Z",
      "updatedBy": "344d2ff4-cf99-4785-9f0a-80d2bbd35e20",
      "value": "b"
    }
  }
}`

  expect(importExport(text, false)).toBe(
    `
- a
  - b
`,
  )
})

it('properly add lexeme entries for multiple thoughts with same value on import', () => {
  const text = `
  - a
    - m
      - x
  - m
   - y`

  const stateNew = reducerFlow([importText({ text })])(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  const thoughtMFirst = getParent(stateNew, ['a', 'm'])
  const thoughtMSecond = getParent(stateNew, ['m'])

  const lexemeM = getLexeme(stateNew, 'm')

  expect(lexemeM?.contexts).toMatchObject([thoughtMFirst?.id, thoughtMSecond?.id])
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - m
    - y`)
})
