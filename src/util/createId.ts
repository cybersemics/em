import 'react-native-get-random-values'
import { nanoid } from 'nanoid'
import ThoughtId from '../@types/ThoughtId'
import globals from '../globals'

// autoincrement for debugging
let n = 0

/** Creates uuid. */
const createId = () => (globals.debugIds ? (n++).toString() : nanoid()) as ThoughtId

export default createId
