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
const model = <T extends string, U extends string | number | boolean>({
  defaults,
  decoders,
  encoders,
}: {
  defaults: Record<T, U>
  decoders: Partial<Record<T, (s: string | null) => U>>
  encoders: Partial<Record<T, (value: U) => string>>
}) => {
  type StorageKey = keyof typeof defaults
  type KeyType<T extends StorageKey> = typeof defaults[T]

  /** Gets a value from local storage. */
  function get<T extends StorageKey>(key: T): KeyType<T> {
    const value = storage.getItem(key)
    const decoder = decoders[key]
    return decoder ? decoder(value) : (value as unknown as KeyType<T>) || defaults[key]
  }

  /** Sets a value in local storage. */
  function set<T extends StorageKey>(key: T, value: KeyType<T>) {
    const encode = encoders[key]
    storage.setItem(key, encode ? encode(value) : value.toString())
  }

  /** Removes a value from local storage. */
  function remove(key: StorageKey) {
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
