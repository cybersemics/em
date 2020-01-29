import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { isMobile } from '../browser.js'
import globals from '../globals.js'

// components
import { NewThoughtInstructions } from './NewThoughtInstructions.js'
import { Search } from './Search.js'
import { Subthoughts } from './Subthoughts.js'

// constants
import {
  MODAL_CLOSE_DURATION,
  RANKED_ROOT,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

// util
import {
  cursorBack,
  getThoughtsRanked,
  isTutorial,
} from '../util.js'

export const Content = connect(({ dataNonce, focus, search, user, settings, dragInProgress, isLoading, showModal }) => ({ dataNonce,
  dark: settings.dark,
  dragInProgress,
  focus,
  isLoading,
  scaleSize: settings.scaleSize,
  search,
  showModal,
  tutorial: settings.tutorial,
  tutorialStep: settings.tutorialStep,
  user,
}))((
    { dataNonce, search, user, dragInProgress, dark, tutorialStep, isLoading, dispatch, showModal, scaleSize }) => {

  const rootThoughts = getThoughtsRanked(RANKED_ROOT)

  // remove the cursor if the click goes all the way through to the content
  // extends cursorBack with logic for closing modals
  const clickOnEmptySpace = () => {
    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (!globals.disableOnFocus) {
      if (showModal) {
        dispatch({ type: 'modalRemindMeLater', showModal, MODAL_CLOSE_DURATION })
      }
      else {
        cursorBack()
        dispatch({ type: 'expandContextThought', thoughtsRanked: null })
      }
    }
  }

  return <div id='content' className={classNames({
    content: true,
    'content-tutorial': isMobile && isTutorial() && tutorialStep !== TUTORIAL2_STEP_SUCCESS
  })}
  onClick={clickOnEmptySpace}>
    <div className="transformContain" style={{ transform: `scale(${scaleSize})`, width: `${100 * (1 / scaleSize)}%` }}>

      <div onClick={e => {
          // stop propagation to prevent default content onClick (which removes the cursor)
          e.stopPropagation()
        }}
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
    </div>
  </div>
})
