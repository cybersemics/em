import 'react-native-get-random-values'
import { validate as uuidValidate } from 'uuid'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_PATH, HOME_TOKEN, EMPTY_SPACE } from '../../constants'
import { hashContext, hashThought, never, reducerFlow, timestamp, removeHome } from '../../util'
import { initialState } from '../../util/initialState'
import { exportContext, getParent, rankThoughtsFirstMatch } from '../../selectors'
import { importText, editThought, newThought } from '../../reducers'
import { SimplePath, State } from '../../@types'
import { createId } from '../createId'

/** Helper function that imports html and exports it as plaintext. */
const importExport = (text: string, isHTML = true) => {
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], isHTML ? 'text/html' : 'text/plain')

  return removeHome(exported)
}

it('basic import with proper thought structure', () => {
  const text = `
  - a
    - b
  `

  const now = timestamp()

  const stateNew = importText(initialState(now), { text, lastUpdated: now })
  const { contextIndex, thoughtIndex } = stateNew.thoughts

  const childAId = getParent(stateNew, [HOME_TOKEN])?.children[0]?.id
  const childBId = getParent(stateNew, ['a'])?.children[0]?.id

  expect(contextIndex).toMatchObject({
    [hashContext([EM_TOKEN])]: {
      id: hashContext([EM_TOKEN]),
      context: [EM_TOKEN],
      children: [],
      lastUpdated: never(),
      // TODO: Is this expected?
      pending: true,
    },
    [hashContext([HOME_TOKEN])]: {
      id: hashContext([HOME_TOKEN]),
      context: [HOME_TOKEN],
      children: [
        {
          // tautological; full assertion below
          id: childAId,
          value: 'a',
          rank: 0,
        },
      ],
    },
    [hashContext([ABSOLUTE_TOKEN])]: {
      // id: hashContext([ABSOLUTE_TOKEN]),
      context: [ABSOLUTE_TOKEN],
      children: [],
      lastUpdated: never(),
      pending: true,
    },
    [hashContext(['a'])]: {
      id: hashContext(['a']),
      context: ['a'],
      children: [
        {
          // tautological; full assertion below
          id: childBId,
          value: 'b',
          rank: 0,
        },
      ],
    },
  })

  // Note: Jest doesn't have lexicographic string comparison yet :(
  expect(contextIndex[hashContext(['a'])].lastUpdated >= now).toBeTruthy()

  expect(uuidValidate(childAId!)).toBe(true)
  expect(uuidValidate(childBId!)).toBe(true)

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
      contexts: [
        {
          id: childAId,
          context: [HOME_TOKEN],
          rank: 0,
        },
      ],
      created: now,
    },
    [hashThought('b')]: {
      value: 'b',
      contexts: [
        {
          id: childBId,
          context: ['a'],
          rank: 0,
        },
      ],
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
    (state: State) =>
      importText(state, {
        path: rankThoughtsFirstMatch(state, ['']),
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

  expect(contextIndex).toMatchObject({
    [hashContext([HOME_TOKEN])]: {
      context: [HOME_TOKEN],
      children: [
        {
          value: 'a',
          rank: 0,
        },
        {
          value: 'j',
        },
      ],
    },
    [hashContext(['a'])]: {
      context: ['a'],
      children: [
        {
          value: 'b',
          rank: 0,
        },
        {
          value: 'x',
          // Note: x has rank two because exisitingThoughtMove doesn't account for duplicate merges for calualting rank. In this case b value is a duplicate merge in the context of ['a']
          rank: 2,
        },
      ],
    },
    [hashContext(['a', 'b'])]: {
      context: ['a', 'b'],
      children: [
        {
          value: 'c',
          rank: 0,
        },
        {
          value: 'q',
          rank: 1,
        },
      ],
    },
    [hashContext(['a', 'x'])]: {
      context: ['a', 'x'],
      children: [
        {
          value: 'y',
          rank: 0,
        },
      ],
    },
  })
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

  const childAId = lexeme.contexts[0]?.id
  const childBId = lexeme.contexts[1]?.id

  expect(uuidValidate(childAId!)).toBe(true)
  expect(uuidValidate(childBId!)).toBe(true)

  expect(lexeme).toMatchObject({
    value: 'm',
    contexts: [
      {
        id: childAId,
        context: ['a'],
        rank: 0,
      },
      {
        id: childBId,
        context: ['b'],
        rank: 0,
      },
    ],
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
    editThought({
      newValue: '',
      oldValue: 'b',
      context: ['a'],
      path: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 0 },
      ] as SimplePath,
    }),

    importText({
      path: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: '', rank: 0 },
      ],
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
    editThought({
      newValue: '',
      oldValue: 'c',
      context: ['a'],
      path: [
        { value: 'a', rank: 0 },
        { value: 'c', rank: 1 },
      ] as SimplePath,
    }),

    importText({
      path: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: '', rank: 1 },
      ],
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

  expect(stateNew.cursor).toMatchObject([{ value: 'a' }, { value: 'y' }])
})

it('import as subthoughts of non-empty cursor', () => {
  const paste = `
  - x
  - y
  `

  const stateNew = reducerFlow([
    newThought('a'),
    importText({
      path: [{ id: createId(), value: 'a', rank: 0 }],
      text: paste,
    }),
  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - x
    - y`)

  expect(stateNew.cursor).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'y', rank: 1 },
  ])
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
    editThought({
      newValue: '',
      oldValue: 'b',
      context: ['a'],
      path: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 0 },
      ] as SimplePath,
    }),

    importText({
      path: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: '', rank: 0 },
      ],
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
