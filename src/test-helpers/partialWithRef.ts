type Ref<T> = { current?: T }

/** An object with methods whose first arguments are the same. */
type ObjectWithInstanceMethods<T = any, U = any>= {
  [Key in keyof T]: (first: U, ...args: any) => any
}

/** Removes the first item in an array type. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never;

/** Removes the first parameter from each method on an object. */
type MethodMapTail<T extends { [Key in keyof T]: (first: any, ...args: any) => any }>= {
  [Key in keyof T]: (...args: Tail<Parameters<T[Key]>>) => ReturnType<T[Key]>
}

/** Wraps a collection of driver-specific test helpers.
 *
 * @example
 *
 * const { click, press, type } = partialWithRef(ref, { click, press, type })
 *
 * it('test', () => {
 * await press('Enter')
 * await type('Hello')
 * })
 *
 **/
const partialWithRef = <HelperObject extends ObjectWithInstanceMethods>(ref: Ref<Parameters<HelperObject[keyof HelperObject]>[0]>, helpers: { [Key in keyof HelperObject]: HelperObject[Key] }) => {

  // partially apply the driver to each of the helpers
  // get the current device at call-time
  return (Object.keys(helpers) as (keyof HelperObject)[])
    .reduce((accum, key) => ({
      ...accum,
      [key]: (...args: Parameters<HelperObject[typeof key]>) => helpers[key](ref.current!, ...args)
    }), {} as MethodMapTail<typeof helpers>)
}

// TYPE TEST
// type FakeDevice = { __type: 'FakeDevice' }
// const ref = {} as { current?: FakeDevice }
// const helpers = partialWithRef(ref, {
//   tapReturn: (device: FakeDevice) => 'a',
//   type: (device: FakeDevice, text: string) => true,
//   wait: (device: FakeDevice, element: number, options: { timeout?: number } = {}) => true,
// })
// const helpersExpected: {
//   tapReturn: () => string,
//   type: (text: string) => boolean,
//   wait: (element: number, options: { timeout?: number }) => boolean,
// } = helpers
// helpers.wait(1)
// helpers.wait(1, { timeout: 1000 })

export default partialWithRef
