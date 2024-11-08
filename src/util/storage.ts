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

/** An interaface that defines how to encode/decode a strongly typed value from storage. */
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
