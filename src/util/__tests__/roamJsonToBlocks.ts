import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import hashThought from '../../util/hashThought'
import removeHome from '../../util/removeHome'
import importJSON from '../importJSON'
import initialState from '../initialState'
import keyValueBy from '../keyValueBy'
import roamJsonToBlocks, { RoamPage } from '../roamJsonToBlocks'

vi.mock('../timestamp', () => ({ default: () => '2020-11-02T01:11:58.869Z' }))

const testData: RoamPage[] = [
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
]

/** Imports the given Roam's JSON format and exports it as plaintext. */
const importExport = (roamJson: RoamPage[]) => {
  const thoughtsJSON = roamJsonToBlocks(roamJson)
  const state = initialState()
  const { thoughtIndexUpdates: thoughtIndex, lexemeIndexUpdates: lexemeIndex } = importJSON(
    state,
    HOME_PATH as SimplePath,
    thoughtsJSON,
    { skipRoot: false },
  )

  const stateNew: State = {
    ...initialState(),
    thoughts: {
      ...state.thoughts,
      thoughtIndex: {
        ...state.thoughts.thoughtIndex,
        ...thoughtIndex,
      },
      lexemeIndex: {
        ...state.thoughts.lexemeIndex,
        ...lexemeIndex,
      },
    },
  }
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  return removeHome(exported)
}

test('it should convert a flat Roam json into a list of thoughts', () => {
  const res = importExport(testData)
  expect(res).toBe(`
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

test('it should convert a Roam json into a list of thoughts and subthoughts with correct indentation', () => {
  const testData = [
    {
      title: 'September 4th, 2020',
      children: [
        {
          string: 'A',
          'create-email': 'test_create@gmail.com',
          'create-time': 1600111381583,
          children: [
            {
              string: 'B',
              'create-email': 'test_create@gmail.com',
              'create-time': 1600111383054,
              children: [
                {
                  string: 'C',
                  'create-email': 'test_create@gmail.com',
                  'create-time': 1600111383911,
                  uid: 'HMN_YQtZZ',
                },
              ],
              uid: 'JBXKlMcxh',
            },
          ],
          uid: '0VQBPmUiy',
        },
      ],
    },
    {
      title: 'September 5th, 2020',
      children: [
        {
          string: 'X',
          'create-email': 'test_create@gmail.com',
          'create-time': 1600111456859,
          children: [
            {
              string: 'Y',
              'create-email': 'test_create@gmail.com',
              'create-time': 1600111457621,
              children: [
                {
                  string: '[[September 4th, 2020]]',
                  'create-email': 'test_create@gmail.com',
                  'create-time': 1600111458385,
                  uid: 'Wt5NR3b56',
                },
              ],
              uid: 'obXRTMWqJ',
            },
          ],
          uid: 'Pu444IoIi',
        },
      ],
    },
  ]
  const res = importExport(testData)
  expect(res).toBe(`
- September 4th, 2020
  - A
    - B
      - C
        - =create-email
          - test_create@gmail.com
      - =create-email
        - test_create@gmail.com
    - =create-email
      - test_create@gmail.com
- September 5th, 2020
  - X
    - Y
      - [[September 4th, 2020]]
        - =create-email
          - test_create@gmail.com
      - =create-email
        - test_create@gmail.com
    - =create-email
      - test_create@gmail.com
`)
})

test('it should save create-time as created and edit-time as lastUpdated', () => {
  const roamBlocks = testData.map(roamBlock => roamBlock.children).flat()

  const blocks = roamJsonToBlocks(testData)

  const { thoughtIndexUpdates: thoughtIndex, lexemeIndexUpdates: lexemeIndex } = importJSON(
    initialState(),
    HOME_PATH as SimplePath,
    blocks,
    { skipRoot: false },
  )

  /** Gets the edit-time of a RoamBlock. */
  const editTimeOf = (value: string) => {
    const roamBlock = roamBlocks.find(roamBlock => roamBlock.string === value)
    return roamBlock?.['edit-time'] || null
  }

  /** Gets the create-time of a RoamBlock. */
  const createTime = (value: string) => {
    const roamBlock = roamBlocks.find(roamBlock => roamBlock.string === value)
    return roamBlock?.['create-time'] || null
  }

  const thoughtIndexEntries = keyValueBy(thoughtIndex, (key, thought) => ({
    [thought.value]: thought,
  }))

  expect(thoughtIndexEntries).toMatchObject({
    // RoamPages acquire the edit time of their last child
    Fruits: { lastUpdated: editTimeOf('Banana') },
    Veggies: { lastUpdated: editTimeOf('Spinach') },
    // RoamBlocks use specified edit time
    Apple: { lastUpdated: editTimeOf('Apple') },
    Orange: { lastUpdated: editTimeOf('Orange') },
    Banana: { lastUpdated: editTimeOf('Banana') },
    Broccoli: { lastUpdated: editTimeOf('Broccoli') },
    Spinach: { lastUpdated: editTimeOf('Spinach') },
  })

  expect(lexemeIndex).toMatchObject({
    // RoamPages acquire the edit time of their first child for thoughts
    // TODO: This differs from thoughtIndex incidentally. Should normalize the edit times used for thoughtIndex and lexemeIndex.
    [hashThought('Fruits')]: { created: createTime('Apple'), lastUpdated: editTimeOf('Apple') },
    [hashThought('Veggies')]: { created: createTime('Broccoli'), lastUpdated: editTimeOf('Broccoli') },

    // RoamBlocks use specified edit time
    [hashThought('Apple')]: { created: createTime('Apple'), lastUpdated: editTimeOf('Apple') },
    [hashThought('Orange')]: { created: createTime('Orange'), lastUpdated: editTimeOf('Orange') },
    [hashThought('Banana')]: { created: createTime('Banana'), lastUpdated: editTimeOf('Banana') },
    [hashThought('Broccoli')]: { created: createTime('Broccoli'), lastUpdated: editTimeOf('Broccoli') },
    [hashThought('Spinach')]: { created: createTime('Spinach'), lastUpdated: editTimeOf('Spinach') },
  })
})
