import * as shortcuts from '../shortcuts/index'

type ShortcutSimple = keyof typeof shortcuts
type ShortcutAlias = `${ShortcutSimple}Alias`
type ShortcutId = ShortcutSimple | ShortcutAlias

export default ShortcutId
