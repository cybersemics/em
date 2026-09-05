import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import undoSteps from '../undoSteps'

beforeEach(initStore)

/** Returns the action or command id of each patch of each step. */
const stepSources = () =>
  undoSteps(store.getState()).steps.map(step =>
    step.patches.map(patch =>
      patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType,
    ),
  )

it('group a new thought with the edit that types its value', () => {
  store.dispatch([newThought({}), editThought([''], 'a')])

  expect(stepSources()).toEqual([['newThought', 'editThought']])
  expect(undoSteps(store.getState()).position).toBe(0)
})

it('group a cursor move with the edit before it', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
    editThought(['a'], 'aa'),
    setCursor(['b']),
  ])

  expect(stepSources()).toEqual([['editThought', 'setCursor'], ['setCursor']])
})

it('count the undone steps as the position', () => {
  store.dispatch([newThought({}), editThought([''], 'a'), newThought({}), editThought([''], 'b'), undo()])

  expect(stepSources()).toEqual([
    ['newThought', 'editThought'],
    ['newThought', 'editThought'],
  ])
  expect(undoSteps(store.getState()).position).toBe(1)
})

it('keep the current state on a step boundary', () => {
  store.dispatch([newThought({}), editThought([''], 'a'), undo({ count: 1 })])

  expect(stepSources()).toEqual([['editThought'], ['newThought']])
  expect(undoSteps(store.getState()).position).toBe(1)
})
