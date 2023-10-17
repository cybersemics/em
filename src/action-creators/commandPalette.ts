import Thunk from '../@types/Thunk'

/** Action-creator for commandPalette. */
const commandPaletteActionCreator = (): Thunk => dispatch => dispatch({ type: 'commandPalette' })

export default commandPaletteActionCreator
