import React, { FC } from 'react'
import { connect } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import State from '../@types/State'
import { isTouch } from '../browser'
import { TUTORIAL_STEP_FIRSTTHOUGHT } from '../constants'
import getSetting from '../selectors/getSetting'
import { shortcutById } from '../shortcuts'
import GestureDiagram from './GestureDiagram'
import LoadingEllipsis from './LoadingEllipsis'

interface NewThoughtInstructionsProps {
  childrenLength: number
  isTutorial: boolean
}

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
if (!newThoughtShortcut) {
  throw new Error('newThought shortcut not found.')
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: NewThoughtInstructionsProps) => {
  const { isLoading, status } = state

  return {
    /*
      Determining when to show the loader is nontrivial due to many loading states of local and remote, Firebase connection and authentication status, and pending thoughts.

      Some cases:
      - Load from empty local and empty remote
      ✗ Load from empty local and full remote (first time login)
      - Load from empty local and full remote (cleared local)
      - Load from full local and full remote

      Currently first time login is the only case that is broken. NewThoughtInstructions is incorrectly shown while loading after login.
      state.status and state.isLoading are very fragile. They are coupled to pull, updateThoughts, and NewThoughtInstructions.

      Related:
      - https://github.com/cybersemics/em/issues/1344
      - https://github.com/cybersemics/em/pull/1345
    */
    showLoader: props.childrenLength === 0 && (isLoading || status === 'connecting' || status === 'loading'),
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 0),
  }
}

type NewThoughtInstructionsComponent = FC<NewThoughtInstructionsProps & ReturnType<typeof mapStateToProps>>

/** An absolutely centered LoadingEllipsis. */
const CenteredLoadingEllipsis = () => (
  <div className='absolute-center'>
    <i className='text-note'>
      <LoadingEllipsis />
    </i>
  </div>
)

/** Display platform-specific instructions of how to create a thought when a context has no thoughts. */
const NewThoughtInstructions: NewThoughtInstructionsComponent = ({
  childrenLength,
  showLoader,
  isTutorial,
  tutorialStep,
}) => {
  // loading
  // show loading message if local store is loading or if remote is loading and there are no children
  return (
    <div className='new-thought-instructions'>
      {showLoader ? (
        // show loading ellipsis when loading
        <CenteredLoadingEllipsis />
      ) : // tutorial no children
      // show special message when there are no children in tutorial
      isTutorial ? (
        childrenLength === 0 && (tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isTouch) ? (
          <div className='center-in-content'>
            <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
          </div>
        ) : // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
        null
      ) : (
        // default
        <>
          <span style={{ userSelect: 'none' }}>
            {isTouch ? (
              <span className='gesture-container'>
                Swipe <GestureDiagram path={newThoughtShortcut.gesture as GesturePath} size={30} color='darkgray' />
              </span>
            ) : (
              <span>Hit the Enter key</span>
            )}{' '}
            to add a new thought.
          </span>
        </>
      )}
    </div>
  )
}

export default connect(mapStateToProps)(NewThoughtInstructions)
