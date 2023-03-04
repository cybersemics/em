import React from 'react'
import { useSelector } from 'react-redux'
import State from '../../@types/State'
import { isMac, isTouch } from '../../browser'
import headValue from '../../util/headValue'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThought = () => {
  const headCursorValue = useSelector((state: State) => state.cursor && headValue(state, state.cursor))
  const deleteBlank = useSelector((state: State) => state.cursor && headCursorValue === '')
  const noCursor = useSelector((state: State) => !state.cursor)
  return (
    <>
      <p>
        Now I am going to show you how to add a thought <i>within</i> another thought.
      </p>
      {deleteBlank ? <p>Hit the Delete key to delete the current blank thought. It's not needed right now.</p> : null}
      {noCursor ? (
        <p>{isTouch ? 'Tap' : 'Click'} a thought to select it.</p>
      ) : (
        <p>
          {isTouch
            ? 'Trace the line below'
            : `${!noCursor && headCursorValue === '' ? 'Then h' : 'H'}old the ${
                isMac ? 'Command' : 'Ctrl'
              } key and hit the Enter key`}
          .
        </p>
      )}
    </>
  )
}

export default TutorialStepSubThought
