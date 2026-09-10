import { useContext } from 'react'
import CommandUniverseContext from '../components/CommandUniverse/CommandUniverseContext'

/** Reads the existing navigator. Calling this hook does not create another history. */
const useCommandUniverseNavigator = () => {
  const navigator = useContext(CommandUniverseContext)
  if (!navigator) throw new Error('Command Universe navigation requires a CommandUniverseProvider.')
  return navigator
}

export default useCommandUniverseNavigator
