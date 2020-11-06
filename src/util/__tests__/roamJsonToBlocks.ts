// constants
import {
  RANKED_ROOT,
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
import { importRoam } from '../roamJsonToBlocks'
import { State, initialState } from '../initialState'
import { RoamPage } from 'roam'
import { removeRoot } from '../../test-helpers/removeRoot'
import { SimplePath } from '../../types'
import { timestamp } from '../timestamp'

jest.mock('../timestamp', () => ({
  timestamp: () => '2020-11-02T01:11:58.869Z'
}))

const testState: State = {
  ...initialState(),
  thoughts: {
    contextIndex: {
      [hashContext([ROOT_TOKEN])]: {
        context: [ROOT_TOKEN],
        children: [],
        lastUpdated: timestamp()
      },
    },
    thoughtIndex: {
      [hashThought(ROOT_TOKEN)]: {
        value: ROOT_TOKEN,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp()
      },
    },
  }
}

const testData = [
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
]

/** Imports the given Roam's JSON format and exports it as plaintext. */
const importExport = (roamJson: RoamPage[]) => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importRoam(testState, RANKED_ROOT as SimplePath, roamJson)
  const state = {
    ...initialState(),
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plain')
  return removeRoot(exported)
}

test('it should convert a flat Roam json into a list of thoughts', () => {
  const res = importExport(testData)
  expect(res)
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
                }],
              uid: 'JBXKlMcxh',
            }],
          uid: '0VQBPmUiy',
        }],
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
                }],
              uid: 'obXRTMWqJ',
            }],
          uid: 'Pu444IoIi',
        }],
    }]
  const res = importExport(testData)
  expect(res)
    .toBe(`
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

test('it should save create-time as created property', () => {
  const roamBlocks = testData.map(roamBlock => roamBlock.children).flat()

  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importRoam(testState, RANKED_ROOT as SimplePath, testData)

  Object.keys(contextIndex)
    .forEach(contextHash => {
      expect(contextIndex[contextHash].lastUpdated).toEqual('2020-11-02T01:11:58.869Z')
    })

  Object.keys(thoughtIndex)
    // ignore root blocks (and =create-email thought)of Roam page since they won't have create/edit time
    .filter(thoughtHash => {
      const value = thoughtIndex[thoughtHash].value
      return !(value.startsWith('=') || value.startsWith('test_') || value === 'Fruits' || value === 'Veggies')
    })
    .forEach((thoughtHash, index) => {
      expect(thoughtIndex[thoughtHash].created).toEqual(new Date(roamBlocks[index]['create-time']).toISOString())
      expect(thoughtIndex[thoughtHash].lastUpdated).toEqual(new Date(roamBlocks[index]['edit-time']).toISOString())
    })

})

test('it should set the created and lastUpdated properties as current timestamp for root blocks', () => {
  const {
    thoughtIndexUpdates: thoughtIndex,
  } = importRoam(testState, RANKED_ROOT as SimplePath, testData)

  Object.keys(thoughtIndex)
    // ignore root blocks (and =create-email thought)of Roam page since they won't have create/edit time
    .filter(thoughtHash => {
      const value = thoughtIndex[thoughtHash].value
      return value === 'Fruits' || value === 'Veggies'
    })
    .forEach(thoughtHash => {
      expect(thoughtIndex[thoughtHash].created).toEqual('2020-11-02T01:11:58.869Z')
      expect(thoughtIndex[thoughtHash].lastUpdated).toEqual('2020-11-02T01:11:58.869Z')
    })

})
