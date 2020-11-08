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
import { removeRoot } from '../../test-helpers/removeRoot'

const RANKED_ROOT = [{ value: ROOT_TOKEN, rank: 0 }]
const initialState = {
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

/** Imports the given html and exports it as plaintext. */
const importExport = async text => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = await importText(RANKED_ROOT, text)(
    NOOP, // dispatch
    () => initialState // getState
  )
  const state = {
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plaintext')

  // remove root, de-indent (trim), and append newline to make tests cleaner
  return removeRoot(exported)
}

it('initialSettings', async () => {
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

it('two root thoughts', async () => {
  const text = `- a
  - b
- c
  - d`
  const exported = await importExport(text)
  expect(exported.trim())
    .toBe(text)
})

it('imports Roam json', async () => {
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
  //   /**
  //  * Parses Roam and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
  //  */
  // export const importRoam = (state: State, simplePath: SimplePath, roam: RoamPage[]) => {
  //   const thoughtsJSON = roamJsonToBlocks(roam)
  //   return importJSON(state, simplePath, thoughtsJSON, { skipRoot: false })
  // }

  const exported = await importExport(roamString)
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
