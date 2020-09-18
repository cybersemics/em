import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { exportContext } from '../../selectors'
import { createTestStore } from '../../test-helpers/createTestStore'

it('Undo thought change', async () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b`))

  store.dispatch([{
    type: 'setCursor', thoughtsRanked: [
      { value: 'a', rank: '0' }
    ]
  }, {
    type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  }, {
    type: 'undoAction'
  }])

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
  - b`

  expect(exported).toEqual(expectedOutput)
})

it('Group all navigation actions preceding a thought change and undo them together', async () => {

  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d`), {
    type: 'cursorDown'
  }, {
    type: 'existingThoughtChange',
    newValue: 'aa',
    oldValue: 'a',
    context: [ROOT_TOKEN],
    thoughtsRanked: [{ value: 'a', rank: 0 }]
  }, {
    type: 'cursorDown'
  }, {
    type: 'cursorDown'
  }, {
    type: 'setCursor'
  }, {
    type: 'cursorBack'
  }, {
    type: 'existingThoughtChange',
    context: [ROOT_TOKEN],
    oldValue: 'c',
    newValue: 'cc',
    thoughtsRanked: [
      {
        value: 'c',
        rank: 2,
      }
    ]
  }])

  // undo thought change and preceding navigation actions
  store.dispatch({ type: 'undoAction' })

  // restore the cursor to it's state before navigation actions
  const { cursor } = store.getState()

  expect(cursor).toMatchObject([{ value: 'aa' }])

})

it('Ignore dead actions/Combine dispensible actions with the preceding patch', () => {
  const store = createTestStore()

  store.dispatch([importText(RANKED_ROOT, `
  - a
   - b
   - c
   - d`), {
    type: 'setCursor'
  }, {
    type: 'existingThoughtChange',
    context: [
      'a'
    ],
    oldValue: 'b',
    newValue: 'bd',
    rankInContext: 1,
    thoughtsRanked: [
      {
        value: 'b',
        rank: 1,
      }
    ]
  },
  // dispensible set cursor (which only updates datanonce)
  {
    type: 'setCursor'
  }])

  // undo setCursor and thoughtChange in a sinle action
  store.dispatch({ type: 'undoAction' })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plain')

  const expectedOutput = `- ${ROOT_TOKEN}
  - a
    - b
    - c
    - d`

  expect(exported).toEqual(expectedOutput)
})
