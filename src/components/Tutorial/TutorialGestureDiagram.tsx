import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import Command from '../../@types/Command'
import GesturePath from '../../@types/GesturePath'
import GestureDiagram from '../GestureDiagram'

/** A portal for conditionally rendering Gesture hints. Used to show an appropriate gesture  below the tutorial UI up top, thus Portal. */
const TutorialGestureDiagram = ({ gesture }: { gesture: Command['gesture'] }) => {
  const target = document.getElementById('tutorial-gesture-diagram-portal')

  return (
    gesture &&
    target &&
    createPortal(
      <GestureDiagram
        path={gesture as GesturePath}
        size={160}
        strokeWidth={10}
        arrowSize={5}
        cssRaw={css.raw({ animation: 'pulse 1s infinite alternate' })}
      />,
      target,
    )
  )
}

export default TutorialGestureDiagram
