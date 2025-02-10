import _ from 'lodash'
import MimeType from '../../@types/MimeType'
import Path from '../../@types/Path'
import State from '../../@types/State'
import importText, { ImportTextPayload } from '../../actions/importText'
import newThought from '../../actions/newThought'
import { ABSOLUTE_TOKEN, EMPTY_SPACE, EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
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

/** Helper function that imports text into the root and exports it as plaintext to make easily readable assertions. */
const importExport = (text: string, outputFormat: MimeType = 'text/plain') => {
  const stateNew = importText(initialState(), { text })
  const exported = exportContext(stateNew, [HOME_TOKEN], outputFormat, {
    excludeMarkdownFormatting: true,
  })
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

// TODO: importText no longer handlers multiline imports
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

  const exported = importExport(roamString)
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: importText no longer handlers multiline imports
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

// TODO: Needs to be rewritten to avoid converting from HTML -> JSON -> text -> HTML. See commit.
it.skip('should strip tags whose font weight is less than or equal to 400', () => {
  const paste = `<span style="font-weight:400;">Hello world. </span> <span style="font-weight:100;">This is a test </span>`
  const actual = importExport(paste, 'text/html')
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
  const paste = `<span style="font-weight: 500;">Hello world. </span><span style="font-weight: 800;">This is a test</span>`
  const actual = importExport(paste, 'text/html')
  const expectedOutput = `<ul>
  <li>__ROOT__${EMPTY_SPACE}
    <ul>
      <li><span style="font-weight: 700;">Hello world. </span><span style="font-weight: 700;">This is a test</span></li>
    </ul>
  </li>
</ul>`
  expect(actual).toBe(expectedOutput)
})

it('should not strip whole tag unless other style apart from font-weight should be preserved', () => {
  const paste = `<span style="font-weight: 400; font-style: italic;">a</span>`
  const actual = importExport(paste, 'text/html')
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
      <li><span style="color: rgb(255, 255, 255);font-weight: bold;background-color: rgb(0, 0, 0);">Atonement</span></li>
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
      <li><span style="color: pink;">Marcel Duchamp: The Art of the Possible</span></li>
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

it('simple', () => {
  expect(importExport('test')).toBe(`
- test
`)
})

it('simple li', () => {
  expect(importExport('<li>test</li>')).toBe(`
- test
`)
})

it('simple ul', () => {
  expect(importExport('<ul><li>test</li></ul>')).toBe(`
- test
`)
})

it('whitespace', () => {
  expect(importExport('  test  ')).toBe(`
- test
`)
})

it('strip wrapping tag', () => {
  expect(importExport('<span>test</span>')).toBe(`
- test
`)
})

it('strip inline tag', () => {
  expect(importExport('a <span>b</span> c')).toBe(`
- a b c
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
  expect(importExport('<b>one</b> and <i>two</i>', 'text/html')).toBe(expectedText)
})

// TODO
it.skip('WorkFlowy import with notes', () => {
  expect(
    importExport(
      `
z
<ul>
  <li>a<br>
    <span aria-label="note">Note</span>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c<br>
    <span aria-label="note">Other Note</span>
    <ul>
      <li>d</li>
    </ul>
  </li>
</ul>`,
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
