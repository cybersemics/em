import { render } from '../reducers'
import { mergeThoughts } from '../util'

/** Merges thoughts directly into the state. */
export default (state, newState = {}) =>
  render({
    ...state,
    isLoading: false,
    cursor: newState.cursor,
    cursorBeforeEdit: newState.cursorBeforeEdit,
    contextViews: {
      ...state.contextViews,
      ...newState.contextViews
    },
    expanded: {
      ...state.expanded,
      ...newState.expanded
    },
    thoughts: mergeThoughts(state.thoughts, newState.thoughts)
  })
