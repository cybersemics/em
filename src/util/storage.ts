// /** Safely gets localStorage, with a fallback if it's not available (e.g., during test initialization). */
// const getLocalStorage = (): Storage => {
//   if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
//     return globalThis.localStorage
//   }
//   // Fallback: return a no-op storage implementation if localStorage is not available
//   // This can happen during module evaluation before test mocks are initialized
//   return {
//     clear: () => {},
//     getItem: () => null,
//     removeItem: () => {},
//     setItem: () => {},
//     key: () => null,
//     get length() {
//       return 0
//     },
//   } as Storage
// }

/** Clear local storage. */
const clear = () => globalThis.localStorage.clear()

/** Removes an item from local storage. */
const removeItem = (key: string) => globalThis.localStorage.removeItem(key)

/** Sets an item on local storage. */
const setItem = (key: string, value: string) => globalThis.localStorage.setItem(key, value)

function getItem(key: string): string | null
function getItem(key: string, defaultValue: string | (() => string)): string
/** Gets the item from local storage. If it does not exist and defaultValue is provided, sets the value in local storage to defaultValue and returns it. */
function getItem(key: string, defaultValue?: string | (() => string)) {
  const storage = globalThis.localStorage
  let value = storage.getItem(key)
  if (value === null && defaultValue !== undefined) {
    value = typeof defaultValue === 'function' ? defaultValue() : defaultValue
    storage.setItem(key, value)
  }
  return value
}

/** An interaface that defines how to encode/decode a strongly typed value from storage. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ModelSpec<T = any> {
  default?: T
  /** Decodes a string stored in local storage back into a properly typed value. Default: identify function. */
  decode?: (s: string | null) => T
  /** Encodes a value as a string to be saved to local storage. Default: toString. */
  encode?: (value: T) => string
}

/** Extracts the value type from ModelSpec. */
type ModelValue<M> = M extends ModelSpec<infer U> ? U : never

/** Creates a strongly typed local storage model. Guarantees well-typed keys and values of storage items. */
const model = <T extends { [key: string]: ModelSpec }>(schema: T) => {
  /** Gets a value from local storage. If the model does not define a default value, then this can return undefined. */
  function get<U extends keyof T & string>(
    key: U,
  ): T[U] extends { default: unknown } ? NonNullable<ModelValue<T[U]>> : ModelValue<T[U]> {
    const raw = getItem(key)
    if (!raw) return schema[key].default
    const decode = schema[key].decode || (typeof schema[key].default === 'string' ? x => x : JSON.parse)
    return decode(raw) ?? schema[key].default
  }

  /** Sets a value in local storage. */
  function set<U extends keyof T & string>(
    key: U,
    value: ModelValue<T[U]> | ((valueOld: NonNullable<ModelValue<T[U]>>) => NonNullable<ModelValue<T[U]>>),
  ): void {
    const valueOld = get(key)
    const valueNew =
      typeof value === 'function' ? (value as (valueOld: ModelValue<T[U]>) => ModelValue<T[U]>)(valueOld) : value
    const encode = schema[key].encode || (typeof valueOld === 'string' ? x => x : JSON.stringify)
    setItem(key.toString(), encode(valueNew))
  }

  /** Removes a value from local storage. */
  const remove = (key: keyof T) => removeItem(key.toString())

  return { get, set, remove }
}

const storage = {
  clear,
  getItem,
  model,
  removeItem,
  setItem,
}

export default storage
