interface Options<Device, SetupArgs extends any[] = any> {
  setup?: (...args: SetupArgs) => Promise<Device>,
  teardown?: (device: Device) => void,
}

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
 * const { click, press, type } = testDriver({ click, press, type })
 *
 * it('test', () => {
 * await press('Enter')
 * await type('Hello')
 * })
 *
 **/
const testDriver = <HelperObject extends ObjectWithInstanceMethods>(helpers: { [Key in keyof HelperObject]: HelperObject[Key] }, options: Options<Parameters<HelperObject[keyof HelperObject]>[0]> = {}) => {

  type Device = Parameters<HelperObject[keyof HelperObject]>[0]
  const ref = {} as { current: Device }

  // partially apply the driver to each of the helpers
  // get the current device at call-time
  const helpersWithDriver = (Object.keys(helpers) as (keyof HelperObject)[])
    .reduce((accum, key) => ({
      ...accum,
      [key]: (...args: Parameters<HelperObject[typeof key]>) => helpers[key](ref.current, ...args)
    }), {} as MethodMapTail<typeof helpers>)

  /** Setup and teardown the ref. */
  const setup = <SetupArgs extends any[]>(...args: SetupArgs) => {
    if (options.setup) {
      beforeEach(async () => {
        ref.current = await options.setup?.(...args)
      })
    }
    if (options.teardown) {
      afterEach(async () => {
        await options.teardown?.(ref.current)
      })
    }
  }

  return {
    ...helpersWithDriver,
    ref,
    setup,
  }
}

// TYPE TEST
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
