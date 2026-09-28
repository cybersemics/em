import _ from 'lodash'
import Thought from '../@types/Thought'
import ThoughtspaceView from '../@types/ThoughtspaceView'

/** Adds sparse editor overlays to a snapshot-bound document reader without copying its document index. */
const createThoughtspaceView = (
  source: Omit<ThoughtspaceView, 'overlays' | 'withOverlays'>,
  overlays: ThoughtspaceView['overlays'] = {},
): ThoughtspaceView => {
  const cached = new WeakMap<Thought, Thought>()
  /** Reuses decoded document objects, allocating a wrapper only for thoughts with editor overlays. */
  const getThought: ThoughtspaceView['getThought'] = id => {
    const thought = source.getThought(id)
    if (!thought || !overlays[id]) return thought
    let result = cached.get(thought)
    if (!result) {
      result = Object.freeze({ ...thought, ...overlays[id] })
      cached.set(thought, result)
    }
    return result
  }
  const view: ThoughtspaceView = {
    ...source,
    overlays,
    getThought,
    /** Iterates the captured document, not the current mutable engine. */
    *values() {
      for (const thought of source.values()) yield getThought(thought.id)!
    },
    /** Ignores document fields in editor updates and drops overlays when they are cleared. */
    withOverlays(updates) {
      const next = { ...overlays }
      Object.entries(updates).forEach(([id, thought]) => {
        const overlay = {
          ...(thought?.generating !== undefined && { generating: thought.generating }),
          ...(thought?.generating && thought.displayValue !== undefined && { displayValue: thought.displayValue }),
          ...(thought?.splitSource !== undefined && { splitSource: thought.splitSource }),
        }
        if (Object.keys(overlay).length) next[id] = overlay
        else delete next[id]
      })
      return _.isEqual(next, overlays) ? view : createThoughtspaceView(source, next)
    },
  }
  return view
}

export default createThoughtspaceView
