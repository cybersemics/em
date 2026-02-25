import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { isTouch } from '../../browser'
import { gestureString } from '../../commands'
import newThoughtCommand from '../../commands/newThought'
import headValue from '../../util/headValue'
import GestureDiagram from '../GestureDiagram'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSecondThoughtEnter = () => {
  const ready = useSelector(state => {
    if (!state.cursor) return true
    const headCursorValue = headValue(state, state.cursor)
    return headCursorValue !== undefined && headCursorValue.length > 0
  })

  return (
    <>
      <p>Good work!</p>
      <p>
        {isTouch ? (
          <>
            Swiping{' '}
            <GestureDiagram
              path={gestureString(newThoughtCommand)}
              size={28}
              cssRaw={css.raw({ margin: '-10px -4px -6px' })}
            />
          </>
        ) : (
          'Hitting Enter'
        )}{' '}
        will always create a new thought <i>after</i> the currently selected thought.
      </p>
      {ready ? (
        <p>Wonderful. Click the Next button when you are ready to continue.</p>
      ) : (
        <p>Now type some text for the new thought.</p>
      )}
    </>
  )
}

export default TutorialStepSecondThoughtEnter
