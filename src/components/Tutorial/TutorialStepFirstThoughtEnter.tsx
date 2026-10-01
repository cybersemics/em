import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import useEditorSelector from '../../hooks/useEditorSelector'
import headValue from '../../util/headValue'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThoughtEnter = () => {
  const noCursor = useSelector(state => !state.cursor)
  const cursorValue = useEditorSelector(state => (state.cursor ? headValue(state, state.cursor) : ''))
  return (
    <>
      <p>{cursorValue === 'Anything' ? 'Well, you took that quite literally.' : 'You did it!'}</p>
      {noCursor || cursorValue ? (
        <p>{isTouch ? 'Tap' : 'Click'} the Next button when you are ready to continue.</p>
      ) : (
        <p>Now type something. Anything will do.</p>
      )}
    </>
  )
}

export default TutorialStepFirstThoughtEnter
