const roots = new WeakSet<HTMLElement>()

/** Tracks editables whose canonical HTML is intentionally deferred while Android owns a native selection range. */
const deferredHtml = {
  /** Marks an editable as waiting for canonical HTML reconciliation. */
  mark: (root: HTMLElement): void => {
    roots.add(root)
  },
  /** Clears an editable after reconciliation or browser input supersedes the pending value. */
  clear: (root: HTMLElement): void => {
    roots.delete(root)
  },
  /** Returns true when an editable is waiting for canonical HTML reconciliation. */
  has: (root: HTMLElement): boolean => roots.has(root),
}

export default deferredHtml
