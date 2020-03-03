import { initialState } from '../util/initialState'

export const UNDO = 'UNDO'
export const REDO = 'REDO'
export const REPLAY_FINISHED = 'REPLAY_FINISHED'

const undoableActions = [
  'loadLocalState',
  'existingThoughtDelete',
  'existingThoughtChange',
  'existingThoughtMove',
  'newThoughtSubmit',
]

const replay = function (initial, actions, reducer) {
  return actions.reduce((state, action) => reducer(state, action), initial)
}

const undo = function (initial, past, present, future, reducer) {
  if (past.length === 1) {
    return {
      initial,
      past,
      present,
      future,
    }
  }

  const action = past[past.length - 1]
  const newPast = past.slice(0, past.length - 1)
  const previous = replay(initial, newPast, reducer)

  return {
    initial,
    past: newPast,
    present: previous,
    future: [action, ...future]
  }
}

const redo = function (initial, past, present, future, reducer) {
  if (future.length === 0) {
    return {
      initial,
      past,
      present,
      future,
    }
  }

  const action = future[0]
  const newFuture = future.slice(1)
  const newPresent = reducer(present, action)

  return {
    initial,
    past: [...past, action],
    present: newPresent,
    future: newFuture
  }
}

const undoable = reducer => {
  const timeState = {
    initial: initialState(),
    past: [],
    present: initialState(),
    future: []
  }

  return function (state = timeState, action) {
    const { initial, past, present, future } = state

    switch (action.type) {
      case UNDO: {
        return undo(initial, past, present, future, reducer)
      }
      case REDO: {
        return redo(initial, past, present, future, reducer)
      }
      default: {
        const newPresent = reducer(present, action)
        if (present === newPresent) {
          return state
        }

        if (!undoableActions.includes(action.type)) {
          return {
            initial,
            past,
            present: newPresent,
            future
          }
        }

        return {
          initial,
          past: [...past, action],
          present: newPresent,
          future: []
        }
      }
    }
  }
}

export default undoable
