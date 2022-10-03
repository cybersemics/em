import Thunk from '../@types/Thunk'
import importSpeechToText from '../reducers/importSpeechToText'

/** Action-creator for importSpeechToText. */
const importSpeechToTextActionCreator =
  (payload: Parameters<typeof importSpeechToText>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'importSpeechToText', ...payload })

export default importSpeechToTextActionCreator
