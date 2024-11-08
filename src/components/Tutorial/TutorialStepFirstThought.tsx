import { isTouch } from '../../browser'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThought = () => (
  <>
    <p>
      First, let me show you how to create a new thought in <b>em</b> using a{' '}
      {isTouch ? 'gesture' : 'keyboard shortcut'}. Just follow the instructions; this tutorial will stay open.
    </p>
    <p>{isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.</p>
  </>
)

export default TutorialStepFirstThought
