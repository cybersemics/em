import { useContext } from 'react'
import EditorContext from '../stores/EditorContext'

/** Reads the editor's captured document/UI context and command interface. */
const useEditorStore = () => {
  const store = useContext(EditorContext)
  if (!store) throw new Error('Editor reads require an EditorContext provider')
  return store
}

export default useEditorStore
