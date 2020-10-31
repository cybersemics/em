import { EM_TOKEN, NOOP, RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { hashContext, hashThought, timestamp } from '../../util'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'

const INITIAL_STATE = {
  contextViews: {},
  thoughts: {
    contextIndex: {
      [hashContext([ROOT_TOKEN])]: {
        context: [ROOT_TOKEN],
        children: [],
      },
    },
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        contexts: [],
      },
    },
  }
}

/** Returns a mock initial State. */
const initialState = () => INITIAL_STATE

/** Helper function that imports html and exports it as plaintext. */
const importExport = text => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importText(RANKED_ROOT, text)(NOOP, initialState)

  const state = {
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext')

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

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importText(RANKED_ROOT, text, { lastUpdated: now })(NOOP, initialState)

  expect(contextIndex).toEqual({
    [hashContext([ROOT_TOKEN])]: {
      id: hashContext([ROOT_TOKEN]),
      context: [ROOT_TOKEN],
      children: [{
        // TODO: children don't have ids because they not have a Parent yet when they are created???
        // id: contextIndex[hashContext(['a'])].children[0].id,
        value: 'a',
        rank: 0,
        lastUpdated: now,
      }],
      lastUpdated: now,
    },
    [hashContext(['a'])]: {
      id: hashContext(['a']),
      context: ['a'],
      children: [{
        value: 'b',
        rank: 0,
        lastUpdated: now,
      }],
      lastUpdated: now,
    }
  })

  expect(thoughtIndex).toEqual({
    [hashThought('a')]: {
      value: 'a',
      contexts: [{
        context: [ROOT_TOKEN],
        rank: 0,
      }],
      created: now,
      lastUpdated: now,
    },
    [hashThought('b')]: {
      value: 'b',
      contexts: [{
        context: ['a'],
        rank: 0,
      }],
      created: now,
      lastUpdated: now,
    },
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

it('two root thoughts', async () => {
  const text = `- a
  - b
- c
  - d`
  const exported = importExport(text)
  expect(exported.trim())
    .toBe(text)
})

it('skip root token', async () => {

  const text = `- ${ROOT_TOKEN}
  - a
    - b
  - c
    - d`

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importText(RANKED_ROOT, text)(NOOP, initialState)

  const state = {
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }

  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext')

  // remove root, de-indent (trim), and append newline to make tests cleaner
  expect(exported)
    .toBe(`- ${ROOT_TOKEN}
  - a
    - b
  - c
    - d`)
})

it('skip em token', async () => {

  const text = `- ${EM_TOKEN}
  - a
    - b
  - c
    - d`

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importText(RANKED_ROOT, text)(NOOP, initialState)

  const state = {
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }

  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext')

  // remove root, de-indent (trim), and append newline to make tests cleaner
  expect(exported)
    .toBe(`- ${ROOT_TOKEN}
  - a
    - b
  - c
    - d`)
})
