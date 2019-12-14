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
// optionally pass items (used by ContextBreadcrumbs) or itemsRanked (used by Child)
export const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showHelper, modalData }, props) => {

  // track the transcendental identifier if editing
  const editing = equalArrays(unrank(cursorBeforeEdit || []), unrank(props.itemsRanked || [])) && exists(headKey(cursor || []))

  const itemsRanked = props.showContexts && props.itemsRanked
    ? rootedContextOf(props.itemsRanked)
    : props.itemsRanked

  const items = props.items || unrank(itemsRanked)

  const itemsLive = editing
    ? (props.showContexts ? contextOf(unrank(cursor || [])) : unrank(cursor || []))
    : items

  const itemsRankedLive = editing
    ? (props.showContexts ? contextOf(cursor || []) : cursor || [])
    : itemsRanked

  return {
    contextViews,
    items,
    itemsRankedLive,
    itemsRanked,
    // itemRaw is the head that is removed when showContexts is true
    itemRaw: props.showContexts ? head(props.itemsRanked) : head(itemsRankedLive),
    empty: itemsLive.length > 0 ? head(itemsLive).length === 0 : true, // ensure re-render when item becomes empty
    numContexts: exists(head(itemsLive)) && getContexts(head(itemsLive)).length,
    showHelper,
    modalData
  }
})(({ contextViews, contextChain = [], items, itemsRanked, itemsRankedLive, itemRaw, empty, numContexts, showHelper, modalData, showSingle, showContexts, superscript = true, dispatch }) => {

  showContexts = showContexts || isContextViewActive(unrank(itemsRanked), { state: store.getState() })

  // const numDescendantCharacters = getDescendants(showContexts ? itemsRankedLive.concat(itemRaw) : itemsRankedLive )
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
