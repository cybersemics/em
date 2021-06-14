/** Defines global keyboard shortcuts and gestures. */

import Emitter from 'emitter20'
import { keyValueBy } from './util/keyValueBy'
import { Index, Shortcut } from './types'

import * as shortcutObject from './shortcuts/index'
export const globalShortcuts = Object.values(shortcutObject) as Shortcut[]

export const shortcutEmitter = new Emitter()

/** Initializes shortcut indices and stores conflicts. */
const index = (): {
  shortcutIdIndex: Index<Shortcut>,
} => {

  // index shortcuts for O(1) lookup by id
  const shortcutIdIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.id ? { [shortcut.id]: shortcut } : null
  )

  return { shortcutIdIndex }
}

const { shortcutIdIndex } = index()

/** Finds a shortcut by its id. */
export const shortcutById = (id: string): Shortcut | null => shortcutIdIndex[id]
