import render from './render'

/** Merges loaded state. */
export default (state, { newState }) =>
  render({
    ...state,
    recentlyEdited: {
      ...state.recentlyEdited,
      ...newState.recentlyEdited
    },
    schemaVersion: newState.schemaVersion,
  })
