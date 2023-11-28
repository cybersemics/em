import GesturePath from '../@types/GesturePath'
import reactMinistore from './react-ministore'

// a ministore that tracks the current gesture sequence
const gestureStore = reactMinistore<GesturePath>('')

export default gestureStore
