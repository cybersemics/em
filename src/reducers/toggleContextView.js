import { updateUrlHistory, unrank, encodeItems } from '../util'

export const toggleContextView = (state) => () => {

  if (!state.cursor) return

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const key = sigKey(state.cursor)
  // const subthoughts = getSubthoughts(key, 3, { data: state.data })
  // const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)

  const items = /*subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== key
    ? [stripPunctuation(subthoughtUnderSelection.text)]
    : */unrank(state.cursor)

  const encoded = encodeItems(items)
  const contextViews = Object.assign({}, state.contextViews)

  if (encoded in state.contextViews) {
    delete contextViews[encoded]
  }
  else {
    Object.assign(contextViews, {
      [encoded]: true
    })
  }

  updateUrlHistory(state.cursor, { data: state.data, contextViews })

  return {
    contextViews
  }
}