import GesturePath from '../@types/GesturePath'
import ministore from './ministore'

// a ministore that tracks the current gesture sequence
const gestureStore = ministore<GesturePath>('')

export default gestureStore
