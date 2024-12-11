import React, { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../../styled-system/css'
import GesturePath from '../../@types/GesturePath'
import State from '../../@types/State'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { isTouch } from '../../browser'
import {
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
import useIsVisible from '../../hooks/useIsVisible'
import getSetting from '../../selectors/getSetting'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'
import { shortcutById } from '../../commands'
import fastClick from '../../util/fastClick'
import headValue from '../../util/headValue'
import once from '../../util/once'
import GestureDiagram from '../GestureDiagram'
import SlideTransition from '../SlideTransition'
import TutorialNavigation from './TutorialNavigation'
import TutorialScrollUpButton from './TutorialScrollUpButton'
import TutorialStepComponentMap from './TutorialStepComponentMap'

/** Wrap a component in a slide CSS transition. */
const WithCSSTransition = ({ component, transitionKey }: { component: FC; transitionKey: string }) => {
  const nodeRef = useRef(null)

  const Component = component
  return (
    <SlideTransition duration='fastDuration' nodeRef={nodeRef} in={true} id={transitionKey} from='screenRight'>
      <div ref={nodeRef}>
        <Component />
      </div>
    </SlideTransition>
  )
}

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
if (!newThoughtShortcut) {
  throw new Error('newThought shortcut not found.')
}

/** Tutorial component. */
const Tutorial: FC = () => {
  const [isVisible, nextRef] = useIsVisible<HTMLAnchorElement>(true)
  const tutorialStep = useSelector(state => {
    const step = +(getSetting(state, 'Tutorial Step') || 1)
    return isNaN(step) ? 1 : step
  })

  const dispatch = useDispatch()
  const cursor = useSelector((state: State) => state.cursor)
  const tutorialChoice = useSelector(selectTutorialChoice)

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

  const gesturePath = gesture()

  return (
    <div
      className={css({
        padding: '40px 20px 20px',
        backgroundColor: 'tutorialBg',
        position: 'relative',
        zIndex: 'tutorial',
        color: 'fg',
        '& p': {
          marginTop: '20px',
          '&:first-child': { marginTop: '0' },
        },
      })}
    >
      <div className={css({ maxWidth: '32em', margin: '0 auto' })}>
        <a
          className={cx(
            css({
              position: 'absolute',
              color: 'bulletGray',
              top: '10px',
              right: '15px',
              fontSize: 'sm',
              visibility:
                tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS
                  ? 'visible'
                  : 'hidden',
            }),
          )}
          {...fastClick(() => {
            if (window.confirm('Do you really want to close the tutorial?')) {
              dispatch(tutorial({ value: false }))
            }
          })}
        >
          ✕ close tutorial
        </a>
        <div className={css({ clear: 'both' })}>
          <div>
            <TransitionGroup>
              {tutorialStepComponent ? (
                <WithCSSTransition
                  component={tutorialStepComponent}
                  transitionKey={Math.floor(tutorialStep).toString()}
                />
              ) : (
                <p>
                  Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.
                </p>
              )}
            </TransitionGroup>
          </div>
          <TutorialNavigation nextRef={nextRef} tutorialStep={tutorialStep} />
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
        gesturePath ? (
          <div
            className={css({
              position: 'absolute',
              marginTop: '50px',
              zIndex: 'tutorialTraceGesture',
              textAlign: 'center',
              left: 0,
              right: 0,
              backgroundColor: 'bgOverlay80',
              paddingBottom: '50px',
            })}
          >
            <GestureDiagram
              path={gesturePath}
              size={160}
              strokeWidth={10}
              arrowSize={5}
              cssRaw={css.raw({ animation: 'pulse 1s infinite alternate' })}
            />
          </div>
        ) : null}
      </div>
      <TutorialScrollUpButton show={!isVisible} />
    </div>
  )
}

const TutorialMemo = React.memo(Tutorial)
TutorialMemo.displayName = 'Tutorial'

export default TutorialMemo
