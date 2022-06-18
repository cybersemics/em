import Thunk from '../@types/Thunk'

/** Action-creator for splitSentences. */
const splitSentencesActionCreator = (): Thunk => dispatch => dispatch({ type: 'splitSentences' })

export default splitSentencesActionCreator
