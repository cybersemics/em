import 'react-native-get-random-values'
import { nanoid } from 'nanoid'
import { ThoughtId } from '../@types'
import globals from '../globals'

// autoincrement for debugging
let n = 0

/** Creates uuid. */
export const createId = () => (globals.debugIds ? (n++).toString() : nanoid()) as ThoughtId
