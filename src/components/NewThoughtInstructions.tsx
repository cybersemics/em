import React, { FC } from 'react'
import { connect } from 'react-redux'
import assert from 'assert'
import { isMobile } from '../browser'
import { shortcutById } from '../shortcuts'
import { TUTORIAL_STEP_FIRSTTHOUGHT } from '../constants'
import { getSetting } from '../selectors'
import GestureDiagram from './GestureDiagram'
import LoadingEllipsis from './LoadingEllipsis'
import { State } from '../util/initialState'
import { GesturePath } from '../types'

interface NewThoughtInstructionsProps {
  childrenLength: number,
  isTutorial: boolean,
}

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThoughtOrOutdent')
assert(newThoughtShortcut)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { isLoading, status } = state

  return {
    localLoading: isLoading,
    status,
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 0)
  }
}

type NewThoughtInstructionsComponent = FC<NewThoughtInstructionsProps & ReturnType<typeof mapStateToProps>>

/** Display platform-specific instructions of how to create a thought when a context has no thoughts. */
const NewThoughtInstructions: NewThoughtInstructionsComponent = ({ childrenLength, localLoading, isTutorial, status, tutorialStep }) => {

  const remoteLoading = status === 'connecting' || status === 'loading'

  // loading
  // show loading message if local store is loading or if remote is loading and there are no children
  return (localLoading || remoteLoading) && childrenLength === 0 ? <div className='absolute-center'>
    <i className='text-note'><LoadingEllipsis /></i>
  </div>

    // tutorial no children
    // show special message when there are no children in tutorial
    : isTutorial
      ? childrenLength === 0 && (tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isMobile)
        ? <div className='center-in-content'>
          <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
        </div>
      // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
        : null

    // default
      : <React.Fragment>
        <React.Fragment>{isMobile
          ? <span className='gesture-container'>Swipe <GestureDiagram path={newThoughtShortcut.gesture as GesturePath} size={30} color='darkgray' /></span>
          : <span>Hit the Enter key</span>
        } to add a new thought.</React.Fragment>
      </React.Fragment>
}

export default connect(mapStateToProps)(NewThoughtInstructions)
