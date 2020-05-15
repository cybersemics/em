import { pathToContext } from './pathToContext'

// eslint-disable-next-line jsdoc/require-jsdoc
export const pathToIndex = path => pathToContext(path).reduce((acc, value) => acc + '.' + value, '')
