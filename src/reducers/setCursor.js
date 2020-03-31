// constants
// import {
// } from '../constants.js'

// util
import {
  equalPath,
} from '../util.js'

export default (state, { cursorHistoryClear, cursorHistoryPop, editing, expanded, newContextViews, offset, thoughtsResolved, tutorialChoice, tutorialStep }) => {

  return equalPath(thoughtsResolved, state.cursor) && state.contextViews === newContextViews
    ? {
      editing: editing != null ? editing : state.editing,
      expanded,
    }
    : {
      // dataNonce must be bumped so that <Subthoughts> are re-rendered
      // otherwise the cursor gets lost when changing focus from an edited thought
      expanded,
      dataNonce: state.dataNonce + 1,
      cursor: thoughtsResolved,
      cursorBeforeEdit: thoughtsResolved,
      cursorOffset: offset,
      codeView: false,
      cursorHistory: cursorHistoryClear ? [] :
      cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
      : state.cursorHistory,
      contextViews: newContextViews,
      editing: editing != null ? editing : state.editing,
    }
}
