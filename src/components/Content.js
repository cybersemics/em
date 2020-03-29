import React, { useMemo } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isMobile } from '../browser.js'
import globals from '../globals.js'
import expandContextThought from '../action-creators/expandContextThought.js'

// components
import NewThoughtInstructions from './NewThoughtInstructions.js'
import Search from './Search.js'
import Subthoughts from './Subthoughts.js'

// constants
import {
  EM_TOKEN,
  MODAL_CLOSE_DURATION,
  RANKED_ROOT,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

// util
import {
  getSetting,
  getThoughtsRanked,
  meta,
} from '../util.js'

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

const stopEventPropagation = e => {
  // stop propagation to prevent default content onClick (which removes the cursor)
  e.stopPropagation()
}

const Content = props => {

  const { search, isTutorial, tutorialStep, showModal, showRemindMeLaterModal, cursorBack: moveCursorBack, rootThoughts } = props

  // remove the cursor if the click goes all the way through to the content
  // extends cursorBack with logic for closing modals
  const clickOnEmptySpace = () => {
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
    'content-tutorial': isMobile && isTutorial && tutorialStep !== TUTORIAL2_STEP_SUCCESS
  }), [tutorialStep, isTutorial])

  return <div
    id='content'
    className={contentClassNames}
    onClick={clickOnEmptySpace}
  >

    <div onClick={stopEventPropagation}>

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
  </div>
}

export default connect(mapStateToProps, mapDispatchToProps)(Content)
