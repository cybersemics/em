import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isMobile } from '../browser.js'
import globals from '../globals.js'
import expandContextThought from '../action-creators/expandContextThought.js'

// components
import { NewThoughtInstructions } from './NewThoughtInstructions.js'
import { Search } from './Search.js'
import { Subthoughts } from './Subthoughts.js'

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
  isTutorial,
  meta,
} from '../util.js'

const themeLocal = localStorage['Settings/Theme'] || 'Dark'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

export const Content = connect(({ dataNonce, focus, search, user, settings, dragInProgress, isLoading, showModal }) => {
  const dark = (isLoading ? themeLocal : getSetting('Theme')[0]) !== 'Light'
  const scaleSize = (isLoading ? fontSizeLocal : getSetting('Font Size')[0] || 16) / 16
  const tutorial = isLoading ? tutorialLocal : meta([EM_TOKEN, 'Settings', 'Tutorial']).On
  const tutorialStep = isLoading ? tutorialStepLocal : getSetting('Tutorial Step')[0] || 1
  return {
    dataNonce,
    dark,
    dragInProgress,
    focus,
    isLoading,
    scaleSize,
    search,
    showModal,
    tutorial,
    tutorialStep,
    user,
  }
})((
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
        dispatch(cursorBack())
        expandContextThought(null)
      }
    }
  }

  return <div
    id='content'
    className={classNames({
      content: true,
      'content-tutorial': isMobile && isTutorial() && tutorialStep !== TUTORIAL2_STEP_SUCCESS
    })}
    onClick={clickOnEmptySpace}
  >

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
})
