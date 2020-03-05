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
  headValue,
  isContextViewActive,
  rootedContextOf,
  pathToContext,
} from '../util.js'

// renders superscript if there are other contexts
// optionally pass thoughts (used by ContextBreadcrumbs) or thoughtsRanked (used by Subthought)
export const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showModal, modalData }, props) => {
  // track the transcendental identifier if editing
  const editing = equalArrays(pathToContext(cursorBeforeEdit || []), pathToContext(props.thoughtsRanked || [])) && exists(headValue(cursor || []))

  const thoughtsRanked = props.showContexts && props.thoughtsRanked
    ? rootedContextOf(props.thoughtsRanked)
    : props.thoughtsRanked

  const thoughts = props.thoughts || pathToContext(thoughtsRanked)

  const thoughtsLive = editing
    ? (props.showContexts ? contextOf(pathToContext(cursor || [])) : pathToContext(cursor || []))
    : thoughts

  const thoughtsRankedLive = editing
    ? (props.showContexts ? contextOf(cursor || []) : cursor || [])
    : thoughtsRanked

  return {
    contextViews,
    thoughts,
    thoughtsRankedLive,
    thoughtsRanked,
    // thoughtRaw is the head that is removed when showContexts is true
    thoughtRaw: props.showContexts ? head(props.thoughtsRanked) : head(thoughtsRankedLive),
    empty: thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true, // ensure re-render when thought becomes empty
    numContexts: exists(head(thoughtsLive)) && getContexts(head(thoughtsLive)).length,
    showModal,
    modalData
  }
})(({ contextViews, contextChain = [], thoughts, thoughtsRanked, thoughtsRankedLive, thoughtRaw, empty, numContexts, showModal, modalData, showSingle, showContexts, superscript = true, dispatch }) => {

  showContexts = showContexts || isContextViewActive(thoughtsRanked, { state: store.getState() })

  // const numDescendantCharacters = getDescendants(showContexts ? thoughtsRankedLive.concat(thoughtRaw) : thoughtsRankedLive )
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
