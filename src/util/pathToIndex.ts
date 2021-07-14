import { Path } from '../@types'
import { pathToContext } from './pathToContext'

/** Converts a path to a '.'-delimited key that can be passed to _.get. */
export const pathToIndex = (path: Path) => pathToContext(path).reduce((acc, value) => acc + '.' + value, '')
