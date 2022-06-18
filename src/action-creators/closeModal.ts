import Thunk from '../@types/Thunk'

/** Action-creator for closeModal. */
const closeModalActionCreator = (): Thunk => dispatch => dispatch({ type: 'closeModal' })

export default closeModalActionCreator
