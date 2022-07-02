import Thunk from '../@types/Thunk'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Creates a Promise resolver that delays by a logarithmically increasing amount of time. */
const logarithmicDelayResolver = () => {
  let retryRate = 1
  return (resolve: unknown) => {
    setTimeout(resolve, retryRate)

    // slows to 1s after about 72 retries (1.1 ^ 72 =~ 956)
    // this is tight enough to prevent any flash of the tutorial if clicking Skip Tutorial really fast, but still easy on performance
    retryRate *= 1.1
  }
}

/** Updates the tutorial. Waits for tutorial settings to load first. */
const tutorial =
  ({ value }: { value: boolean }): Thunk =>
  async (dispatch, getState) => {
    /** Returns true if the tutorial settings have been loaded into memory (via pullQueue). */
    const isTutorialSettingsLoaded = () => {
      const tutorialSettingId = findDescendant(getState(), EM_TOKEN, ['Settings', 'Tutorial'])
      const children = getAllChildrenAsThoughts(getState(), tutorialSettingId)
      return children.length > 0
    }

    // wait until tutorial settings are loaded before dispatching the tutorial update
    // otherwise /EM/Settings/Tutorial will not yet exist
    // https://github.com/cybersemics/em/pull/1117/
    const t = Date.now()

    const resolver = logarithmicDelayResolver()

    // eslint-disable-next-line fp/no-loops
    while (!isTutorialSettingsLoaded()) {
      if (Date.now() - t > 5000) {
        console.warn('Tutorial Settings took longer than 5 seconds to load. Giving up.')
        return
      }
      await new Promise(resolver)
    }

    dispatch({ type: 'tutorial', value })
  }

export default tutorial
