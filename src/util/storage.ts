/**
 * The most characters stored under one localStorage key. A longer value is stored in slices of up to this length.
 *
 * WebKit keeps a localStorage value of up to 1 KB in the memory of its network process. To overwrite or remove a
 * larger one, it reads the old value back from its SQLite database with a statement that it leaves open, which blocks
 * every checkpoint of the database's write-ahead log until the database is next opened. Every later write then grows
 * the log, for as long as the app stays open (#6156). 512 characters are at most 1 KB however WebKit stores them: one
 * byte per character of Latin-1 text, two otherwise.
 */
const SLICE_LENGTH = 512

/** Begins the header that a sliced value's key holds in place of the value: the number of slices and a hash of the whole value. A control character, so no stored value begins with it. Also separates a slice's index from the key in the slice's own key. */
const SLICED = '\u001F'

/** Returns the localStorage key of a slice of a sliced value. */
const sliceKey = (key: string, index: number) => `${key}${SLICED}${index}`

/** Returns a 32-bit FNV-1a hash of a string in hex. Tells a whole value apart from slices that a crash left half-written. */
const hash = (s: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** Parses the header of a sliced value, or returns null for a value stored whole under its key. */
const parseHeader = (stored: string | null): { count: number; hash: string } | null => {
  if (!stored?.startsWith(SLICED)) return null
  const [count, valueHash] = stored.slice(SLICED.length).split(':')
  return { count: +count, hash: valueHash }
}

/** Removes the slices of a value from the given index up to, but not including, the given count. */
const removeSlices = (key: string, from: number, count: number) => {
  for (let i = from; i < count; i++) {
    localStorage.removeItem(sliceKey(key, i))
  }
}

/** Clear local storage. */
const clear = () => localStorage.clear()

/** Removes an item from local storage, with its slices. */
const removeItem = (key: string) => {
  removeSlices(key, 0, parseHeader(localStorage.getItem(key))?.count ?? 0)
  localStorage.removeItem(key)
}

/** Sets an item on local storage. A value longer than SLICE_LENGTH is stored in slices. */
const setItem = (key: string, value: string) => {
  const countOld = parseHeader(localStorage.getItem(key))?.count ?? 0

  if (value.length <= SLICE_LENGTH && !value.startsWith(SLICED)) {
    localStorage.setItem(key, value)
    // The slices of a long value it replaces are removed after it is written. A crash in between leaves them behind,
    // which only takes up space, where removing them first could lose the value.
    removeSlices(key, 0, countOld)
    return
  }

  const count = Math.ceil(value.length / SLICE_LENGTH)
  for (let i = 0; i < count; i++) {
    const slice = value.slice(i * SLICE_LENGTH, (i + 1) * SLICE_LENGTH)
    // Only a slice that changed is written, so that appending to a long value, as the Debug Log does with every entry,
    // rewrites only its last slices.
    if (localStorage.getItem(sliceKey(key, i)) !== slice) {
      localStorage.setItem(sliceKey(key, i), slice)
    }
  }
  // The header is written after the slices, so that a crash partway leaves slices that do not match its hash, which
  // read as no value rather than as a mix of two values.
  localStorage.setItem(key, `${SLICED}${count}:${hash(value)}`)
  removeSlices(key, count, countOld)
}

/** Reads an item from local storage, joining its slices if it is stored in slices. Returns null for a value whose slices do not match its header. */
const read = (key: string): string | null => {
  const stored = localStorage.getItem(key)
  const header = parseHeader(stored)
  if (!header) return stored

  const slices = Array.from({ length: header.count }, (_, i) => localStorage.getItem(sliceKey(key, i)))
  if (slices.some(slice => slice === null)) return null
  const value = slices.join('')
  return hash(value) === header.hash ? value : null
}

function getItem(key: string): string | null
function getItem(key: string, defaultValue: string | (() => string)): string
/** Gets the item from local storage. If it does not exist and defaultValue is provided, sets the value in local storage to defaultValue and returns it. */
function getItem(key: string, defaultValue?: string | (() => string)) {
  let value = read(key)
  if (value === null && defaultValue !== undefined) {
    value = typeof defaultValue === 'function' ? defaultValue() : defaultValue
    setItem(key, value)
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
