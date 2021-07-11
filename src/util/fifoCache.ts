import DoublyLinkedList from 'yallist'

/** A very simple LIFO cache that maintains a unique list of keys, removing keys on add that have exceeded max size. */
const lifoCache = <T>(max: number) => {
  // keep a time-ordered doubly linked list
  const list = new DoublyLinkedList<T>()

  // map keys to nodes in the list
  const map = new Map<T, DoublyLinkedList.Node<T>>()

  /** Adds a new key to the cache, or updates it if it exists. */
  const add = (key: T) => {
    // if exists, bump to top
    if (map.has(key)) {
      const node = map.get(key)
      list.unshiftNode(node!)
    }
    // otherwise insert
    else {
      // eslint-disable-next-line fp/no-mutating-methods
      list.unshift(key)
      map.set(key, list.head!)
    }

    // delete and return the oldest node if cache size has been exceeded
    if (list.length > max) {
      const last = list.tail!
      map.delete(last.value)
      list.removeNode(last)
      return last.value
    }
    return null
  }

  /** Adds multiple keys to the cache and returns a list of deleted keys. Calls add in order. */
  const addMany = (keys: T[]): T[] => {
    const deleted = keys.map(add)
    return deleted.filter(x => x) as T[]
  }

  return {
    add,
    addMany,
    length: () => list.length,
    oldest: () => list.tail,
    newest: () => list.head,
    toArray: list.toArray,
  }
}

export default lifoCache
