import { isTouch } from '../../browser'
import newThoughtCommand from '../../commands/newThought'
import TutorialGestureDiagram from './TutorialGestureDiagram'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThought = () => {
  return (
    <>
      <p>
        First, let me show you how to create a new thought in <b>em</b> using a{' '}
        {isTouch ? 'gesture' : 'keyboard shortcut'}. Just follow the instructions; this tutorial will stay open.
      </p>
      <p>{isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.</p>
      <TutorialGestureDiagram gesture={newThoughtCommand.gesture} />
    </>
  )
}

export default TutorialStepFirstThought
