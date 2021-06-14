import _ from 'lodash'

/** An object with methods whose first arguments are the same. */
type ObjectWithInstanceMethods<T = any, U = any>= {
  [Key in keyof T]: (first: U, ...args: any) => any
}

/** Removes the first item in an array type. */
type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never;

/** Removes the first parameter from each method on an object. */
type MethodMapTail<T extends { [Key in keyof T]: (first: any, ...args: any) => any }>= {
  [Key in keyof T]: (...args: Tail<Parameters<T[Key]>>) => ReturnType<T[Key]>
}

/** Wraps a collection of driver-specific test helpers.
 * @example

  const { click, press, type } = testDriver({ click, press, type })

  ...

  it('test', () => {
    await press('Enter')
    await type('Hello')
  })

 **/
// const testDriver = <Device, K extends string, T extends any[], R>(helpers: { [K]: (device: Device, ...args: T) => R }) => {
const testDriver = <T extends ObjectWithInstanceMethods>(helpers: { [Key in keyof T]: T[Key] }) => {

  type Device = Parameters<T[keyof T]>[0]
  const ref = {} as { current: Device }

  // partially apply the driver to each of the helpers
  // get the current device at call-time
  const helpersWithDriver = (Object.keys(helpers) as Array<keyof T>)
    .reduce((accum, key) => ({
      ...accum,
      [key]: (...args: Parameters<T[typeof key]>) => helpers[key](ref.current, ...args)
    }), {} as MethodMapTail<typeof helpers>)

  return { ...helpersWithDriver, ref }
}

// type return type
// type FakeDevice = { __type: 'FakeDevice' }
// const helpers = testDriver({
//   tapReturn: (device: FakeDevice) => 'a',
//   type: (device: FakeDevice, text: string) => true,
//   wait: (device: FakeDevice, element: number, options: { timeout?: number } = {}) => true,
// })
// const helpersExpected: {
//   ref: { current: FakeDevice },
//   tapReturn: () => string,
//   type: (text: string) => boolean,
//   wait: (element: number, options: { timeout?: number }) => boolean,
// } = helpers
// helpers.wait(1)
// helpers.wait(1, { timeout: 1000 })

export default testDriver
