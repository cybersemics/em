import React, { useMemo, useRef } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import globals from '../globals'
import expandContextThought from '../action-creators/expandContextThought'
import NavBar from './NavBar'
import Scale from './Scale'
import { store } from '../store'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'

// constants
import {
  MODAL_CLOSE_DURATION,
  RANKED_ROOT,
} from '../constants'

// action-creators
import cursorBack from '../action-creators/cursorBack'

// selectors
import {
  getThoughtsRanked,
} from '../selectors'

// util
import {
  publishMode,
} from '../util'

/********************************************************************
 * mapStateToProps
 ********************************************************************/
const mapStateToProps = state => {
  const { focus, noteFocus, search, showModal, showSplitView, activeView } = state
  const rootThoughts = getThoughtsRanked(state, RANKED_ROOT)
  return {
    focus,
    search,
    showModal,
    rootThoughts,
    noteFocus,
    showSplitView,
    activeView,
  }
}

const viewID = 'split'

/********************************************************************
 * mapDispatchToProps
 ********************************************************************/
const mapDispatchToProps = dispatch => ({
  showRemindMeLaterModal: () => dispatch({ type: 'modalRemindMeLater', MODAL_CLOSE_DURATION }),
  cursorBack: () => dispatch(cursorBack()),
  activateView: () => dispatch({ type: 'toggleSplitView', activeViewID: viewID }),
})

/********************************************************************
 * Component
 ********************************************************************/
const SplitView = props => {
  const { search, showModal, showRemindMeLaterModal, cursorBack: moveCursorBack, rootThoughts, noteFocus, scale, activateView, activeView, showSplitView } = props
  const contentRef = useRef()
  const state = store.getState()
  // remove the cursor if the click goes all the way through to the content
  /** extends cursorBack with logic for closing modals */
  const clickOnEmptySpace = e => {
    // Activate the current view if not active
    if (showSplitView && activeView !== viewID) {
      activateView()
    }
    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    const selection = window.getSelection()
    const focusNode = selection && selection.focusNode
    if (focusNode && focusNode.nodeType === Node.TEXT_NODE) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (!globals.disableOnFocus) {
      if (showModal) {
        showRemindMeLaterModal()
      }
      else if (!noteFocus) {
        moveCursorBack()
        expandContextThought(null)
      }
    }
  }

  const contentClassNames = useMemo(() => classNames({
    content: true,
    publish: publishMode(),
    inactive: showSplitView && activeView !== viewID,
  }), [showSplitView, activeView])

  // Get thoughts ranked for __ROOT__
  const thoughtsRanked = getThoughtsRanked(state, RANKED_ROOT)
  // Split thoughts to show in the current view
  const thoughtsInView = thoughtsRanked.slice(Math.ceil(thoughtsRanked.length / 2, thoughtsRanked.length - 1))

  return <div id='content-wrapper'>
    <div
      id='content'
      ref={contentRef}
      className={contentClassNames}
      onClick={clickOnEmptySpace}
    >
      {search != null
        ? <Search />
        : <React.Fragment>
          {rootThoughts.length === 0 ? <NewThoughtInstructions children={rootThoughts} /> : <Subthoughts
            childrenForced={thoughtsInView}
            thoughtsRanked={RANKED_ROOT}
            expandable={true}
          />}
        </React.Fragment>
      }
    </div>
    <div className='nav-bottom-wrapper'>
      <Scale amount={scale}>

        <NavBar position='bottom' />

      </Scale>
    </div>
  </div>
}

export default connect(mapStateToProps, mapDispatchToProps)(SplitView)
