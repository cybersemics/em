type Ref<T> = { current?: T }

/** An object with methods whose first arguments are the same. */
type ObjectWithInstanceMethods<T = any, U = any> = {
  [Key in keyof T]: (first: U, ...args: any) => any
}

/** Removes the first item in an array type. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never

/** Removes the first parameter from each method on an object. */
type MethodMapTail<T extends { [Key in keyof T]: (first: any, ...args: any) => any }> = {
  [Key in keyof T]: (...args: Tail<Parameters<T[Key]>>) => ReturnType<T[Key]>
}

type ObjectParam<T extends ObjectWithInstanceMethods> = Parameters<T[keyof T]>[0]

/** Takes an object of instance methods and returns an object of the same methods with the current ref partially applied.
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
const partialWithRef = <T extends ObjectWithInstanceMethods>(
  ref: Ref<ObjectParam<T>>,
  helpers: { [Key in keyof T]: T[Key] },
) => {
  const keys = Object.keys(helpers) as (keyof T)[]

  if (keys.includes('ref')) {
    console.warn('partialWithRef: "ref" key is reserved')
  }

  // partially apply the driver to each of the helpers
  // get the current device at call-time
  const functions = keys.reduce(
    (accum, key) => ({
      ...accum,
      [key]: (...args: Parameters<T[typeof key]>) => helpers[key](ref.current!, ...args),
    }),
    {} as MethodMapTail<typeof helpers>,
  )

  return {
    ...functions,
    ref: () => ref.current!,
  }
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
