import { pathToContext } from './pathToContext'
import { Path } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
export const pathToIndex = (path: Path) => pathToContext(path).reduce((acc, value) => acc + '.' + value, '')
