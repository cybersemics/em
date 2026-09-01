interface Key {
  /** Mac: Option, Windows: Alt. */
  alt?: boolean
  /** Mac: Control, Windows: Shift (Ctrl is already the meta modifier on Windows). */
  control?: boolean
  key: string
  /** Mac: Command, Windows: Control. */
  meta?: boolean
  shift?: boolean
}

export default Key
