import { ReactNode } from 'react'
import { Provider } from 'react-redux'
import EditorStore from '../@types/EditorStore'
import EditorContext from '../stores/EditorContext'

/** Supplies document-aware editor reads alongside the Redux UI store. */
const EditorProvider = ({ store, children }: { store: EditorStore; children?: ReactNode }) => (
  <EditorContext.Provider value={store}>
    <Provider store={store.uiStore}>{children}</Provider>
  </EditorContext.Provider>
)

export default EditorProvider
