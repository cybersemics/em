import _ from 'lodash'
import { RefObject } from 'react'
import { Index } from '../types'

/** Wraps a collection of driver-specific test helpers
 * @example

  const { click, press, type } = testDriver(pageRef, { click, press, type })

  ...

  it('test', () => {
    await press('Enter')
    await type('Hello')
  })

 **/
const testDriver = <Device, T extends any[], R>(device: RefObject<Device>, helpers: Index<(device: Device, ...args: T) => R>): Index<(...args: T) => R> => {

  /** Partially apply the device in the ref as the first argument to the helper functions. Gets the current device from the ref object at call time. */
  const withDriver = (f: (device: Device, ...args: T) => R): (...args: T) => R =>
    (...args: T) => f(device.current!, ...args)

  // partially apply the driver to each of the helpers
  return _.transform(helpers, (accum: Index<(...args: T) => R>, value, key) => {
    accum[key] = withDriver(helpers[key])
  })
}

export default testDriver
