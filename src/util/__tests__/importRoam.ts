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
import { importROAM } from '../importROAM'
import { State, initialState } from '../initialState'
import { RoamPage } from 'roam'
import { exportedWithoutRoot } from '../../test-helpers/exportWithoutRoot'
import { SimplePath } from '../../types'
import { timestamp } from '../timestamp'

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
        rank: 0,
        value: ROOT_TOKEN,
        contexts: [],
        created: timestamp(),
        lastUpdated: timestamp()
      },
    },
  }
}

/** Imports the given ROAM's JSON format and exports it as plaintext. */
const importExport = (ROAMJSON: RoamPage[]) => {
  const {
    contextIndexUpdates: contextIndex,
    thoughtIndexUpdates: thoughtIndex,
  } = importROAM(testState, RANKED_ROOT as SimplePath, ROAMJSON)
  const state = {
    ...initialState(),
    thoughts: {
      contextIndex,
      thoughtIndex,
    }
  }
  const exported = exportContext(state, [ROOT_TOKEN], 'text/plain')
  return exportedWithoutRoot(exported)
}

test('it should convert a flat ROAM JSON into a list of thoughts', () => {
  const testData = [
    {
      title: 'Fruits',
      children: [
        {
          string: 'Apple',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111381583,
          uid: 'UK11200',
        },
        {
          string: 'Orange',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111383054,
          uid: 'UK11233',
        },
        {
          string: 'Banana',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111383911,
          uid: 'HMN_YQtZZ',
        }
      ],
    },
    {
      title: 'Veggies',
      children: [
        {
          string: 'Broccoli',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111381583,
          uid: 'BK11200',
        },
        {
          string: 'Spinach',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111383054,
          uid: 'BK11233',
        }
      ],
    }
  ]
  const res = importExport(testData)
  expect(res)
    .toBe(`
- Fruits
  - Apple
  - Orange
  - Banana
- Veggies
  - Broccoli
  - Spinach
`)
})

test('it should convert a flat ROAM JSON into a list of thoughts and subthoughts with correct indentation', () => {
  const testData = [
    {
      title: 'September 4th, 2020',
      children: [
        {
          string: 'A',
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111381583,
          children: [
            {
              string: 'B',
              'create-email': 'testemail@gmail.com',
              'create-time': 1600111383054,
              children: [
                {
                  string: 'C',
                  'create-email': 'testemail@gmail.com',
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
          'create-email': 'testemail@gmail.com',
          'create-time': 1600111456859,
          children: [
            {
              string: 'Y',
              'create-email': 'testemail@gmail.com',
              'create-time': 1600111457621,
              children: [
                {
                  string: '[[September 4th, 2020]]',
                  'create-email': 'testemail@gmail.com',
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
- September 5th, 2020
  - X
    - Y
      - [[September 4th, 2020]]
`)
})
