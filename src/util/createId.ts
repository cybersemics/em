import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { ThoughtId } from '../@types'

/** Creates uuid. */
export const createId = () => uuidv4() as ThoughtId
