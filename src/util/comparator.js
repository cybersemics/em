
import { lower } from './lower.js'
import { isFunction } from './isFunction.js'

export const isGreater = (a, b, key) => {
  return lower(a[key]) > lower(b[key])
}

export const isSmaller = (a, b, key) => {
  return (key === 'value' && isFunction(a[key])) || lower(a[key]) < lower(b[key])
}
