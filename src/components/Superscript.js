import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// util
import {
  contextOf,
  equalArrays,
  exists,
  getContexts,
  head,
  headKey,
  isContextViewActive,
  rootedContextOf,
  unrank,
} from '../util.js'

// renders superscript if there are other contexts
// optionally pass items (used by ContextBreadcrumbs) or thoughtsRanked (used by Child)
export const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showModal, modalData }, props) => {

  // track the transcendental identifier if editing
  const editing = equalArrays(unrank(cursorBeforeEdit || []), unrank(props.thoughtsRanked || [])) && exists(headKey(cursor || []))

  const thoughtsRanked = props.showContexts && props.thoughtsRanked
    ? rootedContextOf(props.thoughtsRanked)
    : props.thoughtsRanked

  const items = props.items || unrank(thoughtsRanked)

  const itemsLive = editing
    ? (props.showContexts ? contextOf(unrank(cursor || [])) : unrank(cursor || []))
    : items

  const thoughtsRankedLive = editing
    ? (props.showContexts ? contextOf(cursor || []) : cursor || [])
    : thoughtsRanked

  return {
    contextViews,
    items,
    thoughtsRankedLive,
    thoughtsRanked,
    // itemRaw is the head that is removed when showContexts is true
    itemRaw: props.showContexts ? head(props.thoughtsRanked) : head(thoughtsRankedLive),
    empty: itemsLive.length > 0 ? head(itemsLive).length === 0 : true, // ensure re-render when item becomes empty
    numContexts: exists(head(itemsLive)) && getContexts(head(itemsLive)).length,
    showModal,
    modalData
  }
})(({ contextViews, contextChain = [], items, thoughtsRanked, thoughtsRankedLive, itemRaw, empty, numContexts, showModal, modalData, showSingle, showContexts, superscript = true, dispatch }) => {

  showContexts = showContexts || isContextViewActive(unrank(thoughtsRanked), { state: store.getState() })

  // const numDescendantCharacters = getDescendants(showContexts ? thoughtsRankedLive.concat(itemRaw) : thoughtsRankedLive )
  //   .reduce((charCount, child) => charCount + child.length, 0)

  return <span className='superscript-container'>{!empty && superscript && numContexts > (showSingle ? 0 : 1)
    ? <span className='num-contexts'> {/* Make the container position:relative so that the modal is positioned correctly */}
      {numContexts ? <sup>{numContexts}</sup> : null}

      {/* render the depth-bar inside the superscript so that it gets re-rendered with it */}
      {/* <DepthBar/> */}

    </span>

    : null/* <DepthBar/> */}

  </span>
})
