import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import ellipsize from '../../util/ellipsize'
import headValue from '../../util/headValue'
import parentOf from '../../util/parentOf'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThoughtEnter = () => {
  const nonRoot = useSelector(state => state.cursor && state.cursor.length > 1)
  const cursorValue = useSelector(state => (state.cursor ? headValue(state, state.cursor) : null))
  const cursorParentValue = useSelector(state =>
    state.cursor && nonRoot ? headValue(state, parentOf(state.cursor)) : null,
  )
  const isEmpty = useSelector(state => state.cursor && cursorValue!.length === 0)

  return (
    <>
      <p>
        As you can see{isTouch ? ' (if you scroll down)' : ''}, the new thought
        {nonRoot && cursorValue!.length > 0 ? <> "{ellipsize(cursorValue!)}"</> : null} is nested <i>within</i>{' '}
        {nonRoot ? <>"{ellipsize(cursorParentValue!)}"</> : 'the other thought'}. This is useful for using a thought as
        a category, for example, but the exact meaning is up to you.
      </p>
      <p>You can create thoughts within thoughts within thoughts. There is no limit.</p>
      {!isEmpty ? (
        <p>Click the Next button when you are ready to continue.</p>
      ) : (
        <p>Feel free to type some text for the new thought.</p>
      )}
    </>
  )
}

export default TutorialStepSubThoughtEnter
