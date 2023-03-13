import storage from '../util/storage'

type StorageKey = keyof typeof defaults
type KeyType<T extends StorageKey> = typeof defaults[T]

const defaults = {
  fontSize: 18,
}

const decoders: Record<StorageKey, (s: string | null) => any> = {
  fontSize: (s: string | null) => (s ? +s : 18),
}

const encoders: Partial<Record<StorageKey, (value: any) => string>> = {}

/** Gets a value from local storage. */
export function get<T extends StorageKey>(key: T): KeyType<T> {
  const value = storage.getItem(key)
  const decoder = decoders[key]
  return decoder ? decoder(value) : value
}

/** Sets a value in local storage. */
export function set<T extends StorageKey>(key: T, value: KeyType<T>) {
  const encode = encoders[key]
  storage.setItem(key, encode ? encode(value) : value.toString())
}

/** Removes a value from local storage. */
export function remove(key: StorageKey) {
  storage.removeItem(key)
}
