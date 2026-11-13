import reactMinistore from './react-ministore'

/** Whether the find bar is open (see FindBar). Opened by the Find command, and closed by the find bar itself. */
const findBarStore = reactMinistore<{ open: boolean }>({ open: false })

export default findBarStore
