import LearningState from '../@types/LearningState'
import State from '../@types/State'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Restores a validated, device-local pin and its practice records before the app renders. */
const hydrateLearning = (state: State, { learning }: { learning: LearningState }): State => ({
  ...state,
  learning,
})

export default hydrateLearning

registerActionMetadata('hydrateLearning', { undoable: false })
