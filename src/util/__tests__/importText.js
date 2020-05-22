// constants
import {
  NOOP,
  ROOT_TOKEN,
} from '../../constants'

// util
import {
  hashContext,
  hashThought,
} from '../../util'

// selectors
import {
  exportContext,
} from '../../selectors'

// action-creators
import {
  importText,
} from '../../action-creators'

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
const importExport = async text => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = await importText(RANKED_ROOT, text)(
    NOOP, // dispatch
    () => initialState // getState
  )
  const state = { contextIndex, thoughtIndex }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext', { state })

  // remove root, de-indent (trim), and append newline to make tests cleaner
  const exportedWithoutRoot = exported.slice(exported.indexOf('\n'))
    .split('\n')
    .map(line => line.slice(2))
    .join('\n')
    + '\n'

  return exportedWithoutRoot
}

it('import initialSettings', async () => {
  expect(await importExport(`
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
