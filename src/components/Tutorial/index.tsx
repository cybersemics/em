import React, { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import GesturePath from '../../@types/GesturePath'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { isTouch } from '../../browser'
import {
  HOME_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
} from '../../constants'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import getSetting from '../../selectors/getSetting'
import { shortcutById } from '../../shortcuts'
import fastClick from '../../util/fastClick'
import headValue from '../../util/headValue'
import once from '../../util/once'
import GestureDiagram from '../GestureDiagram'
import TutorialNavigation from './TutorialNavigation'
import TutorialStepComponentMap from './TutorialStepComponentMap'

const NO_CHILDREN: Thought[] = []

/** Wrap a component in a slide CSS transition. */
const WithCSSTransition = ({ component, ...props }: { component: FC<any>; [props: string]: any }) => {
  const nodeRef = useRef(null)

  const Component = component
  return (
    <CSSTransition nodeRef={nodeRef} in={true} key={Math.floor(props.step)} timeout={400} classNames='slide'>
      <div ref={nodeRef}>
        <Component {...props} />
      </div>
    </CSSTransition>
  )
}

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
if (!newThoughtShortcut) {
  throw new Error('newThought shortcut not found.')
}

/** Tutorial component. */
const Tutorial: FC = () => {
  const tutorialStep = useSelector(state => {
    const step = +(getSetting(state, 'Tutorial Step') || 1)
    return isNaN(step) ? 1 : step
  })

  const dispatch = useDispatch()
  const contextViews = useSelector((state: State) => state.contextViews)
  const cursor = useSelector((state: State) => state.cursor)
  const rootChildren = useSelector((state: State) => getAllChildrenAsThoughts(state, HOME_TOKEN) || NO_CHILDREN)
  const tutorialChoice = useSelector(state => {
    const choice = +(getSetting(state, 'Tutorial Choice') || 0)
    // guard against invalid tutorialChoice and tutorialStep in case Settings/Tutorial Step is corrupted
    return (isNaN(choice) ? 0 : choice) as keyof typeof TUTORIAL_CONTEXT1_PARENT
  })

  const tutorialStepProps = {
    cursor,
    tutorialChoice,
    rootChildren,
    contextViews,
    dispatch,
    key: Math.floor(tutorialStep),
  }

  const tutorialStepComponent =
    TutorialStepComponentMap[Math.floor(tutorialStep) as keyof typeof TutorialStepComponentMap]

  const gesture = once(
    () =>
      ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
      tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT
        ? shortcutById('newThought')?.gesture
        : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT
          ? shortcutById('newSubthought')?.gesture
          : tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
            ? shortcutById('toggleContextView')?.gesture
            : null) || null) as GesturePath | null, // Why does it add 'string' to the type union without this?
  )

  const cursorHeadValue = useSelector(state => state.cursor && headValue(state, state.cursor))
  return (
    <div className='tutorial'>
      <div className='tutorial-inner'>
        <a
          className='upper-right tutorial-skip text-small'
          style={{
            visibility:
              tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden',
          }}
          {...fastClick(() => dispatch(tutorial({ value: false })))}
        >
          ✕ close tutorial
        </a>
        <div className='clear'>
          <div className='tutorial-text'>
            <TransitionGroup>
              {tutorialStepComponent ? (
                <WithCSSTransition component={tutorialStepComponent} {...tutorialStepProps} />
              ) : (
                <p>
                  Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.
                </p>
              )}
            </TransitionGroup>
          </div>
          <TutorialNavigation tutorialStep={tutorialStep} />
        </div>

        {isTouch &&
        (tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
          tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
          tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
          (tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT &&
            cursor &&
            cursorHeadValue &&
            cursorHeadValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
          (tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT &&
            cursor &&
            cursorHeadValue &&
            cursorHeadValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) ||
          (tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT &&
            cursor &&
            cursorHeadValue &&
            cursorHeadValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
          (tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT &&
            cursor &&
            cursorHeadValue &&
            cursorHeadValue.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) ||
          (tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT &&
            cursor &&
            cursorHeadValue &&
            cursorHeadValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())) &&
        gesture() ? (
          <div className='tutorial-trace-gesture'>
            <GestureDiagram path={gesture()!} size={160} strokeWidth={10} arrowSize={5} className='animate-pulse' />
          </div>
        ) : null}
      </div>
    </div>
  )
}

const TutorialMemo = React.memo(Tutorial)
TutorialMemo.displayName = 'Tutorial'

export default TutorialMemo
