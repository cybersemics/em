import Thunk from '../@types/Thunk'

/** Action-creator for newSubthought. */
const newSubthoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'newSubthought' })

export default newSubthoughtActionCreator
