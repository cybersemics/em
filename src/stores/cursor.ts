import reactMinistore from './react-ministore'

// this store is used in useLongPress hook, which is used in dragAndDropThought component
// it is used to prevent multiple components from responding to long press simultaneously.
const ministore = reactMinistore({
  element: null as HTMLElement | null,
  x: 0,
  y: 0,
  treeNode: null as HTMLElement | null,
  thought: null as HTMLElement | null,
  thoughtAnnotation: null as HTMLElement | null,
  contextBreadcrumb: null as HTMLElement | null,
})

// Define the extended store type
type CursorStore = typeof ministore & {
  onChange: (state: {
    element?: HTMLElement | null
    x?: number
    y?: number
    treeNode?: HTMLElement | null
    thought?: HTMLElement | null
    thoughtAnnotation?: HTMLElement | null
    contextBreadcrumb?: HTMLElement | null
  }) => void
  clear: () => void
}

const cursorStore = ministore as CursorStore

// Add the methods
cursorStore.onChange = (state: {
  element?: HTMLElement | null
  x?: number
  y?: number
  treeNode?: HTMLElement | null
  thought?: HTMLElement | null
  thoughtAnnotation?: HTMLElement | null
  contextBreadcrumb?: HTMLElement | null
}) => {
  const oldState = ministore.getState()
  ministore.update({
    ...oldState,
    ...state,
  })
}
cursorStore.clear = () =>
  ministore.update({
    element: null,
    x: 0,
    y: 0,
    treeNode: null,
    thought: null,
    thoughtAnnotation: null,
    contextBreadcrumb: null,
  })

export default cursorStore
