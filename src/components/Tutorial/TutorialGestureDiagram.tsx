import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import Command from '../../@types/Command'
import GesturePath from '../../@types/GesturePath'
import GestureDiagram from '../GestureDiagram'

/** During the totirla, a portal is used for rendering gestures on top of the thought space. It's the ID for the portal element. */
const TUTORIAL_GESTURE_PORTAL_DOM_ID = 'tutorial-gesture-diagram-portal'

/** A portal for conditionally rendering Gesture hints. Used to show an appropriate gesture  below the tutorial UI up top, thus Portal. */
const TutorialGestureDiagram = ({ gesture }: { gesture: Command['gesture'] }) => {
  const target = document.getElementById(TUTORIAL_GESTURE_PORTAL_DOM_ID)

  return (
    gesture &&
    target &&
    createPortal(
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
          path={gesture as GesturePath}
          size={160}
          strokeWidth={10}
          arrowSize={5}
          cssRaw={css.raw({ animation: 'pulse 1s infinite alternate' })}
        />
      </div>,
      target,
    )
  )
}

/** The element that serves as the portal target for the TutorialGestureDiagram. */
export const TutorialGesturePortal = () => {
  return <div id={TUTORIAL_GESTURE_PORTAL_DOM_ID} className={css({ display: 'contents' })} />
}

export default TutorialGestureDiagram
