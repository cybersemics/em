import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { tutorialNextActionCreator as tutorialNext } from '../../actions/tutorialNext'
import {
  HOME_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_SUCCESS,
} from '../../constants'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import getSetting from '../../selectors/getSetting'
import headValue from '../../util/headValue'
import TutorialNavigationButton from './TutorialNavigationButton'
import context1SubthoughtCreated from './utils/context1SubthoughtCreated'
import context2SubthoughtCreated from './utils/context2SubthoughtCreated'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationNext = React.forwardRef<HTMLAnchorElement, { tutorialStep: number }>(
  ({ tutorialStep }: { tutorialStep: number }, ref) => {
    const dispatch = useDispatch()

    useSelector(state => state.thoughts.thoughtIndex)

    const showNextButton = useSelector(state => {
      const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
      const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0)
      const cursorValue = state.cursor ? headValue(state, state.cursor) : null
      const expanded = state.expanded

      return (
        [
          TUTORIAL_STEP_START,
          TUTORIAL_STEP_SUCCESS,
          TUTORIAL2_STEP_START,
          TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
          TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
          TUTORIAL2_STEP_SUCCESS,
        ].includes(tutorialStep) ||
        (tutorialStep === TUTORIAL_STEP_AUTOEXPAND && Object.keys(expanded).length === 0) ||
        ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER ||
          tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
          tutorialStep === TUTORIAL_STEP_SUBTHOUGHT_ENTER) &&
          (!cursorValue || cursorValue.length > 0)) ||
        (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT &&
          context1SubthoughtCreated({ rootChildren, tutorialChoice })) ||
        (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT &&
          context2SubthoughtCreated({ rootChildren, tutorialChoice }))
      )
    })

    return showNextButton ? (
      <TutorialNavigationButton
        clickHandler={() => dispatch(tutorialNext({}))}
        value={tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}
        ref={ref}
      />
    ) : (
      <span className={css({ marginLeft: '10px', fontStyle: 'italic', fontSize: 'sm' })} ref={ref}>
        Complete the instructions to continue
      </span>
    )
  },
)

TutorialNavigationNext.displayName = 'TutorialNavigationNext'

export default TutorialNavigationNext
