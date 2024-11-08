interface Key {
  /** Mac: Option, Windows: Alt. */
  alt?: boolean
  control?: boolean
  key: string
  /** Mac: Command, Windows: Control. */
  meta?: boolean
  shift?: boolean
}

export default Key
