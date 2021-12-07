import 'react-native-get-random-values'
import { nanoid } from 'nanoid'
import { ThoughtId } from '../@types'

/** Creates uuid. */
export const createId = () => nanoid() as ThoughtId
