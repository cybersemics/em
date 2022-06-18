import Thunk from '../@types/Thunk'

/** Action-creator for newGrandChild. */
const newGrandChildActionCreator = (): Thunk => dispatch => dispatch({ type: 'newGrandChild' })

export default newGrandChildActionCreator
