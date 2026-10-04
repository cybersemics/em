import { createContext } from 'react'

/** The Formatting Bar's portal layers and actual icon dimensions, shared by its dedicated pickers. */
const FormattingBarContext = createContext<{
  container?: HTMLElement | null
  backdropContainer?: HTMLElement | null
  iconSize: number
}>({ iconSize: 20 })

export default FormattingBarContext
