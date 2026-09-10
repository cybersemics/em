import { ComponentProps } from 'react'
import type commandUniversePages from '../components/CommandUniverse/commandUniversePages'

/** A registered page and its corresponding component props, derived from the registry. */
type CommandUniversePage = {
  [Id in keyof typeof commandUniversePages]: {
    pageId: Id
    props: ComponentProps<(typeof commandUniversePages)[Id]>
  }
}[keyof typeof commandUniversePages]

export default CommandUniversePage
