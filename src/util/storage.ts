function getItem(key: string): string | null
function getItem(key: string, defaultValue: string | (() => string)): string

/** Gets the item from local storage. If it does not exist and defaultValue is provided, sets the value in local storage to defaultValue and returns it. */
function getItem(key: string, defaultValue?: string | (() => string)) {
  let value = localStorage.getItem(key)
  if (value === null && defaultValue !== undefined) {
    value = typeof defaultValue === 'function' ? defaultValue() : defaultValue
    localStorage.setItem(key, value)
  }
  return value
}

/** Creates a strongly typed local storage model. */
const model = <K extends string, V extends string | number | boolean>(
  schema: Record<
    K,
    {
      /** The default value that is returned by get if local storage is empty. */
      default: V
      /** Decodes a string stored in local storage back into a properly typed value. Default: identify function. */
      decode?: (s: string | null) => V | undefined
      /** Encodes a value as a string to be saved to local storage. Default: toString. */
      encode?: (value: V) => string
    }
  >,
) => {
  /** Gets a value from local storage. */
  function get<T extends K>(key: T): V {
    const value = storage.getItem(key)
    const decode = schema[key].decode
    return (decode ? decode(value) : (value as V)) || schema[key].default
  }

  /** Sets a value in local storage. */
  function set<T extends K>(key: T, value: V) {
    const encode = schema[key].encode
    storage.setItem(key, encode ? encode(value) : value.toString())
  }

  /** Removes a value from local storage. */
  function remove(key: K) {
    storage.removeItem(key)
  }

  return { get, set, remove }
}

const storage = {
  clear(): void {
    localStorage.clear()
  },

  getItem,

  removeItem(key: string): void {
    localStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  },

  model,
}

export default storage
