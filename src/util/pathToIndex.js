import { pathToContext } from './pathToContext'

export const pathToIndex = path => pathToContext(path).reduce((acc, value) => acc + '.' + value, '')
