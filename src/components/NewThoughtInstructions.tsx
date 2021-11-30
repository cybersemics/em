import React, { FC } from 'react'
import { connect } from 'react-redux'
import { isTouch } from '../browser'
import { shortcutById } from '../shortcuts'
import { TUTORIAL_STEP_FIRSTTHOUGHT } from '../constants'
import { getSetting } from '../selectors'
import GestureDiagram from './GestureDiagram'
import LoadingEllipsis from './LoadingEllipsis'
import { GesturePath, State } from '../@types'
import styled, { keyframes } from 'styled-components'
import tw from 'twin.macro'
import NoteText from './NoteText'

interface NewThoughtInstructionsProps {
  childrenLength: number
  isTutorial: boolean
}

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThoughtOrOutdent')
if (!newThoughtShortcut) {
  throw new Error('newThoughtOrOutdent shortcut not found.')
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { isLoading, status } = state

  return {
    localLoading: isLoading,
    status,
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 0),
  }
}

type NewThoughtInstructionsComponent = FC<NewThoughtInstructionsProps & ReturnType<typeof mapStateToProps>>

/** An absolutely centered LoadingEllipsis. */
const CenteredLoadingEllipsis = () => (
  <AbsoluteCenteredWrapper>
    <LoadingEllipsis />
  </AbsoluteCenteredWrapper>
)

/** Display platform-specific instructions of how to create a thought when a context has no thoughts. */
const NewThoughtInstructions: NewThoughtInstructionsComponent = ({
  childrenLength,
  localLoading,
  isTutorial,
  status,
  tutorialStep,
}) => {
  const remoteLoading = status === 'connecting' || status === 'loading'

  // loading
  // show loading message if local store is loading or if remote is loading and there are no children
  return (
    <NewThoughtInstructionWrapper>
      {(localLoading || remoteLoading) && childrenLength === 0 ? (
        // show loading ellipsis when loading
        <CenteredLoadingEllipsis />
      ) : // tutorial no children
      // show special message when there are no children in tutorial
      isTutorial ? (
        childrenLength === 0 && (tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isTouch) ? (
          <NoteText>Ahhh. Open space. Unlimited possibilities.</NoteText>
        ) : // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
        null
      ) : (
        // default
        <>
          <SelectNoneContainer>
            {isTouch ? (
              <GestureContainer>
                Swipe
                <GestureDiagram path={newThoughtShortcut.gesture as GesturePath} size={30} color='darkgray' />
                to add a new thought.
              </GestureContainer>
            ) : (
              <span>Hit the Enter key to add a new thought.</span>
            )}{' '}
          </SelectNoneContainer>
        </>
      )}
    </NewThoughtInstructionWrapper>
  )
}

const DelayedFadeIn = keyframes`
  0% {
    opacity: 0;
  }
  72% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`

const NewThoughtInstructionWrapper = styled.div`
  animation: 1.4s ease-out 0s normal forwards 1 ${DelayedFadeIn};
`

const GestureContainer = tw.span`
  flex
  items-center
`

const SelectNoneContainer = tw.span`
  select-none
`

const AbsoluteCenteredWrapper = tw.div`
  absolute  
  top-0
  bottom[10%]
  right-0
  left-0
  flex
  justify-center
  items-center
  text-center
  select-none
  cursor-default
`

export default connect(mapStateToProps)(NewThoughtInstructions)
