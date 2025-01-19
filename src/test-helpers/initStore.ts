import clearStore from './clearStore'
import skipTutorialHelper from './skipTutorial'

interface Params {
  persist?: boolean
  allowTutorial?: boolean
}

/**
 * Initializes the store. Defaults to clearing the store and skipping the tutorial.
 */
const initStore = ({ persist, allowTutorial }: Params = {}) => {
  if (!persist) clearStore()

  if (!allowTutorial) skipTutorialHelper()
}

export default initStore
