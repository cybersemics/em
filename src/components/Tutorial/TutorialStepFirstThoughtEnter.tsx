import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import headValue from '../../util/headValue'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThoughtEnter = () => {
  const ready = useSelector(state => !state.cursor || headValue(state, state.cursor).length > 0)
  return (
    <>
      <p>You did it!</p>
      {ready ? (
        <p>{isTouch ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
      ) : (
        <p>Now type something. Anything will do.</p>
      )}
    </>
  )
}

export default TutorialStepFirstThoughtEnter
