import React, { useMemo } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isMobile } from '../browser'
import globals from '../globals'
import expandContextThought from '../action-creators/expandContextThought'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'

// constants
import {
  EM_TOKEN,
  MODAL_CLOSE_DURATION,
  RANKED_ROOT,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

// util
import {
  getSetting,
  getThoughtsRanked,
  meta,
  publishMode,
} from '../util'

const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

const mapStateToProps = ({ focus, search, isLoading, showModal }) => {
  const isTutorial = isLoading ? tutorialLocal : meta([EM_TOKEN, 'Settings', 'Tutorial']).On
  const tutorialStep = isLoading ? tutorialStepLocal : getSetting('Tutorial Step') || 1
  const rootThoughts = getThoughtsRanked(RANKED_ROOT)
  return {
    focus,
    search,
    showModal,
    isTutorial,
    tutorialStep,
    rootThoughts
  }
}

const mapDispatchToProps = dispatch => ({
  showRemindMeLaterModal: () => dispatch({ type: 'modalRemindMeLater', MODAL_CLOSE_DURATION }),
  cursorBack: () => dispatch(cursorBack())
})

const Content = props => {

  const { search, isTutorial, tutorialStep, showModal, showRemindMeLaterModal, cursorBack: moveCursorBack, rootThoughts } = props

  // remove the cursor if the click goes all the way through to the content
  // extends cursorBack with logic for closing modals
  const clickOnEmptySpace = () => {

    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    if (window.getSelection().focusNode.nodeType === Node.TEXT_NODE) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (!globals.disableOnFocus) {
      if (showModal) {
        showRemindMeLaterModal()
      }
      else {
        moveCursorBack()
        expandContextThought(null)
      }
    }
  }

  const contentClassNames = useMemo(() => classNames({
    content: true,
    'content-tutorial': isMobile && isTutorial && tutorialStep !== TUTORIAL2_STEP_SUCCESS,
    publish: publishMode(),
  }), [tutorialStep, isTutorial])

  return <div
    id='content'
    className={contentClassNames}
    onClick={clickOnEmptySpace}
  >
    {search != null
      ? <Search />
      : <React.Fragment>
        {rootThoughts.length === 0 ? <NewThoughtInstructions children={rootThoughts} /> : <Subthoughts
          thoughtsRanked={RANKED_ROOT}
          expandable={true}
        />}
      </React.Fragment>
    }
  </div>
}

export default connect(mapStateToProps, mapDispatchToProps)(Content)
