import { createContext } from 'react'
import EditorStore from '../@types/EditorStore'

/** Captured editor reads and commands, independent of the Redux-only UI store. */
const EditorContext = createContext<Pick<EditorStore, 'getState' | 'subscribe' | 'dispatch'> | null>(null)

export default EditorContext
