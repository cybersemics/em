import { validate as uuidValidate } from 'uuid'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
import { hashContext, hashThought, never, reducerFlow, timestamp } from '../../util'
import { initialState, State } from '../../util/initialState'
import { exportContext, getParent, rankThoughtsFirstMatch } from '../../selectors'
import { importText, existingThoughtChange, newThought } from '../../reducers'
import { SimplePath } from '../../types'

/** Helper function that imports html and exports it as plaintext. */
const importExport = (text: string) => {

  const stateNew = importText(initialState(), { path: HOME_PATH, text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  // remove root, de-indent (trim), and append newline to make tests cleaner
  const exportedWithoutRoot = exported.slice(exported.indexOf('\n'))
    .split('\n')
    .map(line => line.slice(2))
    .join('\n')
    + '\n'

  return exportedWithoutRoot
}

it('basic import with proper thought structure', () => {

  const text = `
  - a
    - b
  `

  const now = timestamp()

  const stateNew = importText(initialState(now), { path: HOME_PATH, text, lastUpdated: now })
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
      children: [{
        // tautological; full assertion below
        id: childAId,
        value: 'a',
        rank: 0,
      }],
    },
    [hashContext([ABSOLUTE_TOKEN])]: {
      // id: hashContext([ABSOLUTE_TOKEN]),
      context: [ABSOLUTE_TOKEN],
      children: [],
      lastUpdated: never(),
      pending: true
    },
    [hashContext(['a'])]: {
      id: hashContext(['a']),
      context: ['a'],
      children: [{
        // tautological; full assertion below
        id: childBId,
        value: 'b',
        rank: 0,
      }],
    }
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
      contexts: [{
        id: childAId,
        context: [HOME_TOKEN],
        rank: 0,
      }],
      created: now,
    },
    [hashThought('b')]: {
      value: 'b',
      contexts: [{
        id: childBId,
        context: ['a'],
        rank: 0,
      }],
      created: now,
    },
  })

  // Note: Jest doesn't have lexicographic string comparison yet :(
  expect(thoughtIndex[hashThought('a')].lastUpdated >= now).toBeTruthy()
  expect(thoughtIndex[hashThought('b')].lastUpdated >= now).toBeTruthy()

})

it('import and merge descendants', () => {

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
    importText({ text: initialText, path: HOME_PATH, lastUpdated: now }),
    newThought({ at: HOME_PATH, value: '' }),
    (state: State) => importText(state, {
      path: rankThoughtsFirstMatch(state, ['']),
      text: mergeText,
      lastUpdated: now
    })
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
      children: [{
        value: 'a',
        rank: 0,
      },
      {
        value: 'j',
        rank: 1,
      }
      ],
    },
    [hashContext(['a'])]: {
      context: ['a'],
      children: [{
        value: 'b',
        rank: 0,
      },
      {
        value: 'x',
        // Note: x has rank two because exisitingThoughtMove doesn't account for duplicate merges for calualting rank. In this case b value is a duplicate merge in the context of ['a']
        rank: 2,
      }],
    },
    [hashContext(['a', 'b'])]: {
      context: ['a', 'b'],
      children: [{
        value: 'c',
        rank: 0,
      },
      {
        value: 'q',
        rank: 1,
      }],
    },
    [hashContext(['a', 'x'])]: {
      context: ['a', 'x'],
      children: [{
        value: 'y',
        rank: 0,
      }],
    }
  })

})

it('initialSettings', () => {
  expect(importExport(`
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

      <li>Font Size
        <ul>
          <li>=readonly</li>
          <li>=type
            <ul>
              <li>Number</li>
            </ul>
          </li>
          <li>18</li>
        </ul>
      </li>

    </ul>
  </li>
</ul>
`))
    .toBe(`
- Settings
  - =readonly
  - Theme
    - =readonly
    - =options
      - Dark
      - Light
    - Dark
  - Font Size
    - =readonly
    - =type
      - Number
    - 18
`)
})

it('two root thoughts', () => {
  const text = `- a
  - b
- c
  - d`
  const exported = importExport(text)
  expect(exported.trim())
    .toBe(text)
})

it('skip root token', () => {

  const text = `- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`

  const stateNew = importText(initialState(), { path: HOME_PATH, text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
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

  const stateNew = importText(initialState(), { path: HOME_PATH, text })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
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
  const imported = importText(initialState(), { path: HOME_PATH, text, lastUpdated: now })
  const lexeme = imported.thoughts.thoughtIndex[hashThought('m')]

  const childAId = lexeme.contexts[0]?.id
  const childBId = lexeme.contexts[1]?.id

  expect(uuidValidate(childAId!)).toBe(true)
  expect(uuidValidate(childBId!)).toBe(true)

  expect(lexeme).toMatchObject({
    value: 'm',
    contexts: [{
      id: childAId,
      context: ['a'],
      rank: 0,
    }, {
      id: childBId,
      context: ['b'],
      rank: 0,
    }],
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
        }
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
        }
      ],
    }
  ])

  const exported = importExport(roamString)
  expect(exported)
    .toBe(`
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

    importText({ path: HOME_PATH, text }),

    // manually change `b` to empty thought since importText skips empty thoughts
    existingThoughtChange({
      newValue: '',
      oldValue: 'b',
      context: ['a'],
      path: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }] as SimplePath
    }),

    importText({
      path: [{ value: 'a', rank: 0 }, { value: '', rank: 0 }],
      text: paste,
    }),

  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
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

    importText({ path: HOME_PATH, text }),

    // manually change `c` to empty thought since importText skips empty thoughts
    existingThoughtChange({
      newValue: '',
      oldValue: 'c',
      context: ['a'],
      path: [{ value: 'a', rank: 0 }, { value: 'c', rank: 1 }] as SimplePath
    }),

    importText({
      path: [{ value: 'a', rank: 0 }, { value: '', rank: 1 }],
      text: paste,
    }),

  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
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
      path: [{ value: 'a', rank: 0 }],
      text: paste,
    }),

  ])(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
  - a
    - x
    - y`)

  expect(stateNew.cursor).toMatchObject([{ value: 'a', rank: 0 }, { value: 'y', rank: 1 }])
})

it('decode HTML entities', () => {

  const paste = `
  - one &amp; two
  - three &lt; four
  `

  const stateNew = importText({
    path: HOME_PATH,
    text: paste,
  })(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported)
    .toBe(`- ${HOME_TOKEN}
  - one & two
  - three < four`)
})

// related: https://github.com/cybersemics/em/issues/1008
it('do not parse as html when value has tags inside indented text', () => {

  expect(importExport(`
  - a
    - b
    - <li>c</li>
  `))
    .toBe(
      `
- a
  - b
  - c
`)
})
