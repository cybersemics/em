import { createContext } from 'react'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'

/** Access to the navigator owned by the nearest Command Universe session. */
const CommandUniverseContext = createContext<CommandUniversePageNavigator | null>(null)

export default CommandUniverseContext
