import React, { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../../styled-system/css'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { isTouch } from '../../browser'
import { commandById } from '../../commands'
import { TUTORIAL2_STEP_SUCCESS, TUTORIAL_STEP_SUCCESS } from '../../constants'
import useIsVisible from '../../hooks/useIsVisible'
import getSetting from '../../selectors/getSetting'
import fastClick from '../../util/fastClick'
import SlideTransition from '../SlideTransition'
import { TutorialGesturePortal } from './TutorialGestureDiagram'
import TutorialNavigation from './TutorialNavigation'
import TutorialScrollUpButton from './TutorialScrollUpButton'
import TutorialStepComponentMap from './TutorialStepComponentMap'

/** Wrap a component in a slide CSS transition. */
const WithCSSTransition = ({ component, transitionKey }: { component: FC; transitionKey: string }) => {
  const nodeRef = useRef(null)

  const Component = component
  return (
    <SlideTransition duration='fast' nodeRef={nodeRef} in={true} id={transitionKey} from='screenRight'>
      <div ref={nodeRef}>
        <Component />
      </div>
    </SlideTransition>
  )
}

// assert shortcut at load time
const newThoughtShortcut = commandById('newThought')
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

  const tutorialStepComponent =
    TutorialStepComponentMap[Math.floor(tutorialStep) as keyof typeof TutorialStepComponentMap]

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
          <div data-testid='tutorial-step'>
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

        {isTouch && <TutorialGesturePortal />}
      </div>
      <TutorialScrollUpButton show={!isVisible} />
    </div>
  )
}

const TutorialMemo = React.memo(Tutorial)
TutorialMemo.displayName = 'Tutorial'

export default TutorialMemo
