/** Clear local storage. */
const clear = () => localStorage.clear()

/** Removes an item from local storage. */
const removeItem = (key: string) => localStorage.removeItem(key)

/** Sets an item on local storage. */
const setItem = (key: string, value: string) => localStorage.setItem(key, value)

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

/** Creates a strongly typed local storage model. Guarantees well-typed keys and values of storage items. */
const model = <
  K extends string,
  V extends string | number | boolean,
  // define a wrapper type for the optional default argument
  // this allows us to change the return type of get when default is not provided
  OptionalDefault extends { default: V } | Record<string, never>,
>(
  schema: Record<
    K,
    /** The default value that is returned by get if local storage is empty. */
    OptionalDefault & {
      /** Decodes a string stored in local storage back into a properly typed value. Default: identify function. */
      decode?: (s: string | null) => V | undefined
      /** Encodes a value as a string to be saved to local storage. Default: toString. */
      encode?: (value: V) => string
    }
  >,
) => {
  // undefined if no default arg is given
  type UndefinedIfDefault = OptionalDefault extends { default: V } ? never : undefined

  /** Gets a value from local storage. */
  function get<T extends K>(key: T): V | UndefinedIfDefault {
    const value = getItem(key)
    const decode = schema[key].decode
    return (decode ? decode(value) : (value as V | UndefinedIfDefault)) || schema[key].default
  }

  /** Sets a value in local storage. */
  function set<T extends K>(key: T, value: V) {
    const encode = schema[key].encode
    setItem(key, encode ? encode(value) : value.toString())
  }

  /** Removes a value from local storage. */
  const remove = (key: K) => removeItem(key)

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
