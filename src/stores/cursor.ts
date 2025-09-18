import reactMinistore from './react-ministore'

/** A store that tracks the current cursor path as a string to avoid ministore array handling issues - it saves path as hash. */
const cursorStore = reactMinistore<string | null>(null)

export default cursorStore
