interface Key {
  alt?: boolean // Mac: Option, Windows: Alt
  control?: boolean
  key: string
  meta?: boolean // Mac: Command, Windows: Control
  shift?: boolean
}

export default Key
